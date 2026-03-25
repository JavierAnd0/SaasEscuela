'use strict';

function _levelClass(avg) {
  const v = parseFloat(avg);
  if (v >= 4.6) return { cls: 'superior', label: 'Superior' };
  if (v >= 4.0) return { cls: 'alto',     label: 'Alto' };
  if (v >= 3.0) return { cls: 'basico',   label: 'Básico' };
  return              { cls: 'bajo',     label: 'Bajo' };
}

/**
 * Generates the HTML string for a report card PDF.
 *
 * @param {Object} data
 * @param {Object} data.school       - { name, city, nit, primary_color }
 * @param {Object} data.student      - { first_name, last_name, document_number }
 * @param {Object} data.classroom    - { name }
 * @param {Object} data.period       - { name }
 * @param {Object} data.academicYear - { name }
 * @param {Array}  data.subjects     - [{ name, grade_value }]
 * @param {Number} data.periodAverage
 * @param {String} data.comment      - approved comment text
 */
function buildReportCardHtml({ school, student, classroom, period, academicYear, subjects, periodAverage, comment }) {
  const primary = school.primary_color || '#1E3A8A';
  const level   = _levelClass(periodAverage);

  const subjectRows = subjects.map((sub, i) => {
    const subLevel = _levelClass(sub.grade_value);
    const atRisk   = parseFloat(sub.grade_value) < 3.0;
    return `
      <tr style="${atRisk ? 'background:#fef2f2;' : i % 2 === 0 ? 'background:#f9fafb;' : ''}">
        <td style="padding:7px 10px; border-bottom:1px solid #e5e7eb;">${sub.name}</td>
        <td style="padding:7px 10px; text-align:center; border-bottom:1px solid #e5e7eb; font-weight:600; font-family:monospace;">
          ${parseFloat(sub.grade_value).toFixed(1)}
        </td>
        <td style="padding:7px 10px; text-align:center; border-bottom:1px solid #e5e7eb;">
          <span style="color:${subLevel.cls === 'superior' ? '#16a34a' : subLevel.cls === 'alto' ? '#2563eb' : subLevel.cls === 'basico' ? '#d97706' : '#dc2626'}; font-weight:600;">
            ${subLevel.label}
          </span>
        </td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #111827; background: white; padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 3px solid ${primary}; margin-bottom: 16px; }
    .school-name { font-size: 16pt; font-weight: 700; color: ${primary}; }
    .school-sub  { font-size: 9pt; color: #6b7280; margin-top: 3px; }
    .title { text-align: center; margin: 14px 0 6px; font-size: 14pt; font-weight: 700; text-transform: uppercase; color: ${primary}; }
    .subtitle { text-align: center; font-size: 10pt; color: #6b7280; margin-bottom: 16px; }
    .info-box { background: #f0f4ff; border-left: 4px solid ${primary}; padding: 10px 14px; margin-bottom: 16px; display: flex; gap: 30px; }
    .info-item { font-size: 10pt; }
    .info-label { font-weight: 600; color: #374151; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    thead tr { background: ${primary}; color: white; }
    thead th { padding: 8px 10px; text-align: left; font-size: 10pt; font-weight: 600; }
    thead th:not(:first-child) { text-align: center; }
    tfoot tr { background: #f3f4f6; }
    tfoot td { padding: 8px 10px; font-weight: 700; border-top: 2px solid ${primary}; }
    .comment-box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 14px; margin-bottom: 20px; }
    .comment-title { font-weight: 700; color: ${primary}; font-size: 10pt; margin-bottom: 6px; }
    .comment-text { font-size: 10pt; line-height: 1.5; color: #374151; }
    .signatures { display: flex; justify-content: space-around; margin-top: 30px; }
    .sig-block { text-align: center; }
    .sig-line { width: 160px; border-top: 1px solid #374151; margin-bottom: 4px; }
    .sig-label { font-size: 9pt; color: #6b7280; }
    .footer { margin-top: 20px; text-align: center; font-size: 8pt; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 8px; }
  </style>
</head>
<body>

  <div class="header">
    <div>
      <div class="school-name">${school.name}</div>
      <div class="school-sub">${school.city ? `${school.city} · ` : ''}${school.nit ? `NIT: ${school.nit}` : ''}</div>
    </div>
    <div style="text-align:right; font-size:9pt; color:#6b7280;">
      <div>Año Lectivo ${academicYear?.name || ''}</div>
      <div>Emitido: ${new Date().toLocaleDateString('es-CO')}</div>
    </div>
  </div>

  <div class="title">Boletín de Calificaciones</div>
  <div class="subtitle">${period.name}</div>

  <div class="info-box">
    <div class="info-item"><span class="info-label">Estudiante: </span>${student.first_name} ${student.last_name}</div>
    <div class="info-item"><span class="info-label">Documento: </span>${student.document_number || '—'}</div>
    <div class="info-item"><span class="info-label">Grado: </span>${classroom.name}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:60%">Materia</th>
        <th>Nota</th>
        <th>Nivel</th>
      </tr>
    </thead>
    <tbody>${subjectRows}</tbody>
    <tfoot>
      <tr>
        <td>Promedio del Período</td>
        <td style="text-align:center; font-family:monospace;">${parseFloat(periodAverage).toFixed(1)}</td>
        <td style="text-align:center; color:${level.cls === 'superior' ? '#16a34a' : level.cls === 'alto' ? '#2563eb' : level.cls === 'basico' ? '#d97706' : '#dc2626'};">
          ${level.label}
        </td>
      </tr>
    </tfoot>
  </table>

  ${comment ? `
  <div class="comment-box">
    <div class="comment-title">Observaciones del Director de Grupo</div>
    <div class="comment-text">${comment}</div>
  </div>
  ` : ''}

  <div class="signatures">
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">Director(a) de Grupo</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">Rector(a)</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">Firma Acudiente</div>
    </div>
  </div>

  <div class="footer">
    Documento generado automáticamente por el sistema académico · ${school.name} · ${new Date().getFullYear()}
  </div>

</body>
</html>`;
}

module.exports = { buildReportCardHtml };
