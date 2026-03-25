'use strict';

/**
 * Puerto (interface) del repositorio de boletines PDF.
 */
class ReportCardRepository {
  /** @param {{ schoolId: string }} params */
  async findSchool({ schoolId }) { throw new Error('Not implemented'); }

  /** @param {{ periodId: string, schoolId: string }} params */
  async findPeriod({ periodId, schoolId }) { throw new Error('Not implemented'); }

  /** @param {{ id: string, schoolId: string }} params */
  async findAcademicYear({ id, schoolId }) { throw new Error('Not implemented'); }

  /** @param {{ id: string, schoolId: string }} params */
  async findClassroom({ id, schoolId }) { throw new Error('Not implemented'); }

  /** @param {{ schoolId, classroomId, periodId, academicYearId }} params */
  async findStudentsWithSummaries({ schoolId, classroomId, periodId, academicYearId }) { throw new Error('Not implemented'); }

  /** @param {{ schoolId: string, classroomId: string, periodId: string }} params */
  async findGradesWithSubjects({ schoolId, classroomId, periodId }) { throw new Error('Not implemented'); }

  /** @param {{ schoolId: string, classroomId: string, periodId: string }} params */
  async findApprovedComments({ schoolId, classroomId, periodId }) { throw new Error('Not implemented'); }

  /** @param {{ schoolId, studentId, classroomId, periodId, pdfUrl, accessToken }} params */
  async saveReportCard(params) { throw new Error('Not implemented'); }

  /** @param {{ schoolId: string, classroomId: string, periodId: string }} params */
  async findReportCards({ schoolId, classroomId, periodId }) { throw new Error('Not implemented'); }

  /** @param {string} token */
  async findByToken(token) { throw new Error('Not implemented'); }
}

module.exports = { ReportCardRepository };
