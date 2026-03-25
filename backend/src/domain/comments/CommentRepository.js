'use strict';

/**
 * Puerto (interface) del repositorio de comentarios de boletín.
 */
class CommentRepository {
  /** @param {{ classroomId: string, schoolId: string }} params */
  async findClassroomWithGradeLevel({ classroomId }) { throw new Error('Not implemented'); }

  /** @param {{ periodId: string, schoolId: string }} params */
  async findPeriod({ periodId, schoolId }) { throw new Error('Not implemented'); }

  /** @param {{ schoolId: string, classroomId: string, periodId: string }} params */
  async findSummariesWithStudents({ schoolId, classroomId, periodId }) { throw new Error('Not implemented'); }

  /** @param {{ schoolId: string, classroomId: string, periodId: string }} params */
  async findGradesWithSubjects({ schoolId, classroomId, periodId }) { throw new Error('Not implemented'); }

  /** @param {object[]} comments */
  async upsertComments(comments) { throw new Error('Not implemented'); }

  /** @param {{ schoolId: string, classroomId: string, periodId: string }} params */
  async findComments({ schoolId, classroomId, periodId }) { throw new Error('Not implemented'); }

  /** @param {{ id: string, schoolId: string, finalComment: string, status: string, editedBy: string }} params */
  async updateComment({ id, schoolId, finalComment, status, editedBy }) { throw new Error('Not implemented'); }

  /** @param {{ schoolId: string, classroomId: string, periodId: string, editedBy: string }} params */
  async approveAll({ schoolId, classroomId, periodId, editedBy }) { throw new Error('Not implemented'); }
}

module.exports = { CommentRepository };
