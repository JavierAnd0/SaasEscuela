'use strict';

const { DeliveryKnexRepository }    = require('../../infrastructure/database/knex/DeliveryKnexRepository');
const { NodemailerEmailAdapter }    = require('../../infrastructure/email/NodemailerEmailAdapter');
const { SendReportCardsUseCase }    = require('../../application/delivery/SendReportCardsUseCase');
const { GetDeliveryStatusUseCase }  = require('../../application/delivery/GetDeliveryStatusUseCase');

const deliveryRepo      = new DeliveryKnexRepository();
const emailAdapter      = new NodemailerEmailAdapter();
const sendUseCase       = new SendReportCardsUseCase(deliveryRepo, emailAdapter);
const statusUseCase     = new GetDeliveryStatusUseCase(deliveryRepo);

/**
 * POST /api/v1/delivery/send
 * Body: { classroomId, periodId, channel: 'email' }
 */
async function sendReportCards(req, res, next) {
  try {
    const { classroomId, periodId, channel = 'email' } = req.body;
    const result = await sendUseCase.execute({ schoolId: req.schoolId, classroomId, periodId, channel });
    res.json(result);
  } catch (err) { next(err); }
}

/**
 * GET /api/v1/delivery/status?classroomId=&periodId=
 */
async function getDeliveryStatus(req, res, next) {
  try {
    const { classroomId, periodId } = req.query;
    const status = await statusUseCase.execute({ schoolId: req.schoolId, classroomId, periodId });
    res.json({ data: status });
  } catch (err) { next(err); }
}

module.exports = { sendReportCards, getDeliveryStatus };
