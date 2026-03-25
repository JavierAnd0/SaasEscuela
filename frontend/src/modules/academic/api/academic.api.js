import apiClient from '../../../shared/api/client';

export const academicApi = {
  // Grados
  getGradeLevels:    ()           => apiClient.get('/grade-levels'),
  createGradeLevel:  (data)       => apiClient.post('/grade-levels', data),
  updateGradeLevel:  (id, data)   => apiClient.put(`/grade-levels/${id}`, data),
  deleteGradeLevel:  (id)         => apiClient.delete(`/grade-levels/${id}`),

  // Grupos
  getClassrooms:     (params)     => apiClient.get('/classrooms', { params }),
  createClassroom:   (data)       => apiClient.post('/classrooms', data),
  updateClassroom:   (id, data)   => apiClient.put(`/classrooms/${id}`, data),
  deleteClassroom:   (id)         => apiClient.delete(`/classrooms/${id}`),

  // Jornadas disponibles
  getShifts:         ()           => apiClient.get('/shifts'),

  // Materias
  getSubjects:       ()           => apiClient.get('/subjects'),
  createSubject:     (data)       => apiClient.post('/subjects', data),
  updateSubject:     (id, data)   => apiClient.put(`/subjects/${id}`, data),
  deleteSubject:     (id)         => apiClient.delete(`/subjects/${id}`),
};
