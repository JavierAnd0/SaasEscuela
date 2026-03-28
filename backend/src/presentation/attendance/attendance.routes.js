'use strict';

const router = require('express').Router();
const { auth }  = require('../middlewares/authMiddlewares');
const { roles } = require('../middlewares/roles.middleware');
const { validate }               = require('../middlewares/validate.middleware');
const {
  BulkAttendanceSchema,
  UpdateAttendanceSchema,
} = require('./attendance.schema');
const ctrl = require('./attendance.controller');
const { requireOpenPeriod } = require('../middlewares/requireOpenPeriod.middleware');
const db = require('../../infrastructure/database/knex/config');

/**
 * POST /api/v1/attendance/bulk
 * Docente registra asistencia de todo su grupo (1 request por día)
 */
router.post(
  '/bulk',
  ...auth,
  roles('teacher', 'coordinator', 'school_admin'),
  validate(BulkAttendanceSchema),
  requireOpenPeriod,
  ctrl.bulkRecord
);

/**
 * GET /api/v1/attendance
 * ?classroomId=&date=       → vista del día para un grupo
 * ?studentId=&periodId=     → historial de un estudiante
 */
router.get(
  '/',
  ...auth,
  roles('teacher', 'coordinator', 'school_admin'),
  ctrl.getAttendance
);

/**
 * GET /api/v1/attendance/summary
 * ?classroomId=&periodId= → resumen del período para un grupo
 */
router.get(
  '/summary',
  ...auth,
  roles('teacher', 'coordinator', 'school_admin'),
  ctrl.getSummary
);

/**
 * GET /api/v1/attendance/dashboard/teacher
 * Dashboard del docente: métricas de sus grupos
 * ?periodId= → período activo
 */
router.get(
  '/dashboard/teacher',
  ...auth,
  roles('teacher'),
  ctrl.getTeacherDashboard
);

/**
 * GET /api/v1/attendance/alerts
 * Estudiantes con inasistencias injustificadas excesivas
 * ?periodId=&threshold=3
 */
router.get(
  '/alerts',
  ...auth,
  roles('coordinator', 'school_admin'),
  ctrl.getAlerts
);

/**
 * GET /api/v1/attendance/subjects-by-classroom
 * Materias que el docente autenticado dicta en un grupo específico.
 * Usado para poblar el selector de materia en el formulario de asistencia.
 * ?classroomId=
 */
router.get(
  '/subjects-by-classroom',
  ...auth,
  roles('teacher', 'coordinator', 'school_admin'),
  async (req, res, next) => {
    try {
      const { classroomId } = req.query;
      if (!classroomId) {
        return res.status(400).json({ error: 'classroomId es requerido.' });
      }

      let query = db('teacher_assignments as ta')
        .join('subjects as s', 's.id', 'ta.subject_id')
        .where({ 'ta.school_id': req.schoolId, 'ta.classroom_id': classroomId })
        .select('s.id', 's.name', 's.code', 's.area')
        .orderBy('s.name');

      // Docentes ven solo sus materias; coordinadores/admins ven todas las del grupo
      if (req.user.role === 'teacher') {
        query = query.where('ta.teacher_id', req.user.dbId);
      }

      const subjects = await query;
      res.json({ data: subjects });
    } catch (err) { next(err); }
  }
);

/**
 * PUT /api/v1/attendance/:id
 * Corregir o justificar un registro
 */
router.put(
  '/:id',
  ...auth,
  roles('teacher', 'coordinator', 'school_admin'),
  validate(UpdateAttendanceSchema),
  ctrl.updateRecord
);

module.exports = router;
