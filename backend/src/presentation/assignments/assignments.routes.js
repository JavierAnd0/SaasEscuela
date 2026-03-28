'use strict';

const router = require('express').Router();
const { auth }  = require('../middlewares/authMiddlewares');
const { roles } = require('../middlewares/roles.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { z }     = require('zod');
const db        = require('../../infrastructure/database/knex/config');

const coordAuth = [...auth, roles('coordinator', 'school_admin')];

const AssignmentSchema = z.object({
  teacherId:   z.string().uuid(),
  classroomId: z.string().uuid(),
  subjectId:   z.string().uuid(),
});

/**
 * GET /api/v1/assignments
 * Lista todas las asignaciones del año activo, con nombres de docente, grupo y materia.
 * Filtrable por ?classroomId= o ?teacherId=
 */
router.get('/', ...coordAuth, async (req, res, next) => {
  try {
    const { classroomId, teacherId } = req.query;

    let query = db('teacher_assignments as ta')
      .join('users as u',          'u.id',   'ta.teacher_id')
      .join('classrooms as c',     'c.id',   'ta.classroom_id')
      .join('subjects as s',       's.id',   'ta.subject_id')
      .join('academic_years as ay','ay.id',  'ta.academic_year_id')
      .join('grade_levels as gl',  'gl.id',  'c.grade_level_id')
      .where({ 'ta.school_id': req.schoolId, 'ay.is_active': true })
      .select(
        'ta.id',
        'ta.teacher_id', 'u.first_name as teacher_first_name', 'u.last_name as teacher_last_name',
        'ta.classroom_id', 'c.name as classroom_name', 'c.shift', 'gl.name as grade_level_name',
        'ta.subject_id', 's.name as subject_name', 's.area as subject_area'
      )
      .orderBy(['gl.sort_order', 'c.name', 's.name']);

    if (classroomId) query = query.where('ta.classroom_id', classroomId);
    if (teacherId)   query = query.where('ta.teacher_id', teacherId);

    res.json({ data: await query });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/assignments/teachers
 * Lista los docentes activos del colegio (para el selector).
 */
router.get('/teachers', ...coordAuth, async (req, res, next) => {
  try {
    const teachers = await db('users')
      .where({ school_id: req.schoolId, role: 'teacher', is_active: true })
      .select('id', 'first_name', 'last_name', 'email')
      .orderBy(['last_name', 'first_name']);
    res.json({ data: teachers });
  } catch (err) { next(err); }
});

/**
 * POST /api/v1/assignments
 * Asigna un docente a un grupo + materia en el año activo.
 */
router.post('/', ...coordAuth, validate(AssignmentSchema), async (req, res, next) => {
  try {
    const activeYear = await db('academic_years')
      .where({ school_id: req.schoolId, is_active: true }).first();
    if (!activeYear) return res.status(400).json({ error: 'No hay año académico activo.' });

    const [assignment] = await db('teacher_assignments')
      .insert({
        school_id:        req.schoolId,
        teacher_id:       req.body.teacherId,
        classroom_id:     req.body.classroomId,
        subject_id:       req.body.subjectId,
        academic_year_id: activeYear.id,
      })
      .returning('*');

    // Devolver con nombres para actualizar la UI sin refetch
    const enriched = await db('teacher_assignments as ta')
      .join('users as u',       'u.id', 'ta.teacher_id')
      .join('classrooms as c',  'c.id', 'ta.classroom_id')
      .join('subjects as s',    's.id', 'ta.subject_id')
      .join('grade_levels as gl','gl.id','c.grade_level_id')
      .where('ta.id', assignment.id)
      .select(
        'ta.id',
        'ta.teacher_id', 'u.first_name as teacher_first_name', 'u.last_name as teacher_last_name',
        'ta.classroom_id', 'c.name as classroom_name', 'c.shift', 'gl.name as grade_level_name',
        'ta.subject_id', 's.name as subject_name', 's.area as subject_area'
      )
      .first();

    res.status(201).json({ data: enriched });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Este docente ya tiene esa materia asignada en ese grupo.' });
    next(err);
  }
});

/**
 * DELETE /api/v1/assignments/:id
 * Elimina una asignación docente-grupo-materia.
 */
router.delete('/:id', ...coordAuth, async (req, res, next) => {
  try {
    const count = await db('teacher_assignments')
      .where({ id: req.params.id, school_id: req.schoolId }).delete();
    if (!count) return res.status(404).json({ error: 'Asignación no encontrada.' });
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
