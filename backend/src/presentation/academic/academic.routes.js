'use strict';

const router = require('express').Router();
const { firebaseAuthMiddleware } = require('../middlewares/firebaseAuth.middleware');
const { tenantMiddleware }       = require('../middlewares/tenant.middleware');
const { roles }                  = require('../middlewares/roles.middleware');
const { validate }               = require('../middlewares/validate.middleware');
const { z }                      = require('zod');
const db                         = require('../../infrastructure/database/knex/config');

const auth      = [firebaseAuthMiddleware, tenantMiddleware];
const coordAuth = [...auth, roles('coordinator', 'school_admin')];

// ─── Schemas de validación ────────────────────────────────────────────────────

const GradeLevelSchema = z.object({
  name:      z.string().min(1).max(50),
  sortOrder: z.number().int().min(0).optional(),
});

const VALID_SHIFTS = ['mañana', 'tarde', 'noche', 'única', 'sabatina'];

const ClassroomSchema = z.object({
  name:            z.string().min(1).max(50),
  gradeLevelId:    z.string().uuid(),
  shift:           z.enum(['mañana', 'tarde', 'noche', 'única', 'sabatina']).default('única'),
  directorTeacherId: z.string().uuid().optional().nullable(),
});

const SubjectSchema = z.object({
  name: z.string().min(1).max(100),
  area: z.string().max(100).optional(),
  code: z.string().max(20).optional(),
});

// ─── Lectura (docentes + coordinadores) ──────────────────────────────────────

/**
 * GET /api/v1/classrooms
 * - Docente: solo sus grupos asignados en el año activo.
 * - Coordinador/Admin: todos los grupos, filtrable por shift y grade_level.
 */
