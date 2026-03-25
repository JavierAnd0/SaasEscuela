'use strict';

/**
 * Puerto (interface) del repositorio de notas.
 */
class GradeRepository {
  // eslint-disable-next-line no-unused-vars
  async save(grade) { throw new Error('Not implemented'); }

  // eslint-disable-next-line no-unused-vars
  async saveMany(grades) { throw new Error('Not implemented'); }

  /**
   * @param {object} params - { schoolId, classroomId, subjectId, periodId }
   * @returns {Promise<object[]>}
   */
  // eslint-disable-next-line no-unused-vars
  async findByClassroomSubjectPeriod(params) { throw new Error('Not implemented'); }

  /**
   * @param {object} params - { schoolId, studentId, periodId }
   * @returns {Promise<object[]>}
   */
  // eslint-disable-next-line no-unused-vars
  async findByStudentAndPeriod(params) { throw new Error('Not implemented'); }

  /**
   * Estado de completitud de ingreso por docente/materia/período
   * @param {object} params - { schoolId, periodId, classroomId? }
   * @returns {Promise<object[]>}
   */
  // eslint-disable-next-line no-unused-vars
  async getEntryStatus(params) { throw new Error('Not implemented'); }

  /**
   * Todas las notas de un grupo en un período (para consolidación)
   * @param {object} params - { schoolId, classroomId, periodId }
   * @returns {Promise<object[]>}
   */
  // eslint-disable-next-line no-unused-vars
  async findAllByClassroomAndPeriod(params) { throw new Error('Not implemented'); }

  // eslint-disable-next-line no-unused-vars
  async update(id, data, schoolId) { throw new Error('Not implemented'); }
}

module.exports = { GradeRepository };
