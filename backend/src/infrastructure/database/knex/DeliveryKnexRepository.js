'use strict';

const db = require('./config');
const { DeliveryRepository } = require('../../../domain/delivery/DeliveryRepository');

/**
 * Implementación concreta del repositorio de entrega usando Knex + PostgreSQL.
 */
class DeliveryKnexRepository extends DeliveryRepository {
  async findSchool({ schoolId }) {
    return db('schools').where('id', schoolId).first();
  }

  async findPeriod({ periodId, schoolId }) {
    return db('periods').where({ id: periodId, school_id: schoolId }).first();
  }

  async findGeneratedCards({ schoolId, classroomId, periodId }) {
    return db('report_cards as rc')
      .join('students as s', 's.id', 'rc.student_id')
      .where({ 'rc.school_id': schoolId, 'rc.classroom_id': classroomId,
               'rc.period_id': periodId, 'rc.status': 'generated' })
      .select(
        'rc.id as card_id', 'rc.student_id', 'rc.pdf_url', 'rc.access_token',
        's.first_name', 's.last_name', 's.parent_email'
      );
  }

  async logDelivery({ schoolId, studentId, periodId, channel, status, errorMessage, sentAt }) {
    await db('delivery_logs')
      .insert({ school_id: schoolId, student_id: studentId, period_id: periodId,
                channel, status, error_message: errorMessage ?? null,
                sent_at: sentAt ?? null })
      .onConflict(['student_id', 'period_id', 'channel'])
      .merge(['status', 'sent_at', 'error_message']);
  }

  async updateCardStatus({ cardId, status }) {
    await db('report_cards').where({ id: cardId }).update({ status });
  }

  async findDeliveryStatus({ schoolId, classroomId, periodId }) {
    return db('students as s')
      .join('student_classroom as sc', 'sc.student_id', 's.id')
      .leftJoin('report_cards as rc', function() {
        this.on('rc.student_id', 's.id').on('rc.period_id', db.raw('?', [periodId]));
      })
      .leftJoin('delivery_logs as dl', function() {
        this.on('dl.student_id', 's.id').on('dl.period_id', db.raw('?', [periodId]));
      })
      .where({ 'sc.classroom_id': classroomId, 'sc.enrollment_status': 'active', 's.school_id': schoolId })
      .select(
        's.id', 's.first_name', 's.last_name', 's.parent_email',
        'rc.status as card_status', 'rc.pdf_url', 'rc.access_token',
        'dl.status as delivery_status', 'dl.channel', 'dl.sent_at', 'dl.error_message'
      )
      .orderBy('s.last_name');
  }
}

module.exports = { DeliveryKnexRepository };
