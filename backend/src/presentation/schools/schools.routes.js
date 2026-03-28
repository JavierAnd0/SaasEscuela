'use strict';

const router = require('express').Router();
const { auth }  = require('../middlewares/authMiddlewares');
const { roles } = require('../middlewares/roles.middleware');
const db        = require('../../infrastructure/database/knex/config');
const { z }     = require('zod');
const { validate } = require('../middlewares/validate.middleware');

const CreateSchoolSchema = z.object({
  name:         z.string().min(3).max(200),
  slug:         z.string().min(3).max(100).regex(/^[a-z0-9-]+$/, 'Solo letras, números y guiones'),
  nit:          z.string().max(20).optional(),
  daneCode:     z.string().max(12).optional(),
  city:         z.string().max(100).optional(),
  department:   z.string().max(100).optional(),
  phone:        z.string().max(20).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

/** GET /api/v1/schools — superadmin: lista todos los colegios con estadísticas */
router.get('/', ...auth, roles('superadmin'), async (req, res, next) => {
  try {
    const schools = await db('schools as s')
      .select(
        's.*',
        db.raw('(SELECT COUNT(*) FROM users    WHERE school_id = s.id AND is_active = true)::int  AS user_count'),
        db.raw('(SELECT COUNT(*) FROM students WHERE school_id = s.id AND is_active = true)::int AS student_count'),
      )
      .orderBy('s.name');
    res.json({ data: schools });
  } catch (err) { next(err); }
});

/** GET /api/v1/schools/:id — superadmin: detalle de un colegio */
router.get('/:id', ...auth, roles('superadmin'), async (req, res, next) => {
  try {
    const school = await db('schools as s')
      .where('s.id', req.params.id)
      .select(
        's.*',
        db.raw('(SELECT COUNT(*) FROM users    WHERE school_id = s.id AND is_active = true)::int  AS user_count'),
        db.raw('(SELECT COUNT(*) FROM students WHERE school_id = s.id AND is_active = true)::int AS student_count'),
        db.raw(`(SELECT json_agg(json_build_object('id', u.id, 'email', u.email, 'first_name', u.first_name, 'last_name', u.last_name))
                 FROM users u WHERE u.school_id = s.id AND u.role = 'school_admin' AND u.is_active = true) AS admins`),
      )
      .first();
    if (!school) return res.status(404).json({ error: 'Colegio no encontrado.' });
    res.json({ data: school });
  } catch (err) { next(err); }
});

/** PUT /api/v1/schools/:id/subscription — superadmin: actualiza estado de suscripción */
router.put('/:id/subscription', ...auth, roles('superadmin'), async (req, res, next) => {
  try {
    const VALID_STATUSES = ['trial', 'active', 'suspended', 'cancelled'];
    const { subscriptionStatus, subscriptionPlan, trialEndsAt } = req.body;

    if (subscriptionStatus && !VALID_STATUSES.includes(subscriptionStatus)) {
      return res.status(400).json({ error: `Estado inválido. Válidos: ${VALID_STATUSES.join(', ')}` });
    }

    const updates = {};
    if (subscriptionStatus !== undefined) updates.subscription_status = subscriptionStatus;
    if (subscriptionPlan    !== undefined) updates.subscription_plan   = subscriptionPlan;
    if (trialEndsAt         !== undefined) updates.trial_ends_at       = trialEndsAt || null;

    const [school] = await db('schools')
      .where({ id: req.params.id })
      .update(updates)
      .returning('*');
    if (!school) return res.status(404).json({ error: 'Colegio no encontrado.' });
    res.json({ data: school });
  } catch (err) { next(err); }
});

/** POST /api/v1/schools — superadmin: crea un nuevo tenant */
router.post('/', ...auth, roles('superadmin'), validate(CreateSchoolSchema), async (req, res, next) => {
  try {
    const [school] = await db('schools').insert({
      name:          req.body.name,
      slug:          req.body.slug,
      nit:           req.body.nit,
      dane_code:     req.body.daneCode,
      city:          req.body.city,
      department:    req.body.department,
      phone:         req.body.phone,
      primary_color: req.body.primaryColor || '#1E3A8A',
    }).returning('*');

    // Crea config SIEE por defecto para el colegio
    await db('school_siee_config').insert({ school_id: school.id });

    res.status(201).json({ data: school });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Slug o NIT ya existe.' });
    next(err);
  }
});

/** GET /api/v1/schools/me — colegio del usuario actual */
router.get('/me', ...auth, roles('school_admin', 'coordinator', 'teacher'), async (req, res, next) => {
  try {
    const school = await db('schools').where({ id: req.schoolId }).first();
    const siee   = await db('school_siee_config').where({ school_id: req.schoolId }).first();
    res.json({ data: { ...school, siee } });
  } catch (err) { next(err); }
});

/** PUT /api/v1/schools/me/profile — actualiza datos institucionales del colegio */
router.put('/me/profile', ...auth, roles('school_admin'), async (req, res, next) => {
  try {
    const allowed = ['name', 'nit', 'dane_code', 'city', 'department', 'phone', 'address', 'logo_url', 'primary_color'];
    const update  = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No hay campos válidos para actualizar.' });
    }
    const [school] = await db('schools')
      .where({ id: req.schoolId })
      .update(update)
      .returning('*');
    res.json({ data: school });
  } catch (err) { next(err); }
});

/** PUT /api/v1/schools/me/siee — configura escala SIEE del colegio */
router.put('/me/siee', ...auth, roles('school_admin'), async (req, res, next) => {
  try {
    const allowed = [
      'level_superior_name', 'level_superior_min',
      'level_alto_name', 'level_alto_min',
      'level_basico_name', 'level_basico_min',
      'level_bajo_name', 'level_bajo_min',
      'min_passing_grade',
    ];
    const update = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );
    const [siee] = await db('school_siee_config')
      .where({ school_id: req.schoolId })
      .update(update)
      .returning('*');
    res.json({ data: siee });
  } catch (err) { next(err); }
});

