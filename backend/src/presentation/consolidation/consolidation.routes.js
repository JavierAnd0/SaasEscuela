'use strict';

const router = require('express').Router();
const { firebaseAuthMiddleware } = require('../middlewares/firebaseAuth.middleware');
const { tenantMiddleware }       = require('../middlewares/tenant.middleware');
const { roles }                  = require('../middlewares/roles.middleware');
const { validate }               = require('../middlewares/validate.middleware');
const { z }                      = require('zod');
const ctrl                       = require('./consolidation.controller');

const auth = [firebaseAuthMiddleware, tenantMiddleware];

const RunConsolidationSchema = z.object({
  classroomId: z.string().uuid(),
  periodId:    z.string().uuid(),
});

router.post('/', ...auth, roles('coordinator', 'school_admin'), validate(RunConsolidationSchema), ctrl.runConsolidation);
router.get('/',  ...auth, roles('teacher', 'coordinator', 'school_admin'), ctrl.getSummary);

module.exports = router;
