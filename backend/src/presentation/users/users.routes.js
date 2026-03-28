'use strict';

const router  = require('express').Router();
const pLimit  = require('p-limit');
const { auth }  = require('../middlewares/authMiddlewares');
const { roles } = require('../middlewares/roles.middleware');
const { validate }            = require('../middlewares/validate.middleware');
const { FirebaseAuthAdapter } = require('../../infrastructure/firebase/FirebaseAuthAdapter');
const db                      = require('../../infrastructure/database/knex/config');
const { z }                   = require('zod');

const firebaseAuth = new FirebaseAuthAdapter();

const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || 'Colombia2026*';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const AssignmentSchema = z.object({
  classroomId: z.string().uuid(),
  subjectId:   z.string().uuid(),
});

const CreateUserSchema = z.object({
  firstName:      z.string().min(2).max(100),
  lastName:       z.string().min(2).max(100),
  documentNumber: z.string().min(5).max(20),
  email:          z.string().email(),
  role:           z.enum(['school_admin', 'coordinator', 'teacher']),
  phoneWhatsapp:  z.string().max(20).optional().nullable(),
  assignments:    z.array(AssignmentSchema).optional(),
});

const UpdateUserSchema = z.object({
  firstName:      z.string().min(2).max(100).optional(),
  lastName:       z.string().min(2).max(100).optional(),
  phoneWhatsapp:  z.string().max(20).optional().nullable(),
  role:           z.enum(['school_admin', 'coordinator', 'teacher']).optional(),
  assignments:    z.array(AssignmentSchema).optional(),
});

// ─── GET /api/v1/users ────────────────────────────────────────────────────────
/**
 * Lista todos los usuarios activos del colegio (excluyendo padres) con asignaciones.
 */
router.get('/', ...auth, roles('school_admin', 'coordinator'), async (req, res, next) => {
  try {
    const users = await db('users')
      .where({ school_id: req.schoolId })
      .whereNot({ role: 'parent' })
      .select('id', 'first_name', 'last_name', 'email', 'role', 'phone_whatsapp', 'document_number', 'is_active', 'created_at')
      .orderBy([{ column: 'role' }, { column: 'last_name' }]);

    const teacherIds = users.filter(u => u.role === 'teacher').map(u => u.id);
    let assignmentsMap = {};

    if (teacherIds.length > 0) {
      const assignments = await db('teacher_assignments as ta')
        .join('academic_years as ay', 'ay.id', 'ta.academic_year_id')
        .join('classrooms as c',      'c.id',  'ta.classroom_id')
        .join('subjects as s',        's.id',  'ta.subject_id')
        .whereIn('ta.teacher_id', teacherIds)
        .where({ 'ta.school_id': req.schoolId, 'ay.is_active': true })
        .select('ta.teacher_id', 'ta.classroom_id', 'ta.subject_id', 'c.name as classroom_name', 's.name as subject_name');

      for (const a of assignments) {
        if (!assignmentsMap[a.teacher_id]) assignmentsMap[a.teacher_id] = [];
        assignmentsMap[a.teacher_id].push(a);
      }
    }

    res.json({ data: users.map(u => ({ ...u, assignments: assignmentsMap[u.id] || [] })) });
  } catch (err) { next(err); }
});

// ─── GET /api/v1/users/parents ────────────────────────────────────────────────
/**
 * Lista los usuarios padre del colegio con sus hijos vinculados.
 * También retorna cuántos estudiantes están pendientes de vincular.
 */
