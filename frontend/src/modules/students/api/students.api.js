import apiClient from '../../../shared/api/client';

export const studentsApi = {
  getAll:       (params = {}) => apiClient.get('/students', { params }),
  getById:      (id)          => apiClient.get(`/students/${id}`),
  create:       (data)        => apiClient.post('/students', data),
  update:       (id, data)    => apiClient.put(`/students/${id}`, data),
  toggleActive: (id)          => apiClient.delete(`/students/${id}`),
  enroll:       (id, data)    => apiClient.post(`/students/${id}/enroll`, data),
  importCsv:    (csv)         => apiClient.post('/students/import-csv', { csv }),
};
