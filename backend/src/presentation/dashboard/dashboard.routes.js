'use strict';

const router = require('express').Router();
const { auth }  = require('../middlewares/authMiddlewares');
const { roles } = require('../middlewares/roles.middleware');
const db        = require('../../infrastructure/database/knex/config');

/**
 * GET /api/v1/dashboard/grade-progress?periodId=
 * % de notas ingresadas por docente para el coordinador
 */
router.get('/grade-progress', ...auth, roles('coordinator', 'school_admin'), async (req, res, next) => {
  try {
    const { periodId } = req.query;
    const data = await db('grade_entry_status as ges')
      .join('users as u', 'u.id', 'ges.teacher_id')
      .join('subjects as s', 's.id', 'ges.subject_id')
      .join('classrooms as c', 'c.id', 'ges.classroom_id')
      .where({ 'ges.school_id': req.schoolId, 'ges.period_id': periodId })
      .select(
        'ges.*',
        'u.first_name', 'u.last_name', 'u.email',
        's.name as subject_name',
        'c.name as classroom_name',
        db.raw(`ROUND(ges.grades_entered * 100.0 / NULLIF(ges.total_students, 0), 0) AS completion_percent`)
      )
      .orderBy(['c.name', 's.name', 'u.last_name']);
    res.json({ data });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/dashboard/at-risk?periodId=
 * Estudiantes con promedio por debajo del mínimo aprobatorio
 */
router.get('/at-risk', ...auth, roles('coordinator', 'school_admin'), async (req, res, next) => {
  try {
    const { periodId } = req.query;
    const data = await db('student_period_summary as sps')
      .join('students as s', 's.id', 'sps.student_id')
      .join('classrooms as c', 'c.id', 'sps.classroom_id')
      .where({
        'sps.school_id': req.schoolId,
        'sps.period_id': periodId,
        'sps.is_at_risk': true,
      })
      .select(
        'sps.*',
        's.first_name', 's.last_name', 's.document_number',
        'c.name as classroom_name'
      )
      .orderBy('sps.period_average', 'asc');
    res.json({ data });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/dashboard/attendance-alerts?periodId=&threshold=3
 */
router.get('/attendance-alerts', ...auth, roles('coordinator', 'school_admin'), async (req, res, next) => {
  try {
    const { periodId, threshold = '3' } = req.query;
    const data = await db('attendance_records as ar')
      .join('students as s', 's.id', 'ar.student_id')
      .join('classrooms as c', 'c.id', 'ar.classroom_id')
      .where({
        'ar.school_id': req.schoolId,
        'ar.period_id': periodId,
        'ar.status': 'absent_unjustified',
      })
      .groupBy('ar.student_id', 's.first_name', 's.last_name', 'ar.classroom_id', 'c.name')
      .havingRaw('COUNT(*) >= ?', [parseInt(threshold, 10)])
      .select(
        'ar.student_id',
        's.first_name', 's.last_name',
        'ar.classroom_id', 'c.name as classroom_name',
        db.raw('COUNT(*) AS unjustified_absences')
      )
      .orderBy('unjustified_absences', 'desc');
    res.json({ data });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/dashboard/summary?periodId=
 * Contadores globales del colegio para KPIs del dashboard
 */
router.get('/summary', ...auth, roles('coordinator', 'school_admin'), async (req, res, next) => {
  try {
    const { periodId } = req.query;

    const activeYear = await db('academic_years')
      .where({ school_id: req.schoolId, is_active: true }).first();

    const [
      [{ total_students }],
      [{ total_teachers }],
      [{ total_classrooms }],
      [{ total_subjects }],
      completionRow,
    ] = await Promise.all([
      // Estudiantes activos matriculados en el año activo
      db('student_classroom as sc')
        .join('classrooms as c', 'c.id', 'sc.classroom_id')
        .join('academic_years as ay', 'ay.id', 'sc.academic_year_id')
        .where({ 'c.school_id': req.schoolId, 'ay.is_active': true, 'sc.enrollment_status': 'active' })
        .count('sc.student_id as total_students'),

      // Docentes activos
      db('users')
        .where({ school_id: req.schoolId, role: 'teacher', is_active: true })
        .count('id as total_teachers'),

      // Grupos del año activo
      db('classrooms as c')
        .join('academic_years as ay', 'ay.id', 'c.academic_year_id')
        .where({ 'c.school_id': req.schoolId, 'ay.is_active': true })
        .count('c.id as total_classrooms'),

      // Materias del colegio
      db('subjects')
        .where({ school_id: req.schoolId })
        .count('id as total_subjects'),

      // Porcentaje de completitud de notas para el período dado
      periodId
        ? db('grade_entry_status')
            .where({ school_id: req.schoolId, period_id: periodId })
            .select(db.raw('ROUND(AVG(grades_entered * 100.0 / NULLIF(total_students, 0)), 1) as overall_completion'))
            .first()
        : Promise.resolve({ overall_completion: null }),
    ]);

    res.json({
      data: {
        active_year_name:  activeYear?.name ?? null,
        total_students:    parseInt(total_students, 10),
        total_teachers:    parseInt(total_teachers, 10),
        total_classrooms:  parseInt(total_classrooms, 10),
        total_subjects:    parseInt(total_subjects, 10),
        overall_completion: completionRow?.overall_completion != null
          ? parseFloat(completionRow.overall_completion)
          : null,
      },
    });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/dashboard/teacher-summary?periodId=
 * Vista consolidada para el docente: progreso de notas + resumen de asistencia
 * por cada una de sus asignaciones en el período.
 */
router.get('/teacher-summary', ...auth, roles('teacher'), async (req, res, next) => {
  try {
    const { periodId } = req.query;
    const teacherDbId  = req.user.dbId;

    if (!periodId || !teacherDbId) {
      return res.status(400).json({ error: 'periodId es requerido y el perfil debe estar completo.' });
    }

    // Progreso de ingreso de notas para las asignaciones del docente
    const gradeProgress = await db('grade_entry_status as ges')
      .join('subjects as s',   's.id', 'ges.subject_id')
      .join('classrooms as c', 'c.id', 'ges.classroom_id')
      .where({
        'ges.school_id':  req.schoolId,
        'ges.period_id':  periodId,
        'ges.teacher_id': teacherDbId,
      })
      .select(
        'ges.classroom_id',
        'ges.subject_id',
        'ges.grades_entered',
        'ges.total_students',
        's.name as subject_name',
        's.area as subject_area',
        'c.name as classroom_name',
        db.raw(`ROUND(ges.grades_entered * 100.0 / NULLIF(ges.total_students, 0), 0) AS completion_percent`),
        db.raw(`(ges.grades_entered >= ges.total_students) AS is_complete`),
      )
      .orderBy(['c.name', 's.name']);

    // Resumen de asistencia para los grupos del docente en el período
    const classroomIds = [...new Set(gradeProgress.map(r => r.classroom_id))];

    let attendanceSummary = [];
    if (classroomIds.length > 0) {
      attendanceSummary = await db('attendance_records as ar')
        .join('classrooms as c', 'c.id', 'ar.classroom_id')
        .whereIn('ar.classroom_id', classroomIds)
        .where({ 'ar.school_id': req.schoolId, 'ar.period_id': periodId })
        .groupBy('ar.classroom_id', 'c.name')
        .select(
          'ar.classroom_id',
          'c.name as classroom_name',
          db.raw(`COUNT(*) FILTER (WHERE ar.status = 'present')                              AS present_count`),
          db.raw(`COUNT(*) FILTER (WHERE ar.status IN ('absent_unjustified','absent_justified')) AS absent_count`),
          db.raw(`COUNT(*) AS total_records`),
          db.raw(`ROUND(COUNT(*) FILTER (WHERE ar.status = 'present') * 100.0 / NULLIF(COUNT(*), 0), 1) AS attendance_rate`),
        );
    }

    // KPIs del docente para el período
    const totalAssignments    = gradeProgress.length;
    const completeAssignments = gradeProgress.filter(r => r.is_complete).length;
    const avgCompletion = totalAssignments > 0
      ? Math.round(gradeProgress.reduce((s, r) => s + parseFloat(r.completion_percent || 0), 0) / totalAssignments)
      : 0;
    const avgAttendance = attendanceSummary.length > 0
      ? Math.round(attendanceSummary.reduce((s, r) => s + parseFloat(r.attendance_rate || 0), 0) / attendanceSummary.length)
      : null;

    res.json({
      data: {
        kpis: {
          total_assignments:    totalAssignments,
          complete_assignments: completeAssignments,
          avg_completion_pct:   avgCompletion,
          avg_attendance_rate:  avgAttendance,
        },
        grade_progress:     gradeProgress,
        attendance_summary: attendanceSummary,
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
