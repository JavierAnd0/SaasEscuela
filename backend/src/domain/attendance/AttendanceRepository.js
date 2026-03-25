'use strict';

/**
 * Puerto (interface) del repositorio de asistencia.
 * Define el contrato que cualquier adaptador de infraestructura debe cumplir.
 * En JavaScript usamos esta clase como documentación del contrato — las
 * implementaciones concretas están en infrastructure/database/knex/.
 */
class AttendanceRepository {
  /**
   * Guarda un registro de asistencia
   * @param {import('./Attendance').Attendance} attendance
   * @returns {Promise<object>} registro guardado
   */
  // eslint-disable-next-line no-unused-vars
  async save(attendance) { throw new Error('Not implemented'); }

  /**
   * Guarda múltiples registros en una sola transacción (bulk)
   * @param {import('./Attendance').Attendance[]} attendances
   * @returns {Promise<object[]>}
   */
  // eslint-disable-next-line no-unused-vars
  async saveMany(attendances) { throw new Error('Not implemented'); }

  /**
   * Busca registros de asistencia por fecha y grupo
   * @param {object} params
   * @param {string} params.schoolId
   * @param {string} params.classroomId
   * @param {string} params.recordDate - formato YYYY-MM-DD
   * @returns {Promise<object[]>}
   */
  // eslint-disable-next-line no-unused-vars
  async findByClassroomAndDate(params) { throw new Error('Not implemented'); }

  /**
   * Historial de asistencia de un estudiante en un período
   * @param {object} params
   * @param {string} params.schoolId
   * @param {string} params.studentId
   * @param {string} params.periodId
   * @returns {Promise<object[]>}
   */
  // eslint-disable-next-line no-unused-vars
  async findByStudentAndPeriod(params) { throw new Error('Not implemented'); }

  /**
   * Resumen de asistencia por grupo y período
   * @param {object} params
   * @param {string} params.schoolId
   * @param {string} params.classroomId
   * @param {string} params.periodId
   * @returns {Promise<object[]>} array con totales por estudiante
   */
  // eslint-disable-next-line no-unused-vars
  async getSummaryByClassroomAndPeriod(params) { throw new Error('Not implemented'); }

  /**
   * Dashboard del docente: métricas agregadas de sus grupos
   * @param {object} params
   * @param {string} params.schoolId
   * @param {string} params.teacherId
   * @param {string} params.periodId
   * @returns {Promise<object>}
   */
  // eslint-disable-next-line no-unused-vars
  async getTeacherDashboard(params) { throw new Error('Not implemented'); }

  /**
   * Actualiza un registro de asistencia (corrección/justificación)
   * @param {string} id
   * @param {object} data
   * @param {string} schoolId - seguridad multi-tenant
   * @returns {Promise<object>}
   */
  // eslint-disable-next-line no-unused-vars
  async update(id, data, schoolId) { throw new Error('Not implemented'); }

  /**
   * Estudiantes con inasistencias injustificadas por encima de un umbral
   * @param {object} params
   * @param {string} params.schoolId
   * @param {string} params.periodId
   * @param {number} params.threshold
   * @returns {Promise<object[]>}
   */
  // eslint-disable-next-line no-unused-vars
  async getStudentsWithExcessiveAbsences(params) { throw new Error('Not implemented'); }
}

module.exports = { AttendanceRepository };
