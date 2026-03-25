'use strict';

/**
 * Puerto (interface) del repositorio de entrega de boletines.
 */
class DeliveryRepository {
  /** @param {{ schoolId: string }} params */
  async findSchool({ schoolId }) { throw new Error('Not implemented'); }

  /** @param {{ periodId: string, schoolId: string }} params */
  async findPeriod({ periodId, schoolId }) { throw new Error('Not implemented'); }

  /** @param {{ schoolId: string, classroomId: string, periodId: string }} params */
  async findGeneratedCards({ schoolId, classroomId, periodId }) { throw new Error('Not implemented'); }

  /** @param {{ schoolId, studentId, periodId, channel, status, errorMessage?, sentAt? }} params */
  async logDelivery(params) { throw new Error('Not implemented'); }

  /** @param {{ cardId: string, status: string }} params */
  async updateCardStatus({ cardId, status }) { throw new Error('Not implemented'); }

  /** @param {{ schoolId: string, classroomId: string, periodId: string }} params */
  async findDeliveryStatus({ schoolId, classroomId, periodId }) { throw new Error('Not implemented'); }
}

module.exports = { DeliveryRepository };