router.get('/classrooms', ...auth, roles('teacher', 'coordinator', 'school_admin'), async (req, res, next) => {
  try {
    const { shift, gradeLevelId } = req.query;

    let query = db('classrooms as c')
      .join('academic_years as ay', 'ay.id', 'c.academic_year_id')
      .join('grade_levels as gl',   'gl.id', 'c.grade_level_id')
      .where({ 'c.school_id': req.schoolId, 'ay.is_active': true })
      .select(
        'c.id', 'c.name', 'c.shift',
        'gl.id as grade_level_id', 'gl.name as grade_level_name',
        'c.academic_year_id', 'c.director_teacher_id'
      )
      .orderBy(['gl.sort_order', 'c.shift', 'c.name']);

    if (shift)        query = query.where('c.shift', shift);
    if (gradeLevelId) query = query.where('c.grade_level_id', gradeLevelId);

    if (req.user.role === 'teacher' && req.user.dbId) {
      const assignedIds = await db('teacher_assignments')
        .where({ teacher_id: req.user.dbId, school_id: req.schoolId })
        .distinct('classroom_id').pluck('classroom_id');
      query = query.whereIn('c.id', assignedIds);
    }

    res.json({ data: await query });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/periods
 */
router.get('/periods', ...auth, roles('teacher', 'coordinator', 'school_admin'), async (req, res, next) => {
  try {
    const periods = await db('periods as p')
      .join('academic_years as ay', 'ay.id', 'p.academic_year_id')
      .where({ 'p.school_id': req.schoolId, 'ay.is_active': true })
      .select('p.id', 'p.name', 'p.period_number', 'p.start_date', 'p.end_date', 'p.weight_percent', 'p.is_closed')
      .orderBy('p.period_number');
    res.json({ data: periods });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/subjects
 */
router.get('/subjects', ...auth, roles('teacher', 'coordinator', 'school_admin'), async (req, res, next) => {
  try {
    const subjects = await db('subjects')
      .where({ school_id: req.schoolId })
      .select('id', 'name', 'area', 'code')
      .orderBy(['area', 'name']);
    res.json({ data: subjects });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/grade-levels
 */
router.get('/grade-levels', ...auth, roles('teacher', 'coordinator', 'school_admin'), async (req, res, next) => {
  try {
    const levels = await db('grade_levels')
      .where({ school_id: req.schoolId })
      .select('id', 'name', 'sort_order')
      .orderBy('sort_order');
    res.json({ data: levels });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/shifts — lista las jornadas únicas que ya existen en el colegio
 * (además de las válidas del sistema)
 */
router.get('/shifts', ...auth, roles('coordinator', 'school_admin'), async (req, res, next) => {
  try {
    const used = await db('classrooms as c')
      .join('academic_years as ay', 'ay.id', 'c.academic_year_id')
      .where({ 'c.school_id': req.schoolId, 'ay.is_active': true })
      .distinct('c.shift')
      .pluck('shift');

    // Devuelve todas las opciones válidas marcando cuáles ya tienen grupos
    const shifts = VALID_SHIFTS.map(s => ({ value: s, hasClassrooms: used.includes(s) }));
    res.json({ data: shifts });
  } catch (err) { next(err); }
});

// ─── Gestión de grados (solo coordinador/admin) ───────────────────────────────

/**
 * POST /api/v1/grade-levels
 */
router.post('/grade-levels', ...coordAuth, validate(GradeLevelSchema), async (req, res, next) => {
  try {
    const [level] = await db('grade_levels')
      .insert({ school_id: req.schoolId, name: req.body.name, sort_order: req.body.sortOrder ?? 0 })
      .returning('*');
    res.status(201).json({ data: level });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un grado con ese nombre.' });
    next(err);
  }
});

/**
 * PUT /api/v1/grade-levels/:id
 */
router.put('/grade-levels/:id', ...coordAuth, validate(GradeLevelSchema), async (req, res, next) => {
  try {
    const [level] = await db('grade_levels')
      .where({ id: req.params.id, school_id: req.schoolId })
      .update({ name: req.body.name, sort_order: req.body.sortOrder ?? 0 })
      .returning('*');
    if (!level) return res.status(404).json({ error: 'Grado no encontrado.' });
    res.json({ data: level });
  } catch (err) { next(err); }
});

/**
 * DELETE /api/v1/grade-levels/:id
 */
router.delete('/grade-levels/:id', ...coordAuth, async (req, res, next) => {
  try {
    const count = await db('grade_levels')
      .where({ id: req.params.id, school_id: req.schoolId })
      .delete();
    if (!count) return res.status(404).json({ error: 'Grado no encontrado.' });
    res.status(204).end();
  } catch (err) {
    if (err.code === '23503') return res.status(409).json({ error: 'El grado tiene grupos asociados. Elimínelos primero.' });
    next(err);
  }
});

// ─── Gestión de grupos (classrooms) ──────────────────────────────────────────

/**
 * POST /api/v1/classrooms
 */
router.post('/classrooms', ...coordAuth, validate(ClassroomSchema), async (req, res, next) => {
  try {
    const activeYear = await db('academic_years')
      .where({ school_id: req.schoolId, is_active: true }).first();
    if (!activeYear) return res.status(400).json({ error: 'No hay año académico activo.' });

    const [classroom] = await db('classrooms')
      .insert({
        school_id:          req.schoolId,
        grade_level_id:     req.body.gradeLevelId,
        academic_year_id:   activeYear.id,
        shift:              req.body.shift,
        name:               req.body.name,
        director_teacher_id: req.body.directorTeacherId ?? null,
      })
      .returning('*');

    // Enriquecer con nombre del grado
    const level = await db('grade_levels').where('id', classroom.grade_level_id).first();
    res.status(201).json({ data: { ...classroom, grade_level_name: level?.name } });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un grupo con ese nombre en este grado y jornada.' });
    next(err);
  }
});

/**
 * PUT /api/v1/classrooms/:id
 */
router.put('/classrooms/:id', ...coordAuth, validate(ClassroomSchema), async (req, res, next) => {
  try {
    const [classroom] = await db('classrooms')
      .where({ id: req.params.id, school_id: req.schoolId })
      .update({
        grade_level_id:      req.body.gradeLevelId,
        shift:               req.body.shift,
        name:                req.body.name,
        director_teacher_id: req.body.directorTeacherId ?? null,
      })
      .returning('*');
    if (!classroom) return res.status(404).json({ error: 'Grupo no encontrado.' });
    res.json({ data: classroom });
  } catch (err) { next(err); }
});

/**
 * DELETE /api/v1/classrooms/:id
 */
router.delete('/classrooms/:id', ...coordAuth, async (req, res, next) => {
  try {
    const count = await db('classrooms')
      .where({ id: req.params.id, school_id: req.schoolId }).delete();
    if (!count) return res.status(404).json({ error: 'Grupo no encontrado.' });
    res.status(204).end();
  } catch (err) {
    if (err.code === '23503') return res.status(409).json({ error: 'El grupo tiene datos asociados (notas, asistencias). No se puede eliminar.' });
    next(err);
  }
});

// ─── Gestión de materias ──────────────────────────────────────────────────────

/**
 * POST /api/v1/subjects
 */
router.post('/subjects', ...coordAuth, validate(SubjectSchema), async (req, res, next) => {
  try {
    const [subject] = await db('subjects')
      .insert({ school_id: req.schoolId, name: req.body.name, area: req.body.area, code: req.body.code })
      .returning('*');
    res.status(201).json({ data: subject });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe una materia con ese nombre.' });
    next(err);
  }
});

/**
 * PUT /api/v1/subjects/:id
 */
router.put('/subjects/:id', ...coordAuth, validate(SubjectSchema), async (req, res, next) => {
  try {
    const [subject] = await db('subjects')
      .where({ id: req.params.id, school_id: req.schoolId })
      .update({ name: req.body.name, area: req.body.area, code: req.body.code })
      .returning('*');
    if (!subject) return res.status(404).json({ error: 'Materia no encontrada.' });
    res.json({ data: subject });
  } catch (err) { next(err); }
});

/**
 * DELETE /api/v1/subjects/:id
 */
router.delete('/subjects/:id', ...coordAuth, async (req, res, next) => {
  try {
    const count = await db('subjects')
      .where({ id: req.params.id, school_id: req.schoolId }).delete();
    if (!count) return res.status(404).json({ error: 'Materia no encontrada.' });
    res.status(204).end();
  } catch (err) {
    if (err.code === '23503') return res.status(409).json({ error: 'La materia tiene notas registradas. No se puede eliminar.' });
    next(err);
  }
});

module.exports = router;
