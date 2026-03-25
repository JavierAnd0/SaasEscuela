'use strict';

const { NotFoundError } = require('../../presentation/middlewares/errorHandler.middleware');

/**
 * Caso de uso: Docente aprueba o edita un comentario de boletín.
 */
class UpdateCommentUseCase {
  constructor(commentRepo) {
    this.commentRepo = commentRepo;
  }

  async execute({ id, schoolId, finalComment, status, editedBy }) {
    const updated = await this.commentRepo.updateComment({ id, schoolId, finalComment, status, editedBy });
    if (!updated) throw new NotFoundError('Comentario no encontrado.');
    return updated;
  }
}

module.exports = { UpdateCommentUseCase };
