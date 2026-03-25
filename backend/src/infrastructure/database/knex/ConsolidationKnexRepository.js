'use strict';

const db = require('./config');
const { ConsolidationRepository } = require('../../../domain/consolidation/ConsolidationRepository');

/**
 * Implementación concreta del repositorio de consolidación usando Knex + PostgreSQL.
 * Toda la lógica de negocio (cálculo de promedios, niveles SIEE) vive en los use cases.
 * Este repositorio solo se encarga de persistencia y recuperación de datos.
 */
class ConsolidationKnexRepository extends ConsolidationRepository {
  async findPeriod({ periodId, schoolId }) {
    return db('periods').where({ id: periodId, school_id: schoolId }).first();
  }

  async findActiveStudents({ schoolId, classroomId, academicYearId }) {
    return db('students as s')
      .join('student_classroom as sc', 'sc.student_id', 's.id')
      .where({
        'sc.classroom_id':       classroomId,
        'sc.enrollment_status':  'active',
        'sc.academic_year_id':   academicYearId,
        's.school_id':           schoolId,
      })
      .select('s.id', 's.first_name', 's.last_name');
  }

  async findGrades({ schoolId, classroomId, periodId }) {
    return db('grades')
      .where({ school_id: schoolId, classroom_id: classroomId, period_id: periodId })
      .select('student_id', 'subject_id', 'grade_value');
  }

  async savePeriodSummaries(summaries) {
    await db('student_period_summary')
      .insert(summaries)
      .onConflict(['student_id', 'period_id'])
      .merge(['period_average', 'weighted_contribution', 'is_at_risk', 'failed_subjects_count']);
  }

  async findAllPeriodsForYear({ academicYearId, schoolId }) {
    return db('periods')
      .where({ academic_year_id: academicYearId, school_id: schoolId })
      .select('id');
  }

  async countPeriodSummaries({ schoolId, periodId, classroomId }) {
    const result = await db('student_period_summary')
      .where({ school_id: schoolId, period_id: periodId, classroom_id: classroomId })
      .count('id as c')
      .first();
    return parseInt(result.c);
  }

  async findPeriodSummariesForStudentInYear({ schoolId, studentId, periodIds }) {
    return db('student_period_summary')
      .whereIn('period_id', periodIds)
      .where({ student_id: studentId, school_id: schoolId })
      .select('weighted_contribution');
  }

  async saveYearSummary({ schoolId, studentId, academicYearId, yearAverage, sieeLevel, isPromoted }) {
    await db('student_year_summary')
      .insert({
        school_id:        schoolId,
        student_id:       studentId,
        academic_year_id: academicYearId,
        year_average:     yearAverage,
        siee_level:       sieeLevel,
        is_promoted:      isPromoted,
      })
      .onConflict(['student_id', 'academic_year_id'])
      .merge(['year_average', 'siee_level', 'is_promoted']);
  }

  async findSummaries({ schoolId, classroomId, periodId }) {
    return db('student_period_summary as sps')
      .join('students as s', 's.id', 'sps.student_id')
      .where({
        'sps.school_id':    schoolId,
        'sps.classroom_id': classroomId,
        'sps.period_id':    periodId,
      })
      .select('sps.*', 's.first_name', 's.last_name', 's.document_number')
      .orderBy('sps.period_average', 'desc');
  }
}

module.exports = { ConsolidationKnexRepository };
