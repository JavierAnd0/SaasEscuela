'use strict';

const db = require('./config');
const { AttendanceRepository } = require('../../../domain/attendance/AttendanceRepository');

/**
 * Implementación concreta del puerto AttendanceRepository usando Knex + PostgreSQL.
 * TODAS las queries usan parámetros de Knex — nunca concatenación de strings.
 * Cada query filtra por school_id para garantizar multi-tenancy.
 */
class AttendanceKnexRepository extends AttendanceRepository {
  async save(attendance) {
    return this._upsertOne(attendance);
  }

  async saveMany(attendances) {
    if (!attendances.length) return [];
    // Upsert explícito: evita problemas de ON CONFLICT con subject_id nullable
    const results = await Promise.all(attendances.map(a => this._upsertOne(a)));
    return results;
  }

  /**
   * Upsert de un registro individual.
   * Busca por (student_id, record_date, subject_id) y actualiza o inserta.
   */
  async _upsertOne(attendance) {
    const lookup = {
      student_id:  attendance.studentId,
      record_date: attendance.recordDate,
    };
    if (attendance.subjectId) {
      lookup.subject_id = attendance.subjectId;
    } else {
      // registros legado sin materia
      lookup.subject_id = null;
    }

    const existing = await db('attendance_records').where(lookup).first();

    if (existing) {
      const [updated] = await db('attendance_records')
        .where({ id: existing.id })
        .update({
          status:        attendance.status,
          justification: attendance.justification ?? null,
          updated_at:    db.fn.now(),
        })
        .returning('*');
      return updated;
    }

    const [inserted] = await db('attendance_records')
      .insert({
        school_id:    attendance.schoolId,
        student_id:   attendance.studentId,
        classroom_id: attendance.classroomId,
        period_id:    attendance.periodId,
        subject_id:   attendance.subjectId ?? null,
        record_date:  attendance.recordDate,
        status:       attendance.status,
        justification: attendance.justification ?? null,
        recorded_by:  attendance.recordedBy,
      })
      .returning('*');
    return inserted;
  }

  async findByClassroomAndDate({ schoolId, classroomId, recordDate, subjectId }) {
    let query = db('attendance_records as ar')
      .join('students as s', 's.id', 'ar.student_id')
      .where({
        'ar.school_id':    schoolId,
        'ar.classroom_id': classroomId,
        'ar.record_date':  recordDate,
      });

    if (subjectId) {
      query = query.where('ar.subject_id', subjectId);
    }

    return query
      .select('ar.*', 's.first_name', 's.last_name', 's.document_number')
      .orderBy('s.last_name', 'asc');
  }

  async findByStudentAndPeriod({ schoolId, studentId, periodId }) {
    return db('attendance_records')
      .where({ school_id: schoolId, student_id: studentId, period_id: periodId })
      .orderBy('record_date', 'asc');
  }

  async getSummaryByClassroomAndPeriod({ schoolId, classroomId, periodId }) {
    return db('attendance_records as ar')
      .join('students as s', 's.id', 'ar.student_id')
      .where({
        'ar.school_id':    schoolId,
        'ar.classroom_id': classroomId,
        'ar.period_id':    periodId,
      })
      .groupBy('ar.student_id', 's.first_name', 's.last_name')
      .select(
        'ar.student_id',
        's.first_name',
        's.last_name',
        db.raw(`COUNT(*) FILTER (WHERE ar.status = 'present') AS present_count`),
        db.raw(`COUNT(*) FILTER (WHERE ar.status = 'absent_justified') AS absent_justified_count`),
        db.raw(`COUNT(*) FILTER (WHERE ar.status = 'absent_unjustified') AS absent_unjustified_count`),
        db.raw(`COUNT(*) FILTER (WHERE ar.status = 'late') AS late_count`),
        db.raw(`COUNT(*) AS total_days`),
        db.raw(`ROUND(COUNT(*) FILTER (WHERE ar.status = 'present') * 100.0 / NULLIF(COUNT(*), 0), 1) AS attendance_rate`)
      );
  }

  async getTeacherDashboard({ schoolId, teacherId, periodId }) {
    // Grupos asignados al docente
    const classrooms = await db('teacher_assignments as ta')
      .join('classrooms as c', 'c.id', 'ta.classroom_id')
      .join('grade_levels as gl', 'gl.id', 'c.grade_level_id')
      .where({ 'ta.school_id': schoolId, 'ta.teacher_id': teacherId })
      .select('ta.classroom_id', 'c.name as classroom_name', 'gl.name as grade_level_name')
      .distinct();

    if (!classrooms.length) return { classrooms: [], summary: [] };

    const classroomIds = classrooms.map(c => c.classroom_id);

    // Totales de asistencia por grupo en el período
    const summary = await db('attendance_records as ar')
      .join('students as s', 's.id', 'ar.student_id')
      .where({ 'ar.school_id': schoolId, 'ar.period_id': periodId })
      .whereIn('ar.classroom_id', classroomIds)
      .groupBy('ar.classroom_id')
      .select(
        'ar.classroom_id',
        db.raw(`COUNT(DISTINCT ar.student_id) AS total_students`),
        db.raw(`COUNT(*) FILTER (WHERE ar.status = 'absent_unjustified') AS total_unjustified_absences`),
        db.raw(`COUNT(*) FILTER (WHERE ar.status = 'absent_justified') AS total_justified_absences`),
        db.raw(`ROUND(COUNT(*) FILTER (WHERE ar.status = 'present') * 100.0 / NULLIF(COUNT(*), 0), 1) AS avg_attendance_rate`)
      );

    return { classrooms, summary };
  }

  async update(id, data, schoolId) {
    const [updated] = await db('attendance_records')
      .where({ id, school_id: schoolId })   // school_id garantiza que no modifica datos de otro colegio
      .update({
        status:        data.status,
        justification: data.justification,
        updated_at:    db.fn.now(),
      })
      .returning('*');
    return updated;
  }

  async getStudentsWithExcessiveAbsences({ schoolId, periodId, threshold }) {
    return db('attendance_records as ar')
      .join('students as s', 's.id', 'ar.student_id')
      .join('student_classroom as sc', function() {
        this.on('sc.student_id', '=', 'ar.student_id');
      })
      .join('classrooms as c', 'c.id', 'ar.classroom_id')
      .where({
        'ar.school_id': schoolId,
        'ar.period_id': periodId,
        'ar.status':    'absent_unjustified',
      })
      .groupBy('ar.student_id', 's.first_name', 's.last_name', 'ar.classroom_id', 'c.name')
      .havingRaw('COUNT(*) >= ?', [threshold])
      .select(
        'ar.student_id',
        's.first_name',
        's.last_name',
        'ar.classroom_id',
        'c.name as classroom_name',
        db.raw('COUNT(*) AS unjustified_absences')
      )
      .orderBy('unjustified_absences', 'desc');
  }
}

module.exports = { AttendanceKnexRepository };
