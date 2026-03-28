'use strict';

const router   = require('express').Router();
const Papa     = require('papaparse');
const pLimit   = require('p-limit');
const { auth }  = require('../middlewares/authMiddlewares');
const { roles } = require('../middlewares/roles.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
  CreateStudentSchema,
  UpdateStudentSchema,
  EnrollSchema,
  StudentQuerySchema,
} = require('./students.schema');
const db = require('../../infrastructure/database/knex/config');

// Límite de concurrencia para inserciones CSV (protege la conexión pool)
const csvLimit = pLimit(10);

const CSV_MAX_ROWS   = 500;
const CSV_REQUIRED   = ['firstName', 'lastName', 'documentNumber'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convierte un objeto de body a columnas de BD para insert/update */
function toDbColumns(body) {
  const map = {
    firstName:            'first_name',
    lastName:             'last_name',
    documentType:         'document_type',
    documentNumber:       'document_number',
    dateOfBirth:          'date_of_birth',
    gender:               'gender',
    parentName:           'parent_name',
    parentEmail:          'parent_email',
    parentPhone:          'parent_phone',
    parentDocumentNumber: 'parent_document_number',
  };
  const cols = {};
  for (const [jsKey, dbCol] of Object.entries(map)) {
    if (body[jsKey] !== undefined) {
      cols[dbCol] = body[jsKey] ?? null;
    }
  }
  return cols;
}

// ─── GET /api/v1/students ─────────────────────────────────────────────────────
/**
 * Lista paginada de estudiantes con búsqueda server-side.
 * ?classroomId= &academicYearId= &includeInactive= &page= &limit= &search=
 */
router.get('/',
  ...auth,
  roles('teacher', 'coordinator', 'school_admin'),
  validate(StudentQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { classroomId, academicYearId, includeInactive, page, limit, search } = req.query;
      const offset = (page - 1) * limit;

      let query = db('students as s').where('s.school_id', req.schoolId);

      if (!includeInactive) query = query.where('s.is_active', true);

      if (classroomId) {
        query = query
          .join('student_classroom as sc', 'sc.student_id', 's.id')
          .where('sc.classroom_id', classroomId)
          .where('sc.enrollment_status', 'active');
        if (academicYearId) query = query.where('sc.academic_year_id', academicYearId);
      }

      if (search) {
        const term = `%${search}%`;
        query = query.where((qb) =>
          qb
            .whereILike('s.first_name',      term)
            .orWhereILike('s.last_name',      term)
            .orWhereILike('s.document_number', term)
        );
      }

      // Total para paginación (sin limit/offset)
      const countQuery = query.clone().count('s.id as total').first();
      const [{ total }, students] = await Promise.all([
        countQuery,
        query
          .clone()
          .select(
            's.id', 's.first_name', 's.last_name', 's.document_type', 's.document_number',
            's.date_of_birth', 's.gender', 's.is_active', 's.enrollment_date',
            's.parent_name', 's.parent_email', 's.parent_phone', 's.parent_document_number',
            's.created_at', 's.updated_at'
          )
          .orderBy('s.last_name', 'asc')
          .orderBy('s.first_name', 'asc')
          .limit(limit)
          .offset(offset),
      ]);

      res.json({
        data: students,
        meta: {
          total:    parseInt(total, 10),
          page,
          limit,
          pages:    Math.ceil(parseInt(total, 10) / limit),
        },
      });
    } catch (err) { next(err); }
  }
);

// ─── GET /api/v1/students/:id ─────────────────────────────────────────────────

router.get('/:id',
  ...auth,
  roles('teacher', 'coordinator', 'school_admin'),
  async (req, res, next) => {
    try {
      const student = await db('students')
        .where({ id: req.params.id, school_id: req.schoolId })
        .first();
      if (!student) return res.status(404).json({ error: 'Estudiante no encontrado.' });
      res.json({ data: student });
    } catch (err) { next(err); }
  }
);

// ─── POST /api/v1/students ────────────────────────────────────────────────────

