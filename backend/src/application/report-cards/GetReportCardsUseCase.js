'use strict';

const { ValidationError } = require('../../presentation/middlewares/errorHandler.middleware');

/**
 * Caso de uso: Obtener los boletines generados para un grupo y período.
 */
class GetReportCardsUseCase {
  constructor(reportCardRepo) {
    this.reportCardRepo = reportCardRepo;
  }

  async execute({ schoolId, classroomId, periodId }) {
    if (!classroomId || !periodId) {
      throw new ValidationError('classroomId y periodId son requeridos.');
    }
    return this.reportCardRepo.findReportCards({ schoolId, classroomId, periodId });
  }
}

module.exports = { GetReportCardsUseCase };
