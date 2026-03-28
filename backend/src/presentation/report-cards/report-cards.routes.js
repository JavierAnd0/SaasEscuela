'use strict';

const router = require('express').Router();
const { auth }     = require('../middlewares/authMiddlewares');
const { roles }    = require('../middlewares/roles.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { z }        = require('zod');
const ctrl         = require('./report-cards.controller');

const GenerateSchema = z.object({
  classroomId: z.string().uuid(),
  periodId:    z.string().uuid(),
});

router.post('/generate',        ...auth, roles('coordinator', 'school_admin'), validate(GenerateSchema), ctrl.generateReportCards);
router.get('/',                 ...auth, roles('coordinator', 'school_admin'), ctrl.getReportCards);
router.get('/public/:token',    ctrl.getPublicReportCard); // Sin auth — acceso público por token

module.exports = router;
