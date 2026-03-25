'use strict';

const router = require('express').Router();
const { firebaseAuthMiddleware } = require('../middlewares/firebaseAuth.middleware');
const { tenantMiddleware }       = require('../middlewares/tenant.middleware');
const { roles }                  = require('../middlewares/roles.middleware');
const { validate }               = require('../middlewares/validate.middleware');
const {
  BulkAttendanceSchema,
  UpdateAttendanceSchema,
} = require('./attendance.schema');
const ctrl = require('./attendance.controller');

// Todas las rutas requieren auth + tenant
const auth = [firebaseAuthMiddleware, tenantMiddleware];

/**
 * POST /api/v1/attendance/bulk
 * Docente registra asistencia de todo su grupo (1 request por día)
 */
router.post(
  '/bulk',
  ...auth,
  roles('teacher', 'coordinator', 'school_admin'),
  validate(BulkAttendanceSchema),
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
