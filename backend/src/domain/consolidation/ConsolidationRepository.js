'use strict';

/**
 * Puerto (interface) del repositorio de consolidación.
 * Define el contrato que cualquier adaptador de infraestructura debe cumplir.
 */
class ConsolidationRepository {
  /** @param {{ periodId: string, schoolId: string }} params */
  async findPeriod({ periodId, schoolId }) { throw new Error('Not implemented'); }

  /** @param {{ schoolId: string, classroomId: string, academicYearId: string }} params */
  async findActiveStudents({ schoolId, classroomId, academicYearId }) { throw new Error('Not implemented'); }

  /** @param {{ schoolId: string, classroomId: string, periodId: string }} params */
  async findGrades({ schoolId, classroomId, periodId }) { throw new Error('Not implemented'); }

  /** @param {object[]} summaries */
  async savePeriodSummaries(summaries) { throw new Error('Not implemented'); }

  /** @param {{ academicYearId: string, schoolId: string }} params */
  async findAllPeriodsForYear({ academicYearId, schoolId }) { throw new Error('Not implemented'); }

  /** @param {{ schoolId: string, periodId: string, classroomId: string }} params */
  async countPeriodSummaries({ schoolId, periodId, classroomId }) { throw new Error('Not implemented'); }

  /** @param {{ schoolId: string, studentId: string, periodIds: string[] }} params */
  async findPeriodSummariesForStudentInYear({ schoolId, studentId, periodIds }) { throw new Error('Not implemented'); }

  /** @param {{ schoolId, studentId, academicYearId, yearAverage, sieeLevel, isPromoted }} params */
  async saveYearSummary(params) { throw new Error('Not implemented'); }

  /** @param {{ schoolId: string, classroomId: string, periodId: string }} params */
  async findSummaries({ schoolId, classroomId, periodId }) { throw new Error('Not implemented'); }
}

module.exports = { ConsolidationRepository };
