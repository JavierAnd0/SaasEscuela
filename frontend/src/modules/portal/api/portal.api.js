import apiClient from '../../../shared/api/client';

const portalApi = {
  getChildren:     ()                         => apiClient.get('/portal/children'),
  getPeriods:      (studentId)                => apiClient.get(`/portal/children/${studentId}/periods`),
  getSummary:      (studentId, periodId)      => apiClient.get(`/portal/children/${studentId}/summary`, { params: { periodId } }),
  getReportCards:  (studentId)                => apiClient.get(`/portal/children/${studentId}/report-cards`),
};

export default portalApi;
