'use strict';

const router     = require('express').Router();
const rateLimit  = require('express-rate-limit');
const { auth }     = require('../middlewares/authMiddlewares');
const { roles }    = require('../middlewares/roles.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { z }        = require('zod');
const ctrl         = require('./report-cards.controller');

const GenerateSchema = z.object({
  classroomId: z.string().uuid(),
  periodId:    z.string().uuid(),
});

/**
 * Rate limiter para el endpoint público de boletines.
 * 60 req/min por IP — permite uso legítimo (padre descarga el boletín) sin abrir
 * la puerta a enumeración masiva de tokens.
 */
const publicTokenLimiter = rateLimit({
  windowMs:       60 * 1000,
  max:            60,
  standardHeaders: true,
  legacyHeaders:  false,
  message:        { error: 'Demasiadas solicitudes. Intente en un momento.' },
  keyGenerator:   (req) => req.ip,   // explícito — no depende de headers modificables
});

router.post('/generate',        ...auth, roles('coordinator', 'school_admin'), validate(GenerateSchema), ctrl.generateReportCards);
router.get('/',                 ...auth, roles('coordinator', 'school_admin'), ctrl.getReportCards);
router.get('/public/:token',    publicTokenLimiter, ctrl.getPublicReportCard);

module.exports = router;