router.post('/',
  ...auth,
  roles('school_admin', 'coordinator'),
  validate(CreateStudentSchema),
  async (req, res, next) => {
    try {
      const docType  = req.body.documentType  || 'TI';
      const docNum   = req.body.documentNumber.trim();
      const parentDoc = req.body.parentDocumentNumber?.trim() || null;

      // 1. Verificar unicidad del documento del estudiante
      const dup = await db('students')
        .where({ school_id: req.schoolId, document_type: docType, document_number: docNum })
        .first('id');
      if (dup) {
        return res.status(409).json({
          error: `Ya existe un estudiante con ${docType} ${docNum} en este colegio.`,
          field: 'documentNumber',
        });
      }

      // 2. Verificar que el documento del acudiente no corresponda a un estudiante registrado
      if (parentDoc) {
        const clash = await db('students')
          .where({ school_id: req.schoolId })
          .whereRaw('document_number = ?', [parentDoc])
          .first('id', 'first_name', 'last_name', 'document_type');
        if (clash) {
          return res.status(422).json({
            error: `El documento del acudiente (${parentDoc}) pertenece a un estudiante ya registrado: ${clash.first_name} ${clash.last_name} (${clash.document_type} ${parentDoc}).`,
            field: 'parentDocumentNumber',
          });
        }
      }

      const [student] = await db('students')
        .insert({ school_id: req.schoolId, ...toDbColumns(req.body) })
        .returning('*');
      res.status(201).json({ data: student });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Ya existe un estudiante con ese número de documento.' });
      }
      next(err);
    }
  }
);

// ─── PUT /api/v1/students/:id ─────────────────────────────────────────────────

router.put('/:id',
  ...auth,
  roles('school_admin', 'coordinator'),
  validate(UpdateStudentSchema),
  async (req, res, next) => {
    try {
      const current = await db('students')
        .where({ id: req.params.id, school_id: req.schoolId })
        .first();
      if (!current) return res.status(404).json({ error: 'Estudiante no encontrado.' });

      // Valores resultantes tras el update (mezcla de lo que viene y lo que ya existe)
      const docType  = req.body.documentType   ?? current.document_type;
      const docNum   = (req.body.documentNumber ?? current.document_number).trim();
      const parentDoc = req.body.parentDocumentNumber !== undefined
        ? (req.body.parentDocumentNumber?.trim() || null)
        : current.parent_document_number;

      // 1. Unicidad del documento del estudiante (excluyendo el propio registro)
      if (req.body.documentNumber !== undefined || req.body.documentType !== undefined) {
        const dup = await db('students')
          .where({ school_id: req.schoolId, document_type: docType, document_number: docNum })
          .whereNot('id', req.params.id)
          .first('id');
        if (dup) {
          return res.status(409).json({
            error: `Ya existe otro estudiante con ${docType} ${docNum} en este colegio.`,
            field: 'documentNumber',
          });
        }
      }

      // 2. El documento del acudiente no puede corresponder a otro estudiante
      if (parentDoc && req.body.parentDocumentNumber !== undefined) {
        const clash = await db('students')
          .where({ school_id: req.schoolId })
          .whereRaw('document_number = ?', [parentDoc])
          .whereNot('id', req.params.id)
          .first('id', 'first_name', 'last_name', 'document_type');
        if (clash) {
          return res.status(422).json({
            error: `El documento del acudiente (${parentDoc}) pertenece a un estudiante ya registrado: ${clash.first_name} ${clash.last_name} (${clash.document_type} ${parentDoc}).`,
            field: 'parentDocumentNumber',
          });
        }
      }

      const [student] = await db('students')
        .where({ id: req.params.id, school_id: req.schoolId })
        .update(toDbColumns(req.body))
        .returning('*');
      res.json({ data: student });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Ya existe un estudiante con ese número de documento.' });
      }
      next(err);
    }
  }
);

// ─── DELETE /api/v1/students/:id  (soft delete — toggle is_active) ────────────

router.delete('/:id',
  ...auth,
  roles('school_admin', 'coordinator'),
  async (req, res, next) => {
    try {
      const student = await db('students')
        .where({ id: req.params.id, school_id: req.schoolId })
        .first();
      if (!student) return res.status(404).json({ error: 'Estudiante no encontrado.' });

      const [updated] = await db('students')
        .where({ id: req.params.id, school_id: req.schoolId })
        .update({ is_active: !student.is_active })
        .returning('*');

      res.json({ data: updated });
    } catch (err) { next(err); }
  }
);

// ─── POST /api/v1/students/:id/enroll ────────────────────────────────────────

