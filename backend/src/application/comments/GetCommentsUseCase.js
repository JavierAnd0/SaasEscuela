'use strict';

const { ValidationError } = require('../../presentation/middlewares/errorHandler.middleware');

/**
 * Caso de uso: Obtener comentarios de boletín para un grupo y período.
 */
class GetCommentsUseCase {
  constructor(commentRepo) {
    this.commentRepo = commentRepo;
  }

  async execute({ schoolId, classroomId, periodId }) {
    if (!classroomId || !periodId) {
      throw new ValidationError('classroomId y periodId son requeridos.');
    }
    return this.commentRepo.findComments({ schoolId, classroomId, periodId });
  }
}

module.exports = { GetCommentsUseCase };
