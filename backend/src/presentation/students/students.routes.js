'use strict';

const router    = require('express').Router();
const Papa      = require('papaparse');
const { auth }  = require('../middlewares/authMiddlewares');
const { roles } = require('../middlewares/roles.middleware');
const db        = require('../../infrastructure/database/knex/config');

/** GET /api/v1/students?classroomId=&academicYearId=&includeInactive= */
router.get('/', ...auth, roles('teacher', 'coordinator', 'school_admin'), async (req, res, next) => {
  try {
    const { classroomId, academicYearId, includeInactive } = req.query;

    let query = db('students as s')
      .where('s.school_id', req.schoolId);

    if (!includeInactive) query = query.where('s.is_active', true);

    if (classroomId) {
      query = query
        .join('student_classroom as sc', 'sc.student_id', 's.id')
        .where('sc.classroom_id', classroomId)
        .where('sc.enrollment_status', 'active');
      if (academicYearId) query = query.where('sc.academic_year_id', academicYearId);
    }

    const students = await query
      .select('s.*')
      .orderBy('s.last_name', 'asc');

    res.json({ data: students });
  } catch (err) { next(err); }
});

/** GET /api/v1/students/:id */
router.get('/:id', ...auth, roles('teacher', 'coordinator', 'school_admin'), async (req, res, next) => {
  try {
    const student = await db('students')
      .where({ id: req.params.id, school_id: req.schoolId })
      .first();
    if (!student) return res.status(404).json({ error: 'Estudiante no encontrado.' });
    res.json({ data: student });
  } catch (err) { next(err); }
});

/** POST /api/v1/students */
router.post('/', ...auth, roles('school_admin', 'coordinator'), async (req, res, next) => {
  try {
    const {
      firstName, lastName, documentType = 'TI', documentNumber,
      dateOfBirth, gender, parentName, parentEmail, parentPhone,
    } = req.body;
    const [student] = await db('students').insert({
      school_id:       req.schoolId,
      first_name:      firstName,
      last_name:       lastName,
      document_type:   documentType,
      document_number: documentNumber,
      date_of_birth:   dateOfBirth || null,
      gender:          gender || null,
      parent_name:     parentName  || null,
      parent_email:    parentEmail || null,
      parent_phone:    parentPhone || null,
    }).returning('*');
    res.status(201).json({ data: student });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Estudiante ya existe con ese documento.' });
    next(err);
  }
});

/** PUT /api/v1/students/:id */
router.put('/:id', ...auth, roles('school_admin', 'coordinator'), async (req, res, next) => {
  try {
    const {
      firstName, lastName, documentType, documentNumber,
      dateOfBirth, gender, parentName, parentEmail, parentPhone,
    } = req.body;

    const updates = {};
    if (firstName     !== undefined) updates.first_name      = firstName;
    if (lastName      !== undefined) updates.last_name       = lastName;
    if (documentType  !== undefined) updates.document_type   = documentType;
    if (documentNumber !== undefined) updates.document_number = documentNumber;
    if (dateOfBirth   !== undefined) updates.date_of_birth   = dateOfBirth || null;
    if (gender        !== undefined) updates.gender          = gender || null;
    if (parentName    !== undefined) updates.parent_name     = parentName || null;
    if (parentEmail   !== undefined) updates.parent_email    = parentEmail || null;
    if (parentPhone   !== undefined) updates.parent_phone    = parentPhone || null;

    const [student] = await db('students')
      .where({ id: req.params.id, school_id: req.schoolId })
      .update(updates)
      .returning('*');

    if (!student) return res.status(404).json({ error: 'Estudiante no encontrado.' });
    res.json({ data: student });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un estudiante con ese documento.' });
    next(err);
  }
});

/** DELETE /api/v1/students/:id  (soft delete — toggle is_active) */
router.delete('/:id', ...auth, roles('school_admin', 'coordinator'), async (req, res, next) => {
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
});

/** POST /api/v1/students/:id/enroll  —  matricular en un grupo */
router.post('/:id/enroll', ...auth, roles('school_admin', 'coordinator'), async (req, res, next) => {
  try {
    const { classroomId, academicYearId } = req.body;
    if (!classroomId || !academicYearId) {
      return res.status(400).json({ error: 'classroomId y academicYearId son requeridos.' });
    }

    // Verify classroom belongs to school
    const classroom = await db('classrooms')
      .where({ id: classroomId, school_id: req.schoolId })
      .first();
    if (!classroom) return res.status(404).json({ error: 'Grupo no encontrado.' });

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
});

/**
 * POST /api/v1/students/import-csv
 * Body: { csv: "<texto CSV>" }
 *
 * Columnas esperadas (case-insensitive, orden libre):
 *   firstName, lastName, documentType, documentNumber,
 *   dateOfBirth, gender, parentName, parentEmail, parentPhone
 *
 * Responde: { imported, skipped, errors: [{ row, reason }] }
 */
router.post('/import-csv', ...auth, roles('school_admin', 'coordinator'), async (req, res, next) => {
  try {
    const { csv } = req.body;
    if (!csv || typeof csv !== 'string') {
      return res.status(400).json({ error: 'Se requiere el campo "csv" con el contenido del archivo.' });
    }

    const { data: rows, errors: parseErrors } = Papa.parse(csv.trim(), {
      header:         true,
      skipEmptyLines: true,
      transformHeader: h => h.trim(),
    });

    if (parseErrors.length > 0 && rows.length === 0) {
      return res.status(422).json({ error: 'El CSV no pudo ser procesado. Verifique el formato.' });
    }

    const REQUIRED = ['firstName', 'lastName', 'documentNumber'];
    const imported = [];
    const skipped  = [];
    const errorLog = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2: fila 1 = encabezado

      // Validar campos obligatorios
      const missing = REQUIRED.filter(f => !row[f]?.trim());
      if (missing.length > 0) {
        errorLog.push({ row: rowNum, reason: `Campos requeridos faltantes: ${missing.join(', ')}` });
        continue;
      }

      const record = {
        school_id:       req.schoolId,
        first_name:      row.firstName.trim(),
        last_name:       row.lastName.trim(),
        document_type:   (row.documentType?.trim()  || 'TI').toUpperCase(),
        document_number: row.documentNumber.trim(),
        date_of_birth:   row.dateOfBirth?.trim()  || null,
        gender:          row.gender?.trim()        || null,
        parent_name:     row.parentName?.trim()    || null,
        parent_email:    row.parentEmail?.trim()   || null,
        parent_phone:    row.parentPhone?.trim()   || null,
      };

      try {
        await db('students')
          .insert(record)
          .onConflict(['school_id', 'document_number'])
          .ignore();   // silenciar duplicados — contar como skipped
        imported.push(record.document_number);
      } catch (dbErr) {
        if (dbErr.code === '23505') {
          skipped.push(record.document_number);
        } else {
          errorLog.push({ row: rowNum, reason: dbErr.message });
        }
      }
    }

    // Calcular skipped real: filas ignoradas por onConflict no lanzan error,
    // así que recalculamos con el total parseado
    const totalProcessed = rows.length - errorLog.length;
    const actualImported = imported.length;
    const actualSkipped  = totalProcessed - actualImported + skipped.length;

    res.json({
      data: {
        imported: actualImported,
        skipped:  actualSkipped,
        errors:   errorLog,
        total:    rows.length,
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
