'use strict';

/**
 * Portal de Padres — rutas privadas (role: parent)
 *
 * Todas las rutas verifican que el padre autenticado esté vinculado
 * al estudiante solicitado via la tabla student_parents.
 */

const router = require('express').Router();
const { auth }  = require('../middlewares/authMiddlewares');
const { roles } = require('../middlewares/roles.middleware');
const db        = require('../../infrastructure/database/knex/config');

const parentAuth = [...auth, roles('parent')];

// ─── Helper: verifica que el padre tenga acceso al estudiante ─────────────────

async function assertParentAccess(parentDbId, studentId, schoolId) {
  const link = await db('student_parents')
    .where({ parent_id: parentDbId, student_id: studentId })
    .first();

  if (!link) return null;

  const student = await db('students')
    .where({ id: studentId, school_id: schoolId, is_active: true })
    .first();

  return student || null;
}

// ─── GET /api/v1/portal/children ─────────────────────────────────────────────
// Retorna los estudiantes vinculados al padre autenticado.

router.get('/children', ...parentAuth, async (req, res, next) => {
  try {
    const students = await db('students as s')
      .join('student_parents as sp', 'sp.student_id', 's.id')
      .leftJoin('student_classroom as sc', function () {
        this.on('sc.student_id', 's.id')
            .andOn('sc.enrollment_status', db.raw("'active'"));
      })
      .leftJoin('classrooms as c', 'c.id', 'sc.classroom_id')
      .leftJoin('grade_levels as gl', 'gl.id', 'c.grade_level_id')
      .leftJoin('academic_years as ay', 'ay.id', 'sc.academic_year_id')
      .where({ 'sp.parent_id': req.user.dbId, 's.school_id': req.schoolId, 's.is_active': true })
      .where(function () {
        this.where('ay.is_active', true).orWhereNull('ay.id');
      })
      .select(
        's.id', 's.first_name', 's.last_name', 's.document_type', 's.document_number',
        's.date_of_birth', 's.gender',
        'sp.relationship',
        'c.id as classroom_id', 'c.name as classroom_name',
        'gl.name as grade_level_name',
        'ay.name as academic_year_name',
      )
      .orderBy(['s.last_name', 's.first_name']);

    res.json({ data: students });
  } catch (err) { next(err); }
});

// ─── GET /api/v1/portal/children/:studentId/periods ──────────────────────────
// Períodos del año académico activo para el colegio del padre.

router.get('/children/:studentId/periods', ...parentAuth, async (req, res, next) => {
  try {
    const student = await assertParentAccess(req.user.dbId, req.params.studentId, req.schoolId);
    if (!student) return res.status(403).json({ error: 'Acceso denegado.' });

    const periods = await db('periods as p')
      .join('academic_years as ay', 'ay.id', 'p.academic_year_id')
      .where({ 'p.school_id': req.schoolId, 'ay.is_active': true })
      .select('p.id', 'p.period_number', 'p.name', 'p.start_date', 'p.end_date',
              'p.weight_percent', 'p.is_closed', 'ay.name as academic_year_name')
      .orderBy('p.period_number');

    res.json({ data: periods });
  } catch (err) { next(err); }
});

// ─── GET /api/v1/portal/children/:studentId/summary?periodId= ────────────────
// Notas + asistencia del estudiante en un período dado.

router.get('/children/:studentId/summary', ...parentAuth, async (req, res, next) => {
  try {
    const { periodId } = req.query;

    const student = await assertParentAccess(req.user.dbId, req.params.studentId, req.schoolId);
    if (!student) return res.status(403).json({ error: 'Acceso denegado.' });

    // Período activo por defecto si no se provee
    let period;
    if (periodId) {
      period = await db('periods').where({ id: periodId, school_id: req.schoolId }).first();
    } else {
      period = await db('periods as p')
        .join('academic_years as ay', 'ay.id', 'p.academic_year_id')
        .where({ 'p.school_id': req.schoolId, 'ay.is_active': true, 'p.is_closed': false })
        .orderBy('p.period_number')
        .select('p.*')
        .first();
    }

    if (!period) return res.status(404).json({ error: 'No hay período disponible.' });

    // Notas del período
    const grades = await db('grades as g')
      .join('subjects as s', 's.id', 'g.subject_id')
      .where({ 'g.student_id': student.id, 'g.period_id': period.id, 'g.school_id': req.schoolId })
      .select(
        's.name as subject_name', 's.area as subject_area',
        'g.grade_value',
        'g.created_at as entered_at',
      )
      .orderBy(['s.area', 's.name']);

    // Resumen de asistencia del período
    const attendance = await db('attendance_period_summary')
      .where({ student_id: student.id, period_id: period.id, school_id: req.schoolId })
      .select(
        'total_days', 'present_count', 'absent_justified_count',
        'absent_unjustified_count', 'late_count', 'attendance_rate',
      )
      .first();

    // Promedio del período
    const avg = grades.length
      ? (grades.reduce((sum, g) => sum + parseFloat(g.grade_value), 0) / grades.length).toFixed(1)
      : null;

    res.json({
      data: {
        student: {
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
        },
        period: {
          id: period.id,
          name: period.name,
          period_number: period.period_number,
          is_closed: period.is_closed,
        },
        grades,
        grade_average: avg ? parseFloat(avg) : null,
        attendance: attendance || null,
      },
    });
  } catch (err) { next(err); }
});

// ─── GET /api/v1/portal/children/:studentId/report-cards ─────────────────────
// Boletines generados para el estudiante.

router.get('/children/:studentId/report-cards', ...parentAuth, async (req, res, next) => {
  try {
    const student = await assertParentAccess(req.user.dbId, req.params.studentId, req.schoolId);
    if (!student) return res.status(403).json({ error: 'Acceso denegado.' });

    const reportCards = await db('report_cards as rc')
      .join('periods as p', 'p.id', 'rc.period_id')
      .join('academic_years as ay', 'ay.id', 'rc.academic_year_id')
      .where({ 'rc.student_id': student.id, 'rc.school_id': req.schoolId })
      .whereNotNull('rc.access_token')
      .select(
        'rc.id', 'rc.access_token', 'rc.pdf_url', 'rc.pdf_generated_at',
        'rc.access_token_expires_at',
        'p.name as period_name', 'p.period_number',
        'ay.name as academic_year_name',
      )
      .orderBy([{ column: 'ay.name', order: 'desc' }, { column: 'p.period_number', order: 'desc' }]);

    res.json({ data: reportCards });
  } catch (err) { next(err); }
});

module.exports = router;
