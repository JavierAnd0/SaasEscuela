import apiClient from '../../../shared/api/client';

export const consolidationApi = {
  run:        (data)                  => apiClient.post('/consolidation', data),
  getSummary: (classroomId, periodId) => apiClient.get('/consolidation', { params: { classroomId, periodId } }),
};