router.get('/parents', ...auth, roles('school_admin', 'coordinator'), async (req, res, next) => {
  try {
    const [parents, pending] = await Promise.all([
      db('users as u')
        .where({ 'u.school_id': req.schoolId, 'u.role': 'parent' })
        .select('u.id', 'u.first_name', 'u.last_name', 'u.email', 'u.is_active', 'u.created_at')
        .orderBy(['u.last_name', 'u.first_name']),

      // Estudiantes con email + CC de acudiente pero sin cuenta de padre vinculada
      db('students as s')
        .where({ 's.school_id': req.schoolId, 's.is_active': true })
        .whereNotNull('s.parent_email')
        .whereNotNull('s.parent_document_number')
        .where('s.parent_email',          '!=', '')
        .where('s.parent_document_number','!=', '')
        .whereNotExists(
          db('student_parents as sp')
            .join('users as u', 'u.id', 'sp.parent_id')
            .whereRaw('sp.student_id = s.id')
            .where('u.role', 'parent')
        )
        .count('s.id as total')
        .first(),
    ]);

    const parentIds = parents.map(p => p.id);
    let childrenMap = {};

    if (parentIds.length > 0) {
      const links = await db('student_parents as sp')
        .join('students as s', 's.id', 'sp.student_id')
        .whereIn('sp.parent_id', parentIds)
        .select('sp.parent_id', 's.id as student_id', 's.first_name', 's.last_name', 's.document_number');

      for (const l of links) {
        if (!childrenMap[l.parent_id]) childrenMap[l.parent_id] = [];
        childrenMap[l.parent_id].push({ id: l.student_id, first_name: l.first_name, last_name: l.last_name, document_number: l.document_number });
      }
    }

    res.json({
      data:    parents.map(p => ({ ...p, children: childrenMap[p.id] || [] })),
      pending: parseInt(pending?.total ?? 0, 10),
    });
  } catch (err) { next(err); }
});

// ─── POST /api/v1/users/parents/bulk-create ───────────────────────────────────
/**
 * Crea cuentas de padres en lote a partir de los datos de acudiente en students.
 */
router.post('/parents/bulk-create', ...auth, roles('school_admin', 'coordinator'), async (req, res, next) => {
  try {
    const students = await db('students')
      .where({ school_id: req.schoolId, is_active: true })
      .whereNotNull('parent_email')
      .whereNotNull('parent_document_number')
      .where('parent_email',          '!=', '')
      .where('parent_document_number','!=', '')
      .select('id', 'first_name', 'last_name', 'parent_email', 'parent_name', 'parent_document_number');

    if (students.length === 0) {
      return res.json({
        data:    { created: 0, linked: 0, skipped: 0, errors: [], eligible: 0 },
        message: 'No hay estudiantes con email y CC de acudiente configurados. Completa esos campos primero.',
      });
    }

    const created = [];
    const linked  = [];
    const skipped = [];
    const errors  = [];

    const emailToParentId = {};

    const existingParents = await db('users')
      .where({ school_id: req.schoolId, role: 'parent' })
      .select('id', 'email');
    for (const p of existingParents) emailToParentId[p.email.toLowerCase()] = p.id;

    const limit = pLimit(5);

    const tasks = students.map(student => limit(async () => {
      const email    = student.parent_email.trim().toLowerCase();
      const password = student.parent_document_number.trim();
      const fullName = student.parent_name?.trim() || '';
      const nameParts = fullName.split(' ').filter(Boolean);
      const firstName = nameParts[0] || email.split('@')[0];
      const lastName  = nameParts.slice(1).join(' ') || '-';
      const studentLabel = `${student.first_name} ${student.last_name}`;

      if (password.length < 6) {
        errors.push({ email, student: studentLabel, reason: `CC del acudiente demasiado corto (mín. 6 dígitos): "${password}"` });
        return;
      }

      try {
        let parentDbId = emailToParentId[email] ?? null;

        if (parentDbId) {
          const existingLink = await db('student_parents')
            .where({ student_id: student.id, parent_id: parentDbId })
            .first();

          if (existingLink) {
            skipped.push({ email, student: studentLabel });
            return;
          }

          await db('student_parents').insert({ student_id: student.id, parent_id: parentDbId, relationship: 'acudiente' });
          linked.push({ email, student: studentLabel });
          return;
        }

        let firebaseUid;
        try {
          const fbUser = await firebaseAuth.createUser({ email, password, displayName: fullName || email });
          firebaseUid = fbUser.uid;
        } catch (fbErr) {
          if (fbErr.code === 'auth/email-already-exists') {
            try {
              const fbUser = await firebaseAuth.getUserByEmail(email);
              firebaseUid = fbUser.uid;
            } catch {
              errors.push({ email, student: studentLabel, reason: 'El email ya existe en Firebase pero no está en la base de datos. Requiere sincronización manual.' });
              return;
            }
          } else {
            errors.push({ email, student: studentLabel, reason: fbErr.message });
            return;
          }
        }

        await firebaseAuth.setUserRole(firebaseUid, req.schoolId, 'parent');

        const [newParent] = await db('users').insert({
          firebase_uid: firebaseUid,
          school_id:    req.schoolId,
          email,
          first_name:   firstName,
          last_name:    lastName,
          role:         'parent',
          is_active:    true,
        }).returning('id');

        parentDbId = newParent.id;
        emailToParentId[email] = parentDbId;

        await db('student_parents').insert({ student_id: student.id, parent_id: parentDbId, relationship: 'acudiente' });
        created.push({ email, student: studentLabel });
      } catch (err) {
        errors.push({ email: student.parent_email, student: studentLabel, reason: err.message });
      }
    }));

    await Promise.all(tasks);

    res.json({
      data: {
        eligible: students.length,
        created:  created.length,
        linked:   linked.length,
        skipped:  skipped.length,
        errors,
      },
    });
  } catch (err) { next(err); }
});

