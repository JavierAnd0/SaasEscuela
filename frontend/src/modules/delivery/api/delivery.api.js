import apiClient from '../../../shared/api/client';

export const deliveryApi = {
  send:      (data)                  => apiClient.post('/delivery/send', data),
  getStatus: (classroomId, periodId) => apiClient.get('/delivery/status', { params: { classroomId, periodId } }),
};
