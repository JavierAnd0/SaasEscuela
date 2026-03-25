'use strict';

const router = require('express').Router();
const { firebaseAuthMiddleware } = require('../middlewares/firebaseAuth.middleware');
const { tenantMiddleware }       = require('../middlewares/tenant.middleware');
const { roles }                  = require('../middlewares/roles.middleware');
const db                         = require('../../infrastructure/database/knex/config');

const auth = [firebaseAuthMiddleware, tenantMiddleware];

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

module.exports = router;