// ─── POST /api/v1/users/parents/:id/reset-password ───────────────────────────

router.post('/parents/:id/reset-password', ...auth, roles('school_admin', 'coordinator'), async (req, res, next) => {
  try {
    const parent = await db('users')
      .where({ id: req.params.id, school_id: req.schoolId, role: 'parent' })
      .select('firebase_uid', 'first_name', 'last_name', 'email')
      .first();
    if (!parent) return res.status(404).json({ error: 'Padre no encontrado.' });

    const studentData = await db('students as s')
      .join('student_parents as sp', 'sp.student_id', 's.id')
      .where({ 'sp.parent_id': req.params.id, 's.school_id': req.schoolId })
      .whereNotNull('s.parent_document_number')
      .where('s.parent_document_number', '!=', '')
      .select('s.parent_document_number')
      .first();

    const newPassword = studentData?.parent_document_number?.trim() || DEFAULT_PASSWORD;
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'El CC del acudiente es demasiado corto para usarse como contraseña (mín. 6 dígitos).' });
    }

    await firebaseAuth.updatePassword(parent.firebase_uid, newPassword);
    res.json({ message: `Contraseña de ${parent.first_name} ${parent.last_name} restablecida a su número de CC.` });
  } catch (err) { next(err); }
});

// ─── DELETE /api/v1/users/parents/:id ────────────────────────────────────────

router.delete('/parents/:id', ...auth, roles('school_admin'), async (req, res, next) => {
  try {
    const parent = await db('users')
      .where({ id: req.params.id, school_id: req.schoolId, role: 'parent' })
      .select('firebase_uid', 'first_name', 'last_name', 'is_active')
      .first();
    if (!parent) return res.status(404).json({ error: 'Padre no encontrado.' });

    const newState = !parent.is_active;
    await db('users').where({ id: req.params.id }).update({ is_active: newState });
    await firebaseAuth.setDisabled(parent.firebase_uid, !newState);

    res.json({
      message:   newState ? `${parent.first_name} ${parent.last_name} reactivado.` : `${parent.first_name} ${parent.last_name} desactivado.`,
      is_active: newState,
    });
  } catch (err) { next(err); }
});

// ─── GET /api/v1/users/:id ────────────────────────────────────────────────────

router.get('/:id', ...auth, roles('school_admin', 'coordinator'), async (req, res, next) => {
  try {
    const user = await db('users')
      .where({ id: req.params.id, school_id: req.schoolId })
      .select('id', 'first_name', 'last_name', 'email', 'role', 'phone_whatsapp', 'is_active')
      .first();

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const assignments = await db('teacher_assignments as ta')
      .join('academic_years as ay', 'ay.id', 'ta.academic_year_id')
      .join('classrooms as c',      'c.id',  'ta.classroom_id')
      .join('subjects as s',        's.id',  'ta.subject_id')
      .where({ 'ta.teacher_id': user.id, 'ta.school_id': req.schoolId, 'ay.is_active': true })
      .select('ta.classroom_id', 'ta.subject_id', 'c.name as classroom_name', 's.name as subject_name');

    res.json({ data: { ...user, assignments } });
  } catch (err) { next(err); }
});

// ─── POST /api/v1/users ───────────────────────────────────────────────────────
/**
 * Crea un usuario del colegio (docente / coordinador / admin).
 * Contraseña inicial: DEFAULT_USER_PASSWORD o 'Colombia2026*'.
 */