/** GET /api/v1/schools/me/smtp — configuración SMTP del colegio (sin exponer contraseña) */
router.get('/me/smtp', ...auth, roles('school_admin'), async (req, res, next) => {
  try {
    const row = await db('school_smtp_config')
      .where({ school_id: req.schoolId })
      .select('id', 'smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user',
              'smtp_from_name', 'smtp_from_email', 'is_active')
      .first();

    // Si no existe el registro, devolver valores por defecto vacíos
    res.json({ data: row || {
      smtp_host: '', smtp_port: 587, smtp_secure: false,
      smtp_user: '', smtp_from_name: '', smtp_from_email: '', is_active: false,
    }});
  } catch (err) { next(err); }
});

/** PUT /api/v1/schools/me/smtp — upsert configuración SMTP */
router.put('/me/smtp', ...auth, roles('school_admin'), async (req, res, next) => {
  try {
    const allowed = [
      'smtp_host', 'smtp_port', 'smtp_secure',
      'smtp_user', 'smtp_pass',
      'smtp_from_name', 'smtp_from_email',
      'is_active',
    ];
    const update = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No hay campos válidos para actualizar.' });
    }

    // Upsert: crear si no existe, actualizar si existe
    const existing = await db('school_smtp_config').where({ school_id: req.schoolId }).first();

    let row;
    if (existing) {
      // No sobreescribir smtp_pass si viene vacío (permite actualizar otros campos sin revelar pass)
      if (update.smtp_pass === '' || update.smtp_pass === undefined) delete update.smtp_pass;
      [row] = await db('school_smtp_config')
        .where({ school_id: req.schoolId })
        .update({ ...update, updated_at: db.fn.now() })
        .returning(['id', 'smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user',
                    'smtp_from_name', 'smtp_from_email', 'is_active']);
    } else {
      [row] = await db('school_smtp_config')
        .insert({ school_id: req.schoolId, ...update })
        .returning(['id', 'smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user',
                    'smtp_from_name', 'smtp_from_email', 'is_active']);
    }

    res.json({ data: row });
  } catch (err) { next(err); }
});

module.exports = router;
