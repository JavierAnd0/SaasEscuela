import apiClient from '../../../shared/api/client';

export const assignmentsApi = {
  getAll:       (params) => apiClient.get('/assignments', { params }),
  getTeachers:  ()       => apiClient.get('/assignments/teachers'),
  create:       (data)   => apiClient.post('/assignments', data),
  remove:       (id)     => apiClient.delete(`/assignments/${id}`),
};