router.post('/', ...auth, roles('school_admin', 'coordinator'), validate(CreateUserSchema), async (req, res, next) => {
  const { firstName, lastName, documentNumber, email, role, phoneWhatsapp, assignments = [] } = req.body;
  let firebaseUid = null;

  try {
    const { uid } = await firebaseAuth.createUser({ email, password: DEFAULT_PASSWORD, displayName: `${firstName} ${lastName}` });
    firebaseUid = uid;

    await firebaseAuth.setUserRole(uid, req.schoolId, role);

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

    if (role === 'teacher' && assignments.length > 0) {
      await _replaceAssignments(newUser.id, assignments, req.schoolId);
    }

    res.status(201).json({
      data:            { ...newUser, assignments },
      defaultPassword: DEFAULT_PASSWORD,
      message:         `Usuario creado. Contraseña temporal: ${DEFAULT_PASSWORD}`,
    });
  } catch (err) {
    if (firebaseUid) { try { await firebaseAuth.deleteUser(firebaseUid); } catch (_) {} }
    if (err.code === 'auth/email-already-exists') return res.status(409).json({ error: 'Ya existe un usuario con ese email en Firebase.' });
    if (err.code === '23505')                     return res.status(409).json({ error: 'Ya existe un usuario con ese email en la base de datos.' });
    next(err);
  }
});

// ─── PUT /api/v1/users/:id ────────────────────────────────────────────────────

router.put('/:id', ...auth, roles('school_admin', 'coordinator'), validate(UpdateUserSchema), async (req, res, next) => {
  const { firstName, lastName, phoneWhatsapp, role, assignments } = req.body;

  try {
    const user = await db('users').where({ id: req.params.id, school_id: req.schoolId }).first();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const updates = {};
    if (firstName)                      updates.first_name     = firstName;
    if (lastName)                       updates.last_name      = lastName;
    if (phoneWhatsapp !== undefined)    updates.phone_whatsapp = phoneWhatsapp;
    if (role && role !== user.role) {
      updates.role = role;
      await firebaseAuth.setUserRole(user.firebase_uid, req.schoolId, role);
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = db.fn.now();
      await db('users').where({ id: user.id }).update(updates);
    }

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

// ─── POST /api/v1/users/:id/reset-password ────────────────────────────────────

router.post('/:id/reset-password', ...auth, roles('school_admin', 'coordinator'), async (req, res, next) => {
  try {
    const user = await db('users')
      .where({ id: req.params.id, school_id: req.schoolId })
      .select('firebase_uid', 'first_name', 'last_name')
      .first();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

    await firebaseAuth.updatePassword(user.firebase_uid, DEFAULT_PASSWORD);
    res.json({ message: `Contraseña de ${user.first_name} ${user.last_name} restablecida.`, defaultPassword: DEFAULT_PASSWORD });
  } catch (err) { next(err); }
});

// ─── DELETE /api/v1/users/:id  (soft delete + Firebase disable) ───────────────

router.delete('/:id', ...auth, roles('school_admin'), async (req, res, next) => {
  try {
    const user = await db('users')
      .where({ id: req.params.id, school_id: req.schoolId })
      .select('firebase_uid', 'first_name', 'last_name', 'is_active')
      .first();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    if (req.user.dbId === req.params.id) return res.status(400).json({ error: 'No puede desactivar su propia cuenta.' });

    const newState = !user.is_active;
    await db('users').where({ id: req.params.id }).update({ is_active: newState });
    await firebaseAuth.setDisabled(user.firebase_uid, !newState);

    res.json({
      message:   newState ? `${user.first_name} ${user.last_name} reactivado.` : `${user.first_name} ${user.last_name} desactivado.`,
      is_active: newState,
    });
  } catch (err) { next(err); }
});

// ─── Helper ───────────────────────────────────────────────────────────────────

async function _replaceAssignments(teacherId, assignments, schoolId) {
  const activeYear = await db('academic_years')
    .where({ school_id: schoolId, is_active: true })
    .select('id')
    .first();
  if (!activeYear) return;

  await db('teacher_assignments')
    .where({ teacher_id: teacherId, school_id: schoolId, academic_year_id: activeYear.id })
    .delete();

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
