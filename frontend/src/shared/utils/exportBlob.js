import apiClient from '../api/client';

/**
 * Downloads an Excel file from the given API endpoint.
 * @param {string} url  - relative path, e.g. '/export/students'
 * @param {object} params - query params object
 * @param {string} filename - suggested file name for the download
 */
export async function downloadExcel(url, params = {}, filename = 'export.xlsx') {
  const response = await apiClient.get(url, {
    params,
    responseType: 'blob',
  });

  const blob    = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const href    = URL.createObjectURL(blob);
  const anchor  = document.createElement('a');
  anchor.href   = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(href);
}
