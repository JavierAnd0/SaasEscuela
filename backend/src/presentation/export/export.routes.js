'use strict';

const router  = require('express').Router();
const ExcelJS = require('exceljs');
const db      = require('../../infrastructure/database/knex/config');
const { auth }  = require('../middlewares/authMiddlewares');
const { roles } = require('../middlewares/roles.middleware');

// ─── helpers ──────────────────────────────────────────────────────────────────

function styleHeader(worksheet, colCount) {
  const headerRow = worksheet.getRow(1);
  for (let i = 1; i <= colCount; i++) {
    const cell = headerRow.getCell(i);
    cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF666CFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border    = {
      bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    };
  }
  headerRow.height = 22;
}

function styleRows(worksheet, startRow, endRow, colCount) {
  for (let r = startRow; r <= endRow; r++) {
    const row = worksheet.getRow(r);
    for (let c = 1; c <= colCount; c++) {
      const cell = row.getCell(c);
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        bottom: { style: 'hair', color: { argb: 'FFE0E0E0' } },
      };
    }
    row.height = 18;
  }
}

function sendWorkbook(res, workbook, filename) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return workbook.xlsx.write(res).then(() => res.end());
}

// ─── GET /api/v1/export/students ──────────────────────────────────────────────
// Query params: classroomId?, search?, includeInactive?
router.get(
  '/students',
  ...auth,
  roles('coordinator', 'school_admin'),
  async (req, res, next) => {
    try {
      const { classroomId, search, includeInactive } = req.query;
      const schoolId = req.schoolId;

      let query = db('students as s')
        .where('s.school_id', schoolId)
        .select(
          's.id',
          's.first_name',
          's.last_name',
          's.document_type',
          's.document_number',
          's.date_of_birth',
          's.gender',
          's.parent_name',
          's.parent_phone',
          's.parent_email',
          's.parent_document_number',
          's.is_active',
          db.raw('NULL as classroom_name')
        )
        .orderBy(['s.last_name', 's.first_name']);

      if (includeInactive !== 'true') {
        query = query.where('s.is_active', true);
      }
      if (classroomId) {
        query = query
          .join('student_classroom as sc', function () {
            this.on('sc.student_id', '=', 's.id')
              .andOnVal('sc.classroom_id', classroomId)
              .andOnVal('sc.enrollment_status', 'active');
          })
          .join('classrooms as c', 'c.id', 'sc.classroom_id')
          .select(db.raw('"c"."name" as "classroom_name"'));
      }
      if (search) {
        const term = `%${search}%`;
        query = query.where(function () {
          this.whereILike('s.first_name', term)
            .orWhereILike('s.last_name', term)
            .orWhereILike('s.document_number', term);
        });
      }

      const rows = await query;

      const workbook  = new ExcelJS.Workbook();
      workbook.creator = 'SaasEscuela';
      const ws = workbook.addWorksheet('Estudiantes');

      ws.columns = [
        { header: 'Apellidos',        key: 'last_name',               width: 20 },
        { header: 'Nombres',          key: 'first_name',              width: 20 },
        { header: 'Tipo Doc.',        key: 'document_type',           width: 10 },
        { header: 'Documento',        key: 'document_number',         width: 15 },
        { header: 'Fecha Nac.',       key: 'date_of_birth',           width: 13 },
        { header: 'Género',           key: 'gender',                  width: 10 },
        { header: 'Acudiente',        key: 'parent_name',             width: 22 },
        { header: 'Tel. Acudiente',   key: 'parent_phone',            width: 15 },
        { header: 'Email Acudiente',  key: 'parent_email',            width: 28 },
        { header: 'CC Acudiente',     key: 'parent_document_number',  width: 15 },
        { header: 'Grupo',            key: 'classroom_name',          width: 12 },
        { header: 'Activo',           key: 'is_active',               width: 8  },
      ];

      rows.forEach(r => {
        ws.addRow({
          ...r,
          date_of_birth: r.date_of_birth ? new Date(r.date_of_birth).toLocaleDateString('es-CO') : '',
          is_active:     r.is_active ? 'Sí' : 'No',
        });
      });

      styleHeader(ws, ws.columns.length);
      styleRows(ws, 2, rows.length + 1, ws.columns.length);

      await sendWorkbook(res, workbook, `estudiantes_${Date.now()}.xlsx`);
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/v1/export/consolidation ─────────────────────────────────────────
// Query params: classroomId (required), periodId (required)
router.get(
  '/consolidation',
  ...auth,
  roles('coordinator', 'school_admin'),
  async (req, res, next) => {
    try {
      const { classroomId, periodId } = req.query;
      const schoolId = req.schoolId;

      if (!classroomId || !periodId) {
        return res.status(400).json({ error: 'classroomId y periodId son requeridos.' });
      }

      const rows = await db('student_period_summary as sps')
        .join('students as s', 's.id', 'sps.student_id')
        .leftJoin('classrooms as c', 'c.id', db.raw('?', [classroomId]))
        .leftJoin('academic_periods as ap', 'ap.id', 'sps.period_id')
        .where({
          'sps.school_id':    schoolId,
          'sps.classroom_id': classroomId,
          'sps.period_id':    periodId,
        })
        .select(
          'sps.rank',
          's.first_name',
          's.last_name',
          's.document_number',
          'sps.period_average',
          'sps.failed_subjects_count',
          'sps.is_at_risk',
          'ap.name as period_name'
        )
        .orderBy('sps.rank');

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'SaasEscuela';
      const ws = workbook.addWorksheet('Consolidado');

      ws.columns = [
        { header: 'Puesto',          key: 'rank',                  width: 8  },
        { header: 'Apellidos',       key: 'last_name',             width: 20 },
        { header: 'Nombres',         key: 'first_name',            width: 20 },
        { header: 'Documento',       key: 'document_number',       width: 15 },
        { header: 'Promedio',        key: 'period_average',        width: 10 },
        { header: 'Mat. Perdidas',   key: 'failed_subjects_count', width: 14 },
        { header: 'En Riesgo',       key: 'is_at_risk',            width: 10 },
        { header: 'Período',         key: 'period_name',           width: 18 },
      ];

      rows.forEach((r, idx) => {
        const rowData = {
          ...r,
          period_average: r.period_average !== null ? Number(r.period_average) : '',
          is_at_risk:     r.is_at_risk ? 'Sí' : 'No',
        };
        const exRow = ws.addRow(rowData);

        // Highlight at-risk rows in red
        if (r.is_at_risk) {
          for (let c = 1; c <= ws.columns.length; c++) {
            exRow.getCell(c).fill = {
              type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' },
            };
            exRow.getCell(c).font = { color: { argb: 'FF991B1B' } };
          }
        }
      });

      styleHeader(ws, ws.columns.length);
      styleRows(ws, 2, rows.length + 1, ws.columns.length);

      await sendWorkbook(res, workbook, `consolidado_${Date.now()}.xlsx`);
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/v1/export/attendance ────────────────────────────────────────────
// Query params: classroomId (required), periodId (required)
router.get(
  '/attendance',
  ...auth,
  roles('coordinator', 'school_admin'),
  async (req, res, next) => {
    try {
      const { classroomId, periodId } = req.query;
      const schoolId = req.schoolId;

      if (!classroomId || !periodId) {
        return res.status(400).json({ error: 'classroomId y periodId son requeridos.' });
      }

      const rows = await db('attendance_records as ar')
        .join('students as s', 's.id', 'ar.student_id')
        .where({
          'ar.school_id':    schoolId,
          'ar.classroom_id': classroomId,
          'ar.period_id':    periodId,
        })
        .groupBy('ar.student_id', 's.first_name', 's.last_name', 's.document_number')
        .select(
          's.last_name',
          's.first_name',
          's.document_number',
          db.raw(`COUNT(*) FILTER (WHERE ar.status = 'present')            AS present_count`),
          db.raw(`COUNT(*) FILTER (WHERE ar.status = 'absent_justified')   AS absent_justified_count`),
          db.raw(`COUNT(*) FILTER (WHERE ar.status = 'absent_unjustified') AS absent_unjustified_count`),
          db.raw(`COUNT(*) FILTER (WHERE ar.status = 'late')               AS late_count`),
          db.raw(`COUNT(*)                                                  AS total_days`),
          db.raw(`ROUND(COUNT(*) FILTER (WHERE ar.status = 'present') * 100.0 / NULLIF(COUNT(*), 0), 1) AS attendance_rate`)
        )
        .orderBy(['s.last_name', 's.first_name']);

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'SaasEscuela';
      const ws = workbook.addWorksheet('Asistencia');

      ws.columns = [
        { header: 'Apellidos',         key: 'last_name',                 width: 20 },
        { header: 'Nombres',           key: 'first_name',                width: 20 },
        { header: 'Documento',         key: 'document_number',           width: 15 },
        { header: 'Presentes',         key: 'present_count',             width: 12 },
        { header: 'Aus. Justificadas', key: 'absent_justified_count',    width: 18 },
        { header: 'Aus. Injustif.',    key: 'absent_unjustified_count',  width: 15 },
        { header: 'Tardanzas',         key: 'late_count',                width: 12 },
        { header: 'Total Días',        key: 'total_days',                width: 11 },
        { header: '% Asistencia',      key: 'attendance_rate',           width: 13 },
      ];

      rows.forEach(r => {
        ws.addRow({
          ...r,
          present_count:             Number(r.present_count),
          absent_justified_count:    Number(r.absent_justified_count),
          absent_unjustified_count:  Number(r.absent_unjustified_count),
          late_count:                Number(r.late_count),
          total_days:                Number(r.total_days),
          attendance_rate:           r.attendance_rate !== null ? Number(r.attendance_rate) : '',
        });
      });

      styleHeader(ws, ws.columns.length);
      styleRows(ws, 2, rows.length + 1, ws.columns.length);

      await sendWorkbook(res, workbook, `asistencia_${Date.now()}.xlsx`);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
