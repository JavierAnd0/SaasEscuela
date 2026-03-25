'use strict';

const { isValidGrade, getColombianLevel } = require('../shared/colombianScale');

const ENTRY_METHODS = ['web', 'csv', 'whatsapp_ocr', 'google_forms'];

/**
 * Entidad de dominio: Nota
 * Encapsula las reglas de negocio de una calificación colombiana.
 */
class Grade {
  constructor({ id, schoolId, studentId, subjectId, classroomId, periodId, teacherId, gradeValue, entryMethod = 'web', rawOcrImageUrl = null }) {
    this.id = id;
    this.schoolId = schoolId;
    this.studentId = studentId;
    this.subjectId = subjectId;
    this.classroomId = classroomId;
    this.periodId = periodId;
    this.teacherId = teacherId;
    this.gradeValue = gradeValue;
    this.entryMethod = entryMethod;
    this.rawOcrImageUrl = rawOcrImageUrl;
  }

  /**
   * Valida la entidad — retorna array de errores
   * @returns {string[]}
   */
  validate() {
    const errors = [];
    if (!isValidGrade(this.gradeValue)) {
      errors.push(`Nota inválida: ${this.gradeValue}. Debe estar entre 1.0 y 5.0 (escala colombiana).`);
    }
    if (!ENTRY_METHODS.includes(this.entryMethod)) {
      errors.push(`Método de ingreso inválido: "${this.entryMethod}".`);
    }
    if (!this.studentId) errors.push('studentId es requerido.');
    if (!this.subjectId) errors.push('subjectId es requerido.');
    if (!this.periodId)  errors.push('periodId es requerido.');
    return errors;
  }

  /**
   * Retorna el nivel SIEE de esta nota
   * @param {object} sieeConfig - config del colegio (opcional)
   * @returns {{ key: string, name: string }}
   */
  getLevel(sieeConfig = null) {
    return getColombianLevel(this.gradeValue, sieeConfig);
  }

  /**
   * Indica si la nota es aprobatoria
   * @param {number} passingGrade
   * @returns {boolean}
   */
  isPassing(passingGrade = 3.0) {
    return this.gradeValue >= passingGrade;
  }
}

module.exports = { Grade, ENTRY_METHODS };
