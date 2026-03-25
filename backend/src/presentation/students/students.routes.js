'use strict';

const router = require('express').Router();
const { firebaseAuthMiddleware } = require('../middlewares/firebaseAuth.middleware');
const { tenantMiddleware }       = require('../middlewares/tenant.middleware');
const { roles }                  = require('../middlewares/roles.middleware');
const db                         = require('../../infrastructure/database/knex/config');

const auth = [firebaseAuthMiddleware, tenantMiddleware];

/** GET /api/v1/students?classroomId=&academicYearId= */
router.get('/', ...auth, roles('teacher', 'coordinator', 'school_admin'), async (req, res, next) => {
  try {
    const { classroomId, academicYearId } = req.query;

    let query = db('students as s')
      .where({ 's.school_id': req.schoolId, 's.is_active': true });

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
    const { firstName, lastName, documentType = 'TI', documentNumber, dateOfBirth, gender } = req.body;
    const [student] = await db('students').insert({
      school_id:       req.schoolId,
      first_name:      firstName,
      last_name:       lastName,
      document_type:   documentType,
      document_number: documentNumber,
      date_of_birth:   dateOfBirth,
      gender,
    }).returning('*');
    res.status(201).json({ data: student });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Estudiante ya existe con ese documento.' });
    next(err);
  }
});

module.exports = router;
