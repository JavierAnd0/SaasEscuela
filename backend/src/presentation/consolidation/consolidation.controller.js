'use strict';

const { ConsolidationKnexRepository }   = require('../../infrastructure/database/knex/ConsolidationKnexRepository');
const { RunConsolidationUseCase }        = require('../../application/consolidation/RunConsolidationUseCase');
const { GetConsolidationSummaryUseCase } = require('../../application/consolidation/GetConsolidationSummaryUseCase');

const consolidationRepo     = new ConsolidationKnexRepository();
const runUseCase            = new RunConsolidationUseCase(consolidationRepo);
const getSummaryUseCase     = new GetConsolidationSummaryUseCase(consolidationRepo);

/**
 * POST /api/v1/consolidation
 * Body: { classroomId, periodId }
 */
async function runConsolidation(req, res, next) {
  try {
    const { classroomId, periodId } = req.body;
    const result = await runUseCase.execute({ schoolId: req.schoolId, classroomId, periodId });
    res.json({ data: result, count: result.length });
  } catch (err) { next(err); }
}

/**
 * GET /api/v1/consolidation?classroomId=&periodId=
 */
async function getSummary(req, res, next) {
  const { classroomId, periodId } = req.query;
  if (!classroomId || !periodId) {
    return res.status(400).json({ error: 'classroomId y periodId son requeridos.' });
  }
  try {
    const summaries = await getSummaryUseCase.execute({ schoolId: req.schoolId, classroomId, periodId });
    res.json({ data: summaries });
  } catch (err) { next(err); }
}

module.exports = { runConsolidation, getSummary };
