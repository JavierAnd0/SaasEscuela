'use strict';

const router = require('express').Router();
const { firebaseAuthMiddleware } = require('../middlewares/firebaseAuth.middleware');
const { tenantMiddleware }       = require('../middlewares/tenant.middleware');
const { roles }                  = require('../middlewares/roles.middleware');
const { validate }               = require('../middlewares/validate.middleware');
const { z }                      = require('zod');
const ctrl                       = require('./comments.controller');

const auth = [firebaseAuthMiddleware, tenantMiddleware];

const GenerateSchema = z.object({
  classroomId: z.string().uuid(),
  periodId:    z.string().uuid(),
});

const UpdateCommentSchema = z.object({
  finalComment: z.string().min(1).max(1000),
  status:       z.enum(['approved', 'rejected']),
});

router.post('/generate',     ...auth, roles('coordinator', 'school_admin'), validate(GenerateSchema), ctrl.generateComments);
router.get('/',              ...auth, roles('teacher', 'coordinator', 'school_admin'), ctrl.getComments);
router.put('/:id',           ...auth, roles('teacher', 'coordinator', 'school_admin'), validate(UpdateCommentSchema), ctrl.updateComment);
router.post('/approve-all',  ...auth, roles('coordinator', 'school_admin'), validate(GenerateSchema), ctrl.approveAll);

module.exports = router;
