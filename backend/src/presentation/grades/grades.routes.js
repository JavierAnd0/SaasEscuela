'use strict';

const router = require('express').Router();
const { auth }  = require('../middlewares/authMiddlewares');
const { roles } = require('../middlewares/roles.middleware');
const { validate }               = require('../middlewares/validate.middleware');
const { BulkGradesSchema, GradeQuerySchema } = require('./grades.schema');
const ctrl = require('./grades.controller');
const db   = require('../../infrastructure/database/knex/config');
const { requireGradeWindow } = require('../middlewares/requireOpenPeriod.middleware');

/**
 * POST /api/v1/grades/bulk
 * Docente ingresa todas las notas de su materia para un grupo/período
 */
router.post(
  '/bulk',
  ...auth,
  roles('teacher', 'coordinator', 'school_admin'),
  validate(BulkGradesSchema),
  requireGradeWindow,
  ctrl.bulkSave
);

/**
 * GET /api/v1/grades
 * ?classroomId=&subjectId=&periodId= o ?studentId=&periodId=
 */
router.get(
  '/',
  ...auth,
  roles('teacher', 'coordinator', 'school_admin'),
  validate(GradeQuerySchema, 'query'),
  ctrl.getGrades
);

/**
 * GET /api/v1/grades/my-assignments
 * Docente: retorna sus asignaciones activas (grupo + materia) del año en curso.
 * Coordinador/Admin: retorna todas las asignaciones.
 */
router.get(
  '/my-assignments',
  ...auth,
  roles('teacher', 'coordinator', 'school_admin'),
  async (req, res, next) => {
    try {
      let query = db('teacher_assignments as ta')
        .join('classrooms as c',     'c.id',  'ta.classroom_id')
        .join('subjects as s',       's.id',  'ta.subject_id')
        .join('academic_years as ay','ay.id', 'ta.academic_year_id')
        .join('grade_levels as gl',  'gl.id', 'c.grade_level_id')
        .where({ 'ta.school_id': req.schoolId, 'ay.is_active': true })
        .select(
          'ta.id          as assignment_id',
          'ta.classroom_id',
          'ta.subject_id',
          'c.name         as classroom_name',
          's.name         as subject_name',
          's.area         as subject_area',
          'gl.name        as grade_level_name'
        )
        .orderBy(['c.name', 's.name']);

      if (req.user.role === 'teacher' && req.user.dbId) {
        query = query.where('ta.teacher_id', req.user.dbId);
      }

      const assignments = await query;
      res.json({ data: assignments });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/grades/entry-status
 * Para el coordinador: ver qué docentes han completado el ingreso
 */
router.get(
  '/entry-status',
  ...auth,
  roles('coordinator', 'school_admin'),
  ctrl.getEntryStatus
);

/**
 * GET /api/v1/grades/coordinator-view
 * Vista solo lectura para el coordinador:
 * ?classroomId=&periodId=
 * Retorna las notas agrupadas por materia con info del docente asignado.
 */
router.get(
  '/coordinator-view',
  ...auth,
  roles('coordinator', 'school_admin'),
  async (req, res, next) => {
    try {
      const { classroomId, periodId } = req.query;
      if (!classroomId || !periodId) {
        return res.status(400).json({ error: 'classroomId y periodId son requeridos.' });
      }

      // Materias con docente asignado para este grupo (año activo)
      const assignments = await db('teacher_assignments as ta')
        .join('subjects as s',       's.id',  'ta.subject_id')
        .join('academic_years as ay','ay.id', 'ta.academic_year_id')
        .join('users as u',          'u.id',  'ta.teacher_id')
        .where({ 'ta.school_id': req.schoolId, 'ta.classroom_id': classroomId, 'ay.is_active': true })
        .select(
          'ta.subject_id', 's.name as subject_name', 's.area as subject_area',
          'u.first_name as teacher_first_name', 'u.last_name as teacher_last_name'
        )
        .orderBy(['s.area', 's.name']);

      // Estudiantes del grupo
      const students = await db('students as s')
        .join('student_classroom as sc', 'sc.student_id', 's.id')
        .join('academic_years as ay',    'ay.id', 'sc.academic_year_id')
        .where({ 'sc.classroom_id': classroomId, 'sc.enrollment_status': 'active',
                 'ay.is_active': true, 's.school_id': req.schoolId })
        .select('s.id', 's.first_name', 's.last_name', 's.document_number')
        .orderBy(['s.last_name', 's.first_name']);

      // Todas las notas del grupo en el período
      const allGrades = await db('grades')
        .where({ school_id: req.schoolId, classroom_id: classroomId, period_id: periodId })
        .select('student_id', 'subject_id', 'grade_value');

      // Construir mapa de notas: { subject_id: { student_id: grade_value } }
      const gradeMap = {};
      for (const g of allGrades) {
        if (!gradeMap[g.subject_id]) gradeMap[g.subject_id] = {};
        gradeMap[g.subject_id][g.student_id] = parseFloat(g.grade_value);
      }

      // Armar respuesta agrupada por materia
      const subjects = assignments.map(a => ({
        subject_id:           a.subject_id,
        subject_name:         a.subject_name,
        subject_area:         a.subject_area,
        teacher_name:         `${a.teacher_first_name} ${a.teacher_last_name}`,
        grades_entered:       Object.keys(gradeMap[a.subject_id] || {}).length,
        total_students:       students.length,
        students: students.map(st => ({
          student_id:      st.id,
          first_name:      st.first_name,
          last_name:       st.last_name,
          document_number: st.document_number,
          grade_value:     gradeMap[a.subject_id]?.[st.id] ?? null,
        })),
      }));

      res.json({ data: { students, subjects } });
    } catch (err) { next(err); }
  }
);

module.exports = router;
