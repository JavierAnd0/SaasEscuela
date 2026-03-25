'use strict';

const { CommentKnexRepository }      = require('../../infrastructure/database/knex/CommentKnexRepository');
const { AnthropicCommentAdapter }    = require('../../infrastructure/ai/AnthropicCommentAdapter');
const { GenerateCommentsUseCase }    = require('../../application/comments/GenerateCommentsUseCase');
const { GetCommentsUseCase }         = require('../../application/comments/GetCommentsUseCase');
const { UpdateCommentUseCase }       = require('../../application/comments/UpdateCommentUseCase');
const { ApproveAllCommentsUseCase }  = require('../../application/comments/ApproveAllCommentsUseCase');

const commentRepo         = new CommentKnexRepository();
const aiAdapter           = new AnthropicCommentAdapter();
const generateUseCase     = new GenerateCommentsUseCase(commentRepo, aiAdapter);
const getUseCase          = new GetCommentsUseCase(commentRepo);
const updateUseCase       = new UpdateCommentUseCase(commentRepo);
const approveAllUseCase   = new ApproveAllCommentsUseCase(commentRepo);

/**
 * POST /api/v1/comments/generate
 * Body: { classroomId, periodId }
 */
async function generateComments(req, res, next) {
  try {
    const { classroomId, periodId } = req.body;
    const result = await generateUseCase.execute({ schoolId: req.schoolId, classroomId, periodId });
    res.json(result);
  } catch (err) { next(err); }
}

/**
 * GET /api/v1/comments?classroomId=&periodId=
 */
async function getComments(req, res, next) {
  try {
    const { classroomId, periodId } = req.query;
    const comments = await getUseCase.execute({ schoolId: req.schoolId, classroomId, periodId });
    res.json({ data: comments });
  } catch (err) { next(err); }
}

/**
 * PUT /api/v1/comments/:id
 * Body: { finalComment, status: 'approved'|'rejected' }
 */
async function updateComment(req, res, next) {
  try {
    const { id } = req.params;
    const { finalComment, status } = req.body;
    const updated = await updateUseCase.execute({
      id, schoolId: req.schoolId, finalComment, status, editedBy: req.user.dbId,
    });
    res.json({ data: updated });
  } catch (err) { next(err); }
}

/**
 * POST /api/v1/comments/approve-all
 * Body: { classroomId, periodId }
 */
async function approveAll(req, res, next) {
  try {
    const { classroomId, periodId } = req.body;
    const result = await approveAllUseCase.execute({
      schoolId: req.schoolId, classroomId, periodId, editedBy: req.user.dbId,
    });
    res.json(result);
  } catch (err) { next(err); }
}

module.exports = { generateComments, getComments, updateComment, approveAll };
