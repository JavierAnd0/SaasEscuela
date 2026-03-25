import apiClient from '../../../shared/api/client';

export const gradesApi = {
  /** Asignaciones del docente (grupo + materia) en el año activo */
  getMyAssignments: () =>
    apiClient.get('/grades/my-assignments'),

  /** Guardar/actualizar notas en bloque (upsert por estudiante+materia+período) */
  bulkSave: (data) =>
    apiClient.post('/grades/bulk', data),

  /** Notas existentes para un grupo+materia+período */
  getByClassroomSubjectPeriod: (classroomId, subjectId, periodId) =>
    apiClient.get('/grades', { params: { classroomId, subjectId, periodId } }),

  /** Estado de ingreso por docente (vista coordinador) */
  getEntryStatus: (periodId, classroomId) =>
    apiClient.get('/grades/entry-status', { params: { periodId, classroomId } }),
};
