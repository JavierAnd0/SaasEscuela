import apiClient from '../../../shared/api/client';

export const dashboardApi = {
  getGradeProgress:    (periodId)            => apiClient.get('/dashboard/grade-progress', { params: { periodId } }),
  getAtRisk:           (periodId)            => apiClient.get('/dashboard/at-risk', { params: { periodId } }),
  getAttendanceAlerts: (periodId, threshold) => apiClient.get('/dashboard/attendance-alerts', { params: { periodId, threshold } }),
};
