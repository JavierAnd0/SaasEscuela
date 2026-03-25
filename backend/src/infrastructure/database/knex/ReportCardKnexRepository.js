'use strict';

const db = require('./config');
const { ReportCardRepository } = require('../../../domain/report-cards/ReportCardRepository');

/**
 * Implementación concreta del repositorio de boletines usando Knex + PostgreSQL.
 */
class ReportCardKnexRepository extends ReportCardRepository {
  async findSchool({ schoolId }) {
    return db('schools').where('id', schoolId).first();
  }

  async findPeriod({ periodId, schoolId }) {
    return db('periods').where({ id: periodId, school_id: schoolId }).first();
  }

  async findAcademicYear({ id, schoolId }) {
    return db('academic_years').where({ id, school_id: schoolId }).first();
  }

  async findClassroom({ id, schoolId }) {
    return db('classrooms').where({ id, school_id: schoolId }).first();
  }

  async findStudentsWithSummaries({ schoolId, classroomId, periodId, academicYearId }) {
    return db('students as s')
      .join('student_classroom as sc', 'sc.student_id', 's.id')
      .leftJoin('student_period_summary as sps', function() {
        this.on('sps.student_id', 's.id').on('sps.period_id', db.raw('?', [periodId]));
      })
      .where({
        'sc.classroom_id':      classroomId,
        'sc.enrollment_status': 'active',
        'sc.academic_year_id':  academicYearId,
        's.school_id':          schoolId,
      })
      .select('s.id', 's.first_name', 's.last_name', 's.document_number', 'sps.period_average');
  }

  async findGradesWithSubjects({ schoolId, classroomId, periodId }) {
    return db('grades as g')
      .join('subjects as sub', 'sub.id', 'g.subject_id')
      .where({ 'g.school_id': schoolId, 'g.classroom_id': classroomId, 'g.period_id': periodId })
      .select('g.student_id', 'sub.name', 'g.grade_value')
      .orderBy('sub.name');
  }

  async findApprovedComments({ schoolId, classroomId, periodId }) {
    return db('report_card_comments')
      .where({ school_id: schoolId, classroom_id: classroomId, period_id: periodId, status: 'approved' })
      .select('student_id', 'final_comment');
  }

  async saveReportCard({ schoolId, studentId, classroomId, periodId, pdfUrl, accessToken }) {
    await db('report_cards')
      .insert({ school_id: schoolId, student_id: studentId, classroom_id: classroomId,
                period_id: periodId, pdf_url: pdfUrl, access_token: accessToken, status: 'generated' })
      .onConflict(['student_id', 'period_id'])
      .merge(['pdf_url', 'access_token', 'status']);
  }

  async findReportCards({ schoolId, classroomId, periodId }) {
    return db('report_cards as rc')
      .join('students as s', 's.id', 'rc.student_id')
      .leftJoin('delivery_logs as dl', function() {
        this.on('dl.student_id', 'rc.student_id')
            .on('dl.period_id',  'rc.period_id')
            .on('dl.status',     db.raw("'sent'"));
      })
      .where({ 'rc.school_id': schoolId, 'rc.classroom_id': classroomId, 'rc.period_id': periodId })
      .select(
        'rc.id', 'rc.student_id', 'rc.pdf_url', 'rc.access_token', 'rc.status',
        's.first_name', 's.last_name', 's.document_number',
        db.raw('dl.id IS NOT NULL as delivered')
      )
      .orderBy('s.last_name');
  }

  async findByToken(token) {
    return db('report_cards').where({ access_token: token }).first();
  }
}

module.exports = { ReportCardKnexRepository };
