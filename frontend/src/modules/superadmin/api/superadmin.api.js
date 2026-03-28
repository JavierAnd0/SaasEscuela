import apiClient from '../../../shared/api/client';

export const superadminApi = {
  // Colegios
  getSchools:          ()           => apiClient.get('/schools'),
  getSchool:           (id)         => apiClient.get(`/schools/${id}`),
  createSchool:        (data)       => apiClient.post('/schools', data),
  updateSubscription:  (id, data)   => apiClient.put(`/schools/${id}/subscription`, data),

  // Crear usuario administrador para un colegio
  createAdmin:         (data)       => apiClient.post('/auth/register-user', data),
};
