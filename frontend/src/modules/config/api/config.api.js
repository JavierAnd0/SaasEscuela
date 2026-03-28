import apiClient from '../../../shared/api/client';

export const configApi = {
  // Colegio
  getSchool:        ()           => apiClient.get('/schools/me'),
  updateProfile:    (data)       => apiClient.put('/schools/me/profile', data),
  updateSiee:       (data)       => apiClient.put('/schools/me/siee', data),

  // Años académicos
  getAcademicYears: ()           => apiClient.get('/academic-years'),
  createAcademicYear: (data)     => apiClient.post('/academic-years', data),
  activateAcademicYear: (id)     => apiClient.put(`/academic-years/${id}/activate`),

  // Periodos
  getPeriods:       (yearId)     => apiClient.get('/periods', { params: yearId ? { yearId } : {} }),
  createPeriod:     (data)       => apiClient.post('/periods', data),
  updatePeriod:     (id, data)   => apiClient.put(`/periods/${id}`, data),
  deletePeriod:     (id)         => apiClient.delete(`/periods/${id}`),
  closePeriod:      (id)         => apiClient.post(`/periods/${id}/close`),

  // SMTP por colegio
  getSmtp:          ()           => apiClient.get('/schools/me/smtp'),
  updateSmtp:       (data)       => apiClient.put('/schools/me/smtp', data),
};
