'use strict';

const db = require('./config');
const { GradeRepository } = require('../../../domain/grades/GradeRepository');

/**
 * Implementación concreta del puerto GradeRepository usando Knex + PostgreSQL.
 * Todas las queries usan parámetros Knex — protección nativa contra SQL injection.
 */
class GradeKnexRepository extends GradeRepository {
  async save(grade) {
    const [record] = await db('grades')
      .insert({
        school_id:        grade.schoolId,
        student_id:       grade.studentId,
        subject_id:       grade.subjectId,
        classroom_id:     grade.classroomId,
        period_id:        grade.periodId,
        teacher_id:       grade.teacherId,
        grade_value:      grade.gradeValue,
        entry_method:     grade.entryMethod,
        raw_ocr_image_url: grade.rawOcrImageUrl,
      })
      .onConflict(['student_id', 'subject_id', 'period_id'])
      .merge()
      .returning('*');

    await this._updateEntryStatus(grade);
    return record;
  }

  async saveMany(grades) {
    if (!grades.length) return [];
    const rows = grades.map(g => ({
      school_id:        g.schoolId,
      student_id:       g.studentId,
      subject_id:       g.subjectId,
      classroom_id:     g.classroomId,
      period_id:        g.periodId,
      teacher_id:       g.teacherId,
      grade_value:      g.gradeValue,
      entry_method:     g.entryMethod,
      raw_ocr_image_url: g.rawOcrImageUrl,
    }));

    const inserted = await db('grades')
      .insert(rows)
      .onConflict(['student_id', 'subject_id', 'period_id'])
      .merge()
      .returning('*');

    // Actualiza entry_status para el primer grade del array (mismo classroom/subject/period)
    if (grades.length > 0) await this._updateEntryStatus(grades[0]);
    return inserted;
  }

  async findByClassroomSubjectPeriod({ schoolId, classroomId, subjectId, periodId }) {
    return db('grades as g')
      .join('students as s', 's.id', 'g.student_id')
      .where({
        'g.school_id':    schoolId,
        'g.classroom_id': classroomId,
        'g.subject_id':   subjectId,
        'g.period_id':    periodId,
      })
      .select('g.*', 's.first_name', 's.last_name', 's.document_number')
      .orderBy('s.last_name', 'asc');
  }

  async findByStudentAndPeriod({ schoolId, studentId, periodId }) {
    return db('grades as g')
      .join('subjects as sub', 'sub.id', 'g.subject_id')
      .where({
        'g.school_id':  schoolId,
        'g.student_id': studentId,
        'g.period_id':  periodId,
      })
      .select('g.*', 'sub.name as subject_name', 'sub.area')
      .orderBy('sub.name', 'asc');
  }

  async getEntryStatus({ schoolId, periodId, classroomId }) {
    const query = db('grade_entry_status as ges')
      .join('users as u', 'u.id', 'ges.teacher_id')
      .join('subjects as s', 's.id', 'ges.subject_id')
      .join('classrooms as c', 'c.id', 'ges.classroom_id')
      .where({ 'ges.school_id': schoolId, 'ges.period_id': periodId })
      .select(
        'ges.*',
        'u.first_name as teacher_first_name',
        'u.last_name as teacher_last_name',
        'u.email as teacher_email',
        'u.phone_whatsapp',
        's.name as subject_name',
        'c.name as classroom_name'
      );

    if (classroomId) query.where('ges.classroom_id', classroomId);
    return query.orderBy(['c.name', 's.name']);
  }

  async findAllByClassroomAndPeriod({ schoolId, classroomId, periodId }) {
    return db('grades as g')
      .join('students as s', 's.id', 'g.student_id')
      .join('subjects as sub', 'sub.id', 'g.subject_id')
      .where({
        'g.school_id':    schoolId,
        'g.classroom_id': classroomId,
        'g.period_id':    periodId,
      })
      .select(
        'g.student_id',
        'g.subject_id',
        'g.grade_value',
        's.first_name',
        's.last_name',
        'sub.name as subject_name'
      )
      .orderBy(['s.last_name', 'sub.name']);
  }

  async update(id, data, schoolId) {
    const [updated] = await db('grades')
      .where({ id, school_id: schoolId })
      .update({ grade_value: data.gradeValue, updated_at: db.fn.now() })
      .returning('*');
    return updated;
  }

  /** Actualiza el conteo de notas ingresadas en grade_entry_status */
  async _updateEntryStatus(grade) {
    const totalStudents = await db('student_classroom')
      .where({
        classroom_id:     grade.classroomId,
        academic_year_id: await this._getAcademicYearFromPeriod(grade.periodId),
        enrollment_status: 'active',
      })
      .count('id as count')
      .first();

    const gradesEntered = await db('grades')
      .where({
        school_id:    grade.schoolId,
        classroom_id: grade.classroomId,
        subject_id:   grade.subjectId,
        period_id:    grade.periodId,
      })
      .count('id as count')
      .first();

    const total    = parseInt(totalStudents?.count || 0, 10);
    const entered  = parseInt(gradesEntered?.count || 0, 10);
    const complete = total > 0 && entered >= total;

    await db('grade_entry_status')
      .insert({
        school_id:      grade.schoolId,
        teacher_id:     grade.teacherId,
        classroom_id:   grade.classroomId,
        subject_id:     grade.subjectId,
        period_id:      grade.periodId,
        total_students: total,
        grades_entered: entered,
        is_complete:    complete,
        completed_at:   complete ? db.fn.now() : null,
      })
      .onConflict(['teacher_id', 'classroom_id', 'subject_id', 'period_id'])
      .merge();
  }

  async _getAcademicYearFromPeriod(periodId) {
    const period = await db('periods').where('id', periodId).first();
    return period?.academic_year_id;
  }
}

module.exports = { GradeKnexRepository };
