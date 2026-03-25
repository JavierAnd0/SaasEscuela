'use strict';

const fs = require('fs');
const { ReportCardKnexRepository }    = require('../../infrastructure/database/knex/ReportCardKnexRepository');
const { PuppeteerPdfAdapter }         = require('../../infrastructure/pdf/PuppeteerPdfAdapter');
const { GenerateReportCardsUseCase }  = require('../../application/report-cards/GenerateReportCardsUseCase');
const { GetReportCardsUseCase }       = require('../../application/report-cards/GetReportCardsUseCase');
const { GetPublicReportCardUseCase }  = require('../../application/report-cards/GetPublicReportCardUseCase');

const reportCardRepo      = new ReportCardKnexRepository();
const pdfAdapter          = new PuppeteerPdfAdapter();
const generateUseCase     = new GenerateReportCardsUseCase(reportCardRepo, pdfAdapter);
const getUseCase          = new GetReportCardsUseCase(reportCardRepo);
const getPublicUseCase    = new GetPublicReportCardUseCase(reportCardRepo);

/**
 * POST /api/v1/report-cards/generate
 * Body: { classroomId, periodId }
 */
async function generateReportCards(req, res, next) {
  try {
    const { classroomId, periodId } = req.body;
    const result = await generateUseCase.execute({ schoolId: req.schoolId, classroomId, periodId });
    res.json(result);
  } catch (err) { next(err); }
}

/**
 * GET /api/v1/report-cards?classroomId=&periodId=
 */
async function getReportCards(req, res, next) {
  try {
    const { classroomId, periodId } = req.query;
    const cards = await getUseCase.execute({ schoolId: req.schoolId, classroomId, periodId });
    res.json({ data: cards });
  } catch (err) { next(err); }
}

/**
 * GET /api/v1/report-cards/public/:token
 * Acceso público para padres via token único — sin autenticación.
 */
async function getPublicReportCard(req, res, next) {
  try {
    const filePath = await getPublicUseCase.execute(req.params.token);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no disponible.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="boletin.pdf"');
    fs.createReadStream(filePath).pipe(res);
  } catch (err) { next(err); }
}

module.exports = { generateReportCards, getReportCards, getPublicReportCard };
