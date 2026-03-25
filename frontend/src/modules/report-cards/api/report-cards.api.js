import apiClient from '../../../shared/api/client';

export const reportCardsApi = {
  generate: (data)                  => apiClient.post('/report-cards/generate', data),
  getAll:   (classroomId, periodId) => apiClient.get('/report-cards', { params: { classroomId, periodId } }),
};
