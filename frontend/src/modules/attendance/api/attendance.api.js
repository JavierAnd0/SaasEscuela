import apiClient from '../../../shared/api/client';

export const attendanceApi = {
  /** Registrar asistencia de un grupo completo */
  bulkRecord: (data) =>
    apiClient.post('/attendance/bulk', data),

  /** Vista del día: ?classroomId=&date= */
  getByClassroomAndDate: (classroomId, date) =>
    apiClient.get('/attendance', { params: { classroomId, date } }),

  /** Historial de un estudiante: ?studentId=&periodId= */
  getByStudentAndPeriod: (studentId, periodId) =>
    apiClient.get('/attendance', { params: { studentId, periodId } }),

  /** Resumen del período para un grupo */
  getSummary: (classroomId, periodId) =>
    apiClient.get('/attendance/summary', { params: { classroomId, periodId } }),

  /** Dashboard del docente */
  getTeacherDashboard: (periodId) =>
    apiClient.get('/attendance/dashboard/teacher', { params: { periodId } }),

  /** Alertas de inasistencias */
  getAlerts: (periodId, threshold = 3) =>
    apiClient.get('/attendance/alerts', { params: { periodId, threshold } }),

  /** Actualizar/justificar un registro */
  update: (id, data) =>
    apiClient.put(`/attendance/${id}`, data),
};
