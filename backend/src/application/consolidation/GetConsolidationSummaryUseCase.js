'use strict';

/**
 * Caso de uso: Obtener la consolidación existente para un grupo y período.
 */
class GetConsolidationSummaryUseCase {
  /**
   * @param {import('../../domain/consolidation/ConsolidationRepository').ConsolidationRepository} consolidationRepo
   */
  constructor(consolidationRepo) {
    this.consolidationRepo = consolidationRepo;
  }

  async execute({ schoolId, classroomId, periodId }) {
    return this.consolidationRepo.findSummaries({ schoolId, classroomId, periodId });
  }
}

module.exports = { GetConsolidationSummaryUseCase };
