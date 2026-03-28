'use strict';

const router = require('express').Router();
const { auth }  = require('../middlewares/authMiddlewares');
const { roles } = require('../middlewares/roles.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { z }     = require('zod');
const db        = require('../../infrastructure/database/knex/config');

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
 * GET /api/v1/academic-years
 */
router.get('/academic-years', ...auth, roles('teacher', 'coordinator', 'school_admin'), async (req, res, next) => {
  try {
    const years = await db('academic_years')
      .where({ school_id: req.schoolId })
      .select('id', 'name', 'start_date', 'end_date', 'is_active')
      .orderBy('name', 'desc');
    res.json({ data: years });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/periods?yearId=  (si no se pasa yearId, usa el año activo)
 */
router.get('/periods', ...auth, roles('teacher', 'coordinator', 'school_admin'), async (req, res, next) => {
  try {
    const { yearId, current } = req.query;

    let query = db('periods as p')
      .join('academic_years as ay', 'ay.id', 'p.academic_year_id')
      .where('p.school_id', req.schoolId)
      .select('p.id', 'p.name', 'p.period_number', 'p.start_date', 'p.end_date',
              'p.grades_open_from', 'p.grades_open_until',
              'p.weight_percent', 'p.is_closed', 'p.closed_at', 'p.academic_year_id')
      .orderBy('p.period_number');

    if (yearId) {
      query = query.where('p.academic_year_id', yearId);
    } else {
      query = query.where('ay.is_active', true);
    }

    // ?current=true → solo el período cuya ventana de fechas cubre hoy y no está cerrado.
    // Si un período no tiene fechas configuradas se excluye (el coordinador debe configurarlas).
    if (current === 'true' || current === '1') {
      const today = new Date().toISOString().slice(0, 10);
      query = query
        .where('p.is_closed', false)
        .whereRaw('(p.start_date IS NULL OR p.start_date <= ?)', [today])
        .whereRaw('(p.end_date IS NULL OR p.end_date >= ?)', [today]);
    }

    res.json({ data: await query });
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

// ─── Gestión de Años Académicos ───────────────────────────────────────────────

const AcademicYearSchema = z.object({
  name:      z.string().min(4).max(10),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  endDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
});

/**
 * POST /api/v1/academic-years
 */
router.post('/academic-years', ...coordAuth, validate(AcademicYearSchema), async (req, res, next) => {
  try {
    const [year] = await db('academic_years')
      .insert({
        school_id:  req.schoolId,
        name:       req.body.name,
        start_date: req.body.startDate,
        end_date:   req.body.endDate,
        is_active:  false,
      })
      .returning('*');
    res.status(201).json({ data: year });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un año con ese nombre.' });
    next(err);
  }
});

/**
 * PUT /api/v1/academic-years/:id/activate — activa un año (desactiva todos los demás)
 */
router.put('/academic-years/:id/activate', ...coordAuth, async (req, res, next) => {
  try {
    const year = await db('academic_years')
      .where({ id: req.params.id, school_id: req.schoolId }).first();
    if (!year) return res.status(404).json({ error: 'Año académico no encontrado.' });

    await db.transaction(async (trx) => {
      await trx('academic_years').where({ school_id: req.schoolId }).update({ is_active: false });
      await trx('academic_years').where({ id: req.params.id }).update({ is_active: true });
    });

    const updated = await db('academic_years').where({ id: req.params.id }).first();
    res.json({ data: updated });
  } catch (err) { next(err); }
});

// ─── Gestión de Periodos ──────────────────────────────────────────────────────

const dateOpt = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD').optional().nullable();

const PeriodSchema = z.object({
  name:            z.string().min(1).max(50),
  periodNumber:    z.number().int().min(1).max(8),
  startDate:       dateOpt,
  endDate:         dateOpt,
  gradesOpenFrom:  dateOpt,
  gradesOpenUntil: dateOpt,
  weightPercent:   z.number().min(0).max(100),
  academicYearId:  z.string().uuid(),
}).refine(
  d => !d.startDate || !d.endDate || d.startDate <= d.endDate,
  { message: 'La fecha de fin debe ser posterior al inicio del período.', path: ['endDate'] }
).refine(
  d => !d.gradesOpenFrom || !d.gradesOpenUntil || d.gradesOpenFrom <= d.gradesOpenUntil,
  { message: 'El cierre de notas debe ser posterior a la apertura.', path: ['gradesOpenUntil'] }
).refine(
  d => !d.startDate || !d.gradesOpenFrom || d.gradesOpenFrom >= d.startDate,
  { message: 'La apertura de notas no puede ser antes del inicio del período.', path: ['gradesOpenFrom'] }
);

/**
 * POST /api/v1/periods
 */
router.post('/periods', ...coordAuth, validate(PeriodSchema), async (req, res, next) => {
  try {
    const year = await db('academic_years')
      .where({ id: req.body.academicYearId, school_id: req.schoolId }).first();
    if (!year) return res.status(404).json({ error: 'Año académico no encontrado.' });

    const [period] = await db('periods')
      .insert({
        school_id:         req.schoolId,
        academic_year_id:  req.body.academicYearId,
        period_number:     req.body.periodNumber,
        name:              req.body.name,
        start_date:        req.body.startDate       || null,
        end_date:          req.body.endDate         || null,
        grades_open_from:  req.body.gradesOpenFrom  || null,
        grades_open_until: req.body.gradesOpenUntil || null,
        weight_percent:    req.body.weightPercent,
        is_closed:         false,
      })
      .returning('*');
    res.status(201).json({ data: period });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un periodo con ese número en este año.' });
    next(err);
  }
});

const PeriodUpdateSchema = z.object({
  name:            z.string().min(1).max(50).optional(),
  periodNumber:    z.number().int().min(1).max(8).optional(),
  startDate:       dateOpt,
  endDate:         dateOpt,
  gradesOpenFrom:  dateOpt,
  gradesOpenUntil: dateOpt,
  weightPercent:   z.number().min(0).max(100).optional(),
}).refine(
  d => !d.startDate || !d.endDate || d.startDate <= d.endDate,
  { message: 'La fecha de fin debe ser posterior al inicio del período.', path: ['endDate'] }
).refine(
  d => !d.gradesOpenFrom || !d.gradesOpenUntil || d.gradesOpenFrom <= d.gradesOpenUntil,
  { message: 'El cierre de notas debe ser posterior a la apertura.', path: ['gradesOpenUntil'] }
);

/**
 * PUT /api/v1/periods/:id
 */
router.put('/periods/:id', ...coordAuth, validate(PeriodUpdateSchema), async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.name            !== undefined) updates.name              = req.body.name;
    if (req.body.periodNumber    !== undefined) updates.period_number     = req.body.periodNumber;
    if (req.body.startDate       !== undefined) updates.start_date        = req.body.startDate       || null;
    if (req.body.endDate         !== undefined) updates.end_date          = req.body.endDate         || null;
    if (req.body.gradesOpenFrom  !== undefined) updates.grades_open_from  = req.body.gradesOpenFrom  || null;
    if (req.body.gradesOpenUntil !== undefined) updates.grades_open_until = req.body.gradesOpenUntil || null;
    if (req.body.weightPercent   !== undefined) updates.weight_percent    = req.body.weightPercent;

    const [period] = await db('periods')
      .where({ id: req.params.id, school_id: req.schoolId })
      .update(updates)
      .returning('*');
    if (!period) return res.status(404).json({ error: 'Periodo no encontrado.' });
    res.json({ data: period });
  } catch (err) { next(err); }
});

/**
 * DELETE /api/v1/periods/:id
 */
router.delete('/periods/:id', ...coordAuth, async (req, res, next) => {
  try {
    const count = await db('periods')
      .where({ id: req.params.id, school_id: req.schoolId }).delete();
    if (!count) return res.status(404).json({ error: 'Periodo no encontrado.' });
    res.status(204).end();
  } catch (err) {
    if (err.code === '23503') return res.status(409).json({ error: 'El periodo tiene notas o asistencias registradas.' });
    next(err);
  }
});

/**
 * POST /api/v1/periods/:id/close — alterna el estado abierto/cerrado del periodo
 */
router.post('/periods/:id/close', ...coordAuth, async (req, res, next) => {
  try {
    const period = await db('periods')
      .where({ id: req.params.id, school_id: req.schoolId }).first();
    if (!period) return res.status(404).json({ error: 'Periodo no encontrado.' });

    const [updated] = await db('periods')
      .where({ id: req.params.id })
      .update({ is_closed: !period.is_closed, closed_at: !period.is_closed ? new Date() : null })
      .returning('*');
    res.json({ data: updated });
  } catch (err) { next(err); }
});

module.exports = router;
