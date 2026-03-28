'use strict';

const router = require('express').Router();
const { auth }  = require('../middlewares/authMiddlewares');
const { roles } = require('../middlewares/roles.middleware');
const { validate }            = require('../middlewares/validate.middleware');
const { FirebaseAuthAdapter } = require('../../infrastructure/firebase/FirebaseAuthAdapter');
const db                      = require('../../infrastructure/database/knex/config');
const { z }                   = require('zod');

const firebaseAuth = new FirebaseAuthAdapter();

const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || 'Colombia2026*';

// ─── Schemas ────────────────────────────────────────────────────────────────

const AssignmentSchema = z.object({
  classroomId: z.string().uuid(),
  subjectId:   z.string().uuid(),
});

const CreateUserSchema = z.object({
  firstName:      z.string().min(2).max(100),
  lastName:       z.string().min(2).max(100),
  documentNumber: z.string().min(5).max(20),          // CC del docente
  email:          z.string().email(),
  role:           z.enum(['school_admin', 'coordinator', 'teacher']),
  phoneWhatsapp:  z.string().max(20).optional().nullable(),
  assignments:    z.array(AssignmentSchema).optional(), // solo para teachers
});

const UpdateUserSchema = z.object({
  firstName:      z.string().min(2).max(100).optional(),
  lastName:       z.string().min(2).max(100).optional(),
  phoneWhatsapp:  z.string().max(20).optional().nullable(),
  role:           z.enum(['school_admin', 'coordinator', 'teacher']).optional(),
  assignments:    z.array(AssignmentSchema).optional(),
});

// ─── Rutas ──────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/users
 * Lista todos los usuarios activos del colegio con sus asignaciones.
 */
