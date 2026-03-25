'use strict';

const router = require('express').Router();
const { firebaseAuthMiddleware } = require('../middlewares/firebaseAuth.middleware');
const { tenantMiddleware }       = require('../middlewares/tenant.middleware');
const { roles }                  = require('../middlewares/roles.middleware');
const { validate }               = require('../middlewares/validate.middleware');
const { z }                      = require('zod');
const ctrl                       = require('./delivery.controller');

const auth = [firebaseAuthMiddleware, tenantMiddleware];

const SendSchema = z.object({
  classroomId: z.string().uuid(),
  periodId:    z.string().uuid(),
  channel:     z.enum(['email', 'whatsapp']).default('email'),
});

router.post('/send',  ...auth, roles('coordinator', 'school_admin'), validate(SendSchema), ctrl.sendReportCards);
router.get('/status', ...auth, roles('coordinator', 'school_admin'), ctrl.getDeliveryStatus);

module.exports = router;
