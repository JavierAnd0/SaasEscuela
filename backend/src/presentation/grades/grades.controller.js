'use strict';

const { GradeKnexRepository } = require('../../infrastructure/database/knex/GradeKnexRepository');
const { Grade } = require('../../domain/grades/Grade');
const { ValidationError } = require('../middlewares/errorHandler.middleware');

const gradeRepo = new GradeKnexRepository();

/**
 * POST /api/v1/grades/bulk
 * Docente ingresa todas las notas de su materia para un grupo/período
 */
async function bulkSave(req, res, next) {
  try {
    // Usa el UUID interno de PostgreSQL, no el UID de Firebase
    const teacherId = req.user.dbId;
    if (!teacherId) {
      return res.status(403).json({ error: 'Perfil de usuario incompleto. Contacte al administrador.' });
    }

    const { classroomId, subjectId, periodId, grades: gradeList } = req.body;

    const domainGrades = gradeList.map(g => {
      const grade = new Grade({
        schoolId:    req.schoolId,
        studentId:   g.studentId,
        subjectId,
        classroomId,
        periodId,
        teacherId,
        gradeValue:  g.gradeValue,
        entryMethod: 'web',
      });
      const errors = grade.validate();
      if (errors.length > 0) throw new ValidationError(errors.join('; '));
      return grade;
    });

    const saved = await gradeRepo.saveMany(domainGrades);
    res.status(201).json({ data: saved, count: saved.length });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/grades
 * ?classroomId=&subjectId=&periodId= → notas del docente para ese grupo
 * ?studentId=&periodId= → todas las notas de un estudiante en el período
 */
async function getGrades(req, res, next) {
  try {
    const { classroomId, subjectId, studentId, periodId } = req.query;

    if (classroomId && subjectId && periodId) {
      const grades = await gradeRepo.findByClassroomSubjectPeriod({
        schoolId: req.schoolId, classroomId, subjectId, periodId,
      });
      return res.json({ data: grades });
    }

    if (studentId && periodId) {
      const grades = await gradeRepo.findByStudentAndPeriod({
        schoolId: req.schoolId, studentId, periodId,
      });
      return res.json({ data: grades });
    }

    res.status(400).json({ error: 'Use classroomId+subjectId+periodId o studentId+periodId.' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/grades/entry-status
 * ?periodId= (&classroomId=) → estado de ingreso por docente para el coordinador
 */
async function getEntryStatus(req, res, next) {
  try {
    const { periodId, classroomId } = req.query;
    if (!periodId) return res.status(400).json({ error: 'periodId es requerido.' });

    const status = await gradeRepo.getEntryStatus({
      schoolId: req.schoolId, periodId, classroomId,
    });
    res.json({ data: status });
  } catch (err) {
    next(err);
  }
}

module.exports = { bulkSave, getGrades, getEntryStatus };
