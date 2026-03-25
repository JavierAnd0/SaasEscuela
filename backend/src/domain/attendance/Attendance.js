'use strict';

/**
 * Entidad de dominio: Asistencia
 * Contiene las reglas de negocio puras para el registro de asistencia.
 * No depende de ningún framework ni infraestructura.
 */

const VALID_STATUSES = ['present', 'absent_justified', 'absent_unjustified', 'late'];

const STATUS_LABELS = {
  present:            'Presente',
  absent_justified:   'Ausente Justificado',
  absent_unjustified: 'Ausente Injustificado',
  late:               'Tardanza',
};

class Attendance {
  constructor({ id, schoolId, studentId, classroomId, periodId, recordDate, status, justification, recordedBy }) {
    this.id = id;
    this.schoolId = schoolId;
    this.studentId = studentId;
    this.classroomId = classroomId;
    this.periodId = periodId;
    this.recordDate = recordDate;
    this.status = status;
    this.justification = justification || null;
    this.recordedBy = recordedBy;
  }

  /**
   * Valida que el estado sea uno de los permitidos
   * @param {string} status
   * @returns {boolean}
   */
  static isValidStatus(status) {
    return VALID_STATUSES.includes(status);
  }

  /**
   * Una justificación es requerida para ausencias justificadas
   * @returns {boolean}
   */
  requiresJustification() {
    return this.status === 'absent_justified';
  }

  /**
   * Cuenta como inasistencia para efectos del Decreto 1290
   * @returns {boolean}
   */
  isAbsence() {
    return this.status === 'absent_justified' || this.status === 'absent_unjustified';
  }

  /**
   * Valida la entidad y retorna array de errores
   * @returns {string[]}
   */
  validate() {
    const errors = [];
    if (!Attendance.isValidStatus(this.status)) {
      errors.push(`Estado inválido: "${this.status}". Válidos: ${VALID_STATUSES.join(', ')}`);
    }
    if (this.requiresJustification() && !this.justification) {
      errors.push('Las ausencias justificadas requieren una justificación.');
    }
    if (!this.studentId) errors.push('studentId es requerido.');
    if (!this.classroomId) errors.push('classroomId es requerido.');
    if (!this.recordDate) errors.push('recordDate es requerido.');
    return errors;
  }

  /**
   * Retorna el label legible del estado
   * @returns {string}
   */
  getStatusLabel() {
    return STATUS_LABELS[this.status] || this.status;
  }
}

module.exports = { Attendance, VALID_STATUSES, STATUS_LABELS };