router.get('/', ...auth, roles('school_admin', 'coordinator'), async (req, res, next) => {
  try {
    const users = await db('users')
      .where({ school_id: req.schoolId })
      .select('id', 'first_name', 'last_name', 'email', 'role', 'phone_whatsapp', 'document_number', 'is_active', 'created_at')
      .orderBy([{ column: 'role' }, { column: 'last_name' }]);

    // Para cada docente, cargar sus asignaciones
    const teacherIds = users.filter(u => u.role === 'teacher').map(u => u.id);

    let assignmentsMap = {};
    if (teacherIds.length > 0) {
      const assignments = await db('teacher_assignments as ta')
        .join('academic_years as ay', 'ay.id', 'ta.academic_year_id')
        .join('classrooms as c', 'c.id', 'ta.classroom_id')
        .join('subjects as s', 's.id', 'ta.subject_id')
        .whereIn('ta.teacher_id', teacherIds)
        .where({ 'ta.school_id': req.schoolId, 'ay.is_active': true })
        .select(
          'ta.teacher_id', 'ta.classroom_id', 'ta.subject_id',
          'c.name as classroom_name', 's.name as subject_name'
        );

      for (const a of assignments) {
        if (!assignmentsMap[a.teacher_id]) assignmentsMap[a.teacher_id] = [];
        assignmentsMap[a.teacher_id].push(a);
      }
    }

    const result = users.map(u => ({
      ...u,
      assignments: assignmentsMap[u.id] || [],
    }));

    res.json({ data: result });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/users/:id
 * Perfil completo de un usuario con asignaciones.
 */
router.get('/:id', ...auth, roles('school_admin', 'coordinator'), async (req, res, next) => {
  try {
    const user = await db('users')
      .where({ id: req.params.id, school_id: req.schoolId })
      .select('id', 'first_name', 'last_name', 'email', 'role', 'phone_whatsapp', 'is_active')
      .first();

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const assignments = await db('teacher_assignments as ta')
      .join('academic_years as ay', 'ay.id', 'ta.academic_year_id')
      .join('classrooms as c', 'c.id', 'ta.classroom_id')
      .join('subjects as s', 's.id', 'ta.subject_id')
      .where({ 'ta.teacher_id': user.id, 'ta.school_id': req.schoolId, 'ay.is_active': true })
      .select('ta.classroom_id', 'ta.subject_id', 'c.name as classroom_name', 's.name as subject_name');

    res.json({ data: { ...user, assignments } });
  } catch (err) { next(err); }
});

/**
 * POST /api/v1/users
 * Crea un nuevo usuario (Firebase + PostgreSQL + asignaciones).
 * Contraseña por defecto: DEFAULT_USER_PASSWORD o 'Colombia2026*'
 */
router.post('/', ...auth, roles('school_admin', 'coordinator'), validate(CreateUserSchema), async (req, res, next) => {
  const { firstName, lastName, documentNumber, email, role, phoneWhatsapp, assignments = [] } = req.body;

  let firebaseUid = null;

  try {
    // 1. Crear en Firebase con contraseña por defecto
    const { uid } = await firebaseAuth.createUser({
      email,
      password:    DEFAULT_PASSWORD,
      displayName: `${firstName} ${lastName}`,
    });
    firebaseUid = uid;

    // 2. Asignar rol y colegio en claims de Firebase
    await firebaseAuth.setUserRole(uid, req.schoolId, role);

    // 3. Insertar en PostgreSQL
    const [newUser] = await db('users').insert({
      firebase_uid:    uid,
      school_id:       req.schoolId,
      email,
      first_name:      firstName,
      last_name:       lastName,
      role,
      phone_whatsapp:  phoneWhatsapp || null,
      document_number: documentNumber,
    }).returning('id', 'first_name', 'last_name', 'email', 'role', 'is_active');

    // 4. Crear asignaciones para docentes
    if (role === 'teacher' && assignments.length > 0) {
      await _replaceAssignments(newUser.id, assignments, req.schoolId);
    }

    res.status(201).json({
      data: { ...newUser, assignments },
      defaultPassword: DEFAULT_PASSWORD,
      message: `Usuario creado. Contraseña por defecto: ${DEFAULT_PASSWORD}`,
    });
  } catch (err) {
    // Rollback: si falla la DB, eliminar el usuario de Firebase
    if (firebaseUid) {
      try { await firebaseAuth.deleteUser(firebaseUid); } catch (_) {}
    }
    if (err.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email en Firebase.' });
    }
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email en la base de datos.' });
    }
    next(err);
  }
});

/**
 * PUT /api/v1/users/:id
 * Actualiza perfil y asignaciones de un usuario.
 */
router.put('/:id', ...auth, roles('school_admin', 'coordinator'), validate(UpdateUserSchema), async (req, res, next) => {
  const { firstName, lastName, phoneWhatsapp, role, assignments } = req.body;

  try {
    const user = await db('users')
      .where({ id: req.params.id, school_id: req.schoolId })
      .first();

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const updates = {};
    if (firstName)     updates.first_name      = firstName;
    if (lastName)      updates.last_name       = lastName;
    if (phoneWhatsapp !== undefined) updates.phone_whatsapp = phoneWhatsapp;
    if (role && role !== user.role) {
      updates.role = role;
      // Actualizar claims en Firebase también
      await firebaseAuth.setUserRole(user.firebase_uid, req.schoolId, role);
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = db.fn.now();
      await db('users').where({ id: user.id }).update(updates);
    }

    // Reemplazar asignaciones si se envían
    if (assignments !== undefined) {
      await _replaceAssignments(user.id, assignments, req.schoolId);
    }

    const updated = await db('users')
      .where({ id: user.id })
      .select('id', 'first_name', 'last_name', 'email', 'role', 'phone_whatsapp', 'is_active')
      .first();

    res.json({ data: updated });
  } catch (err) { next(err); }
});

/**
 * POST /api/v1/users/:id/reset-password
 * Restablece la contraseña al valor por defecto.
 */
router.post('/:id/reset-password', ...auth, roles('school_admin', 'coordinator'), async (req, res, next) => {
  try {
    const user = await db('users')
      .where({ id: req.params.id, school_id: req.schoolId })
      .select('firebase_uid', 'first_name', 'last_name')
      .first();

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

    await firebaseAuth.updatePassword(user.firebase_uid, DEFAULT_PASSWORD);

    res.json({
      message: `Contraseña de ${user.first_name} ${user.last_name} restablecida.`,
      defaultPassword: DEFAULT_PASSWORD,
    });
  } catch (err) { next(err); }
});

/**
 * DELETE /api/v1/users/:id
 * Desactiva un usuario (soft delete: is_active = false + deshabilita en Firebase).
 */
router.delete('/:id', ...auth, roles('school_admin'), async (req, res, next) => {
  try {
    const user = await db('users')
      .where({ id: req.params.id, school_id: req.schoolId })
      .select('firebase_uid', 'first_name', 'last_name', 'is_active')
      .first();

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

    // No puede desactivarse a sí mismo
    if (req.user.dbId === req.params.id) {
      return res.status(400).json({ error: 'No puede desactivar su propia cuenta.' });
    }

    const newState = !user.is_active; // toggle activo/inactivo
    await db('users').where({ id: req.params.id }).update({ is_active: newState });
    await firebaseAuth.setDisabled(user.firebase_uid, !newState);

    res.json({
      message: newState
        ? `${user.first_name} ${user.last_name} reactivado.`
        : `${user.first_name} ${user.last_name} desactivado.`,
      is_active: newState,
    });
  } catch (err) { next(err); }
});

// ─── Helper ─────────────────────────────────────────────────────────────────

async function _replaceAssignments(teacherId, assignments, schoolId) {
  // Obtener año académico activo
  const activeYear = await db('academic_years')
    .where({ school_id: schoolId, is_active: true })
    .select('id')
    .first();

  if (!activeYear) return;

  // Eliminar asignaciones actuales del año activo
  await db('teacher_assignments')
    .where({ teacher_id: teacherId, school_id: schoolId, academic_year_id: activeYear.id })
    .delete();

  // Insertar las nuevas
  if (assignments.length > 0) {
    const rows = assignments.map(a => ({
      teacher_id:       teacherId,
      classroom_id:     a.classroomId,
      subject_id:       a.subjectId,
      school_id:        schoolId,
      academic_year_id: activeYear.id,
    }));
    await db('teacher_assignments').insert(rows);
  }
}

module.exports = router;
