'use strict';

const { ValidationError } = require('../../presentation/middlewares/errorHandler.middleware');

/**
 * Caso de uso: Obtener el estado de entrega de boletines para un grupo y período.
 */
class GetDeliveryStatusUseCase {
  constructor(deliveryRepo) {
    this.deliveryRepo = deliveryRepo;
  }

  async execute({ schoolId, classroomId, periodId }) {
    if (!classroomId || !periodId) {
      throw new ValidationError('classroomId y periodId son requeridos.');
    }
    return this.deliveryRepo.findDeliveryStatus({ schoolId, classroomId, periodId });
  }
}

module.exports = { GetDeliveryStatusUseCase };
