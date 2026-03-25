'use strict';

const router = require('express').Router();
const { firebaseAuthMiddleware } = require('../middlewares/firebaseAuth.middleware');
const { tenantMiddleware }       = require('../middlewares/tenant.middleware');
const { roles }                  = require('../middlewares/roles.middleware');
const db                         = require('../../infrastructure/database/knex/config');
const { z }                      = require('zod');
const { validate }               = require('../middlewares/validate.middleware');

const auth = [firebaseAuthMiddleware, tenantMiddleware];

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

/** GET /api/v1/schools — superadmin: lista todos los colegios */
router.get('/', ...auth, roles('superadmin'), async (req, res, next) => {
  try {
    const schools = await db('schools').select('*').orderBy('name');
    res.json({ data: schools });
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

module.exports = router;
