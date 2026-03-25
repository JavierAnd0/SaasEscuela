'use strict';

/**
 * Caso de uso: Aprobar todos los comentarios pendientes de un grupo y período.
 */
class ApproveAllCommentsUseCase {
  constructor(commentRepo) {
    this.commentRepo = commentRepo;
  }

  async execute({ schoolId, classroomId, periodId, editedBy }) {
    const count = await this.commentRepo.approveAll({ schoolId, classroomId, periodId, editedBy });
    return { updated: count };
  }
}

module.exports = { ApproveAllCommentsUseCase };