router.post('/:id/enroll',
  ...auth,
  roles('school_admin', 'coordinator'),
  validate(EnrollSchema),
  async (req, res, next) => {
    try {
      const { classroomId, academicYearId } = req.body;

      const [classroom, student] = await Promise.all([
        db('classrooms').where({ id: classroomId, school_id: req.schoolId }).first(),
        db('students').where({ id: req.params.id, school_id: req.schoolId }).first(),
      ]);

      if (!classroom) return res.status(404).json({ error: 'Grupo no encontrado.' });
      if (!student)   return res.status(404).json({ error: 'Estudiante no encontrado.' });

      const [enrollment] = await db('student_classroom')
        .insert({
          student_id:        req.params.id,
          classroom_id:      classroomId,
          academic_year_id:  academicYearId,
          enrollment_status: 'active',
        })
        .onConflict(['student_id', 'classroom_id', 'academic_year_id'])
        .merge({ enrollment_status: 'active' })
        .returning('*');

      res.status(201).json({ data: enrollment });
    } catch (err) { next(err); }
  }
);

// ─── POST /api/v1/students/import-csv ────────────────────────────────────────
/**
 * Importación masiva desde CSV.
 * Límite: 500 filas por importación.
 * Columnas soportadas (case-insensitive):
 *   firstName, lastName, documentType, documentNumber,
 *   dateOfBirth, gender, parentName, parentEmail, parentPhone, parentDocumentNumber
 *
 * Responde: { imported, skipped, errors: [{ row, reason }], total }
 */
router.post('/import-csv',
  ...auth,
  roles('school_admin', 'coordinator'),
  async (req, res, next) => {
    try {
      const { csv } = req.body;
      if (!csv || typeof csv !== 'string') {
        return res.status(400).json({ error: 'Se requiere el campo "csv" con el contenido del archivo.' });
      }

      const { data: rows, errors: parseErrors } = Papa.parse(csv.trim(), {
        header:          true,
        skipEmptyLines:  true,
        transformHeader: (h) => h.trim(),
      });

      if (parseErrors.length > 0 && rows.length === 0) {
        return res.status(422).json({ error: 'El CSV no pudo ser procesado. Verifique el formato.' });
      }

      if (rows.length > CSV_MAX_ROWS) {
        return res.status(422).json({
          error: `El archivo excede el límite de ${CSV_MAX_ROWS} filas por importación. Divídalo en varios archivos.`,
        });
      }

      const imported  = [];
      const skipped   = [];
      const errorLog  = [];

      const tasks = rows.map((row, i) => csvLimit(async () => {
        const rowNum  = i + 2;
        const missing = CSV_REQUIRED.filter((f) => !row[f]?.trim());

        if (missing.length > 0) {
          errorLog.push({ row: rowNum, reason: `Campos requeridos faltantes: ${missing.join(', ')}` });
          return;
        }

        const parentDocNum = row.parentDocumentNumber?.trim() || null;
        const studentDocNum = row.documentNumber.trim();

        if (parentDocNum && parentDocNum === studentDocNum) {
          errorLog.push({ row: rowNum, reason: 'El documento del acudiente no puede ser igual al del estudiante.' });
          return;
        }

        const record = {
          school_id:              req.schoolId,
          first_name:             row.firstName.trim(),
          last_name:              row.lastName.trim(),
          document_type:          (row.documentType?.trim() || 'TI').toUpperCase(),
          document_number:        row.documentNumber.trim(),
          date_of_birth:          row.dateOfBirth?.trim()          || null,
          gender:                 row.gender?.trim()               || null,
          parent_name:            row.parentName?.trim()           || null,
          parent_email:           row.parentEmail?.trim()          || null,
          parent_phone:           row.parentPhone?.trim()          || null,
          parent_document_number: row.parentDocumentNumber?.trim() || null,
        };

        try {
          const result = await db('students')
            .insert(record)
            .onConflict(['school_id', 'document_type', 'document_number'])
            .ignore()
            .returning('id');

          // onConflict().ignore() retorna [] si hubo conflicto
          if (result.length > 0) {
            imported.push(record.document_number);
          } else {
            skipped.push(record.document_number);
          }
        } catch (dbErr) {
          errorLog.push({ row: rowNum, reason: dbErr.message });
        }
      }));

      await Promise.all(tasks);

      res.json({
        data: {
          imported: imported.length,
          skipped:  skipped.length,
          errors:   errorLog,
          total:    rows.length,
        },
      });
    } catch (err) { next(err); }
  }
);

module.exports = router;
