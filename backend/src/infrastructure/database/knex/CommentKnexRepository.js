'use strict';

const db = require('./config');
const { CommentRepository } = require('../../../domain/comments/CommentRepository');

/**
 * Implementación concreta del repositorio de comentarios usando Knex + PostgreSQL.
 */
class CommentKnexRepository extends CommentRepository {
  async findClassroomWithGradeLevel({ classroomId }) {
    return db('classrooms as c')
      .join('grade_levels as gl', 'gl.id', 'c.grade_level_id')
      .where('c.id', classroomId)
      .select('c.name as classroom_name', 'gl.name as grade_level')
      .first();
  }

  async findPeriod({ periodId, schoolId }) {
    return db('periods').where({ id: periodId, school_id: schoolId }).first();
  }

  async findSummariesWithStudents({ schoolId, classroomId, periodId }) {
    return db('student_period_summary as sps')
      .join('students as s', 's.id', 'sps.student_id')
      .where({ 'sps.school_id': schoolId, 'sps.classroom_id': classroomId, 'sps.period_id': periodId })
      .select(
        'sps.student_id', 'sps.period_average', 'sps.failed_subjects_count', 'sps.is_at_risk',
        's.first_name', 's.last_name'
      );
  }

  async findGradesWithSubjects({ schoolId, classroomId, periodId }) {
    return db('grades as g')
      .join('subjects as sub', 'sub.id', 'g.subject_id')
      .where({ 'g.school_id': schoolId, 'g.classroom_id': classroomId, 'g.period_id': periodId })
      .select('g.student_id', 'sub.name as subject_name', 'g.grade_value');
  }

  async upsertComments(comments) {
    for (const r of comments) {
      const { first_name, last_name, period_average, ...row } = r;
      await db('report_card_comments')
        .insert(row)
        .onConflict(['student_id', 'period_id'])
        .merge({
          ai_comment:    row.ai_comment,
          final_comment: db.raw(`CASE WHEN report_card_comments.status = 'approved' THEN report_card_comments.final_comment ELSE EXCLUDED.ai_comment END`),
          status:        db.raw(`CASE WHEN report_card_comments.status = 'approved' THEN 'approved' ELSE 'pending' END`),
        });
    }
  }

  async findComments({ schoolId, classroomId, periodId }) {
    return db('report_card_comments as rcc')
      .join('students as s', 's.id', 'rcc.student_id')
      .leftJoin('student_period_summary as sps', function() {
        this.on('sps.student_id', 'rcc.student_id').on('sps.period_id', 'rcc.period_id');
      })
      .where({ 'rcc.school_id': schoolId, 'rcc.classroom_id': classroomId, 'rcc.period_id': periodId })
      .select(
        'rcc.id', 'rcc.student_id', 'rcc.ai_comment', 'rcc.final_comment', 'rcc.status',
        's.first_name', 's.last_name', 's.document_number',
        'sps.period_average', 'sps.is_at_risk'
      )
      .orderBy('s.last_name');
  }

  async updateComment({ id, schoolId, finalComment, status, editedBy }) {
    const [updated] = await db('report_card_comments')
      .where({ id, school_id: schoolId })
      .update({ final_comment: finalComment, status, edited_by: editedBy, updated_at: db.fn.now() })
      .returning('*');
    return updated;
  }

  async approveAll({ schoolId, classroomId, periodId, editedBy }) {
    return db('report_card_comments')
      .where({ school_id: schoolId, classroom_id: classroomId, period_id: periodId, status: 'pending' })
      .update({ status: 'approved', edited_by: editedBy, final_comment: db.raw('ai_comment') });
  }
}

module.exports = { CommentKnexRepository };
