'use strict';

const { AttendanceKnexRepository } = require('../../infrastructure/database/knex/AttendanceKnexRepository');
const { RecordDailyAttendanceUseCase } = require('../../application/attendance/RecordDailyAttendanceUseCase');
const { GetTeacherAttendanceDashboardUseCase } = require('../../application/attendance/GetTeacherAttendanceDashboardUseCase');
const { NotFoundError } = require('../middlewares/errorHandler.middleware');

// Inyección de dependencia: el controller crea el repositorio concreto
// y lo pasa al caso de uso. Esto puede reemplazarse por un DI container.
const attendanceRepo = new AttendanceKnexRepository();
const recordUseCase  = new RecordDailyAttendanceUseCase(attendanceRepo);
const dashboardUseCase = new GetTeacherAttendanceDashboardUseCase(attendanceRepo);

/**
 * POST /api/v1/attendance/bulk
 * Registra asistencia de un grupo completo para una fecha
 */
async function bulkRecord(req, res, next) {
  try {
    const { classroomId, periodId, subjectId, recordDate, records } = req.body;
    const result = await recordUseCase.execute({
      schoolId:    req.schoolId,
      classroomId,
      periodId,
      subjectId:   subjectId ?? null,
      recordDate,
      recordedBy:  req.user.dbId,
      records,
    });
    res.status(201).json({ data: result, count: result.length });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/attendance
 * Vista del día para un grupo: ?classroomId=&date=
 * Historial de un estudiante: ?studentId=&periodId=
 */
async function getAttendance(req, res, next) {
  try {
    const { classroomId, studentId, periodId, date } = req.query;

    if (classroomId && date) {
      const records = await attendanceRepo.findByClassroomAndDate({
        schoolId:     req.schoolId,
        classroomId,
        recordDate:   date,
        subjectId:    req.query.subjectId || null,
      });
      return res.json({ data: records });
    }

    if (studentId && periodId) {
      const records = await attendanceRepo.findByStudentAndPeriod({
        schoolId:  req.schoolId,
        studentId,
        periodId,
      });
      return res.json({ data: records });
    }

    res.status(400).json({ error: 'Parámetros insuficientes. Use classroomId+date o studentId+periodId.' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/attendance/summary
 * Resumen de asistencia por grupo y período: ?classroomId=&periodId=
 */
async function getSummary(req, res, next) {
  try {
    const { classroomId, periodId } = req.query;
    const summary = await attendanceRepo.getSummaryByClassroomAndPeriod({
      schoolId:    req.schoolId,
      classroomId,
      periodId,
    });
    res.json({ data: summary });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/attendance/dashboard/teacher
 * Dashboard del docente: métricas de sus grupos en el período activo
 */
async function getTeacherDashboard(req, res, next) {
  try {
    const { periodId } = req.query;
    const result = await dashboardUseCase.execute({
      schoolId:  req.schoolId,
      teacherId: req.user.uid,   // el docente ve sus propios datos
      periodId,
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/attendance/alerts
 * Estudiantes con inasistencias injustificadas >= threshold: ?periodId=&threshold=3
 */
async function getAlerts(req, res, next) {
  try {
    const { periodId, threshold = '3' } = req.query;
    const students = await attendanceRepo.getStudentsWithExcessiveAbsences({
      schoolId:  req.schoolId,
      periodId,
      threshold: parseInt(threshold, 10),
    });
    res.json({ data: students });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/attendance/:id
 * Corregir o justificar un registro de asistencia
 */
async function updateRecord(req, res, next) {
  try {
    const { id } = req.params;
    const updated = await attendanceRepo.update(id, req.body, req.schoolId);
    if (!updated) throw new NotFoundError('Registro de asistencia no encontrado.');
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = { bulkRecord, getAttendance, getSummary, getTeacherDashboard, getAlerts, updateRecord };
