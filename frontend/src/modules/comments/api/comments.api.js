import apiClient from '../../../shared/api/client';

export const commentsApi = {
  generate:   (data)                  => apiClient.post('/comments/generate', data),
  getAll:     (classroomId, periodId) => apiClient.get('/comments', { params: { classroomId, periodId } }),
  update:     (id, data)              => apiClient.put(`/comments/${id}`, data),
  approveAll: (data)                  => apiClient.post('/comments/approve-all', data),
};
