'use strict';

/**
 * Cadena de middlewares de autenticación estándar para rutas protegidas.
 *
 * Orden:
 *   1. firebaseAuthMiddleware — verifica el JWT de Firebase e inyecta req.user
 *   2. tenantMiddleware       — inyecta req.schoolId desde el custom claim
 *   3. subscriptionGuard      — rechaza si la suscripción del colegio está inactiva
 *
 * Uso en route files:
 *   const { auth } = require('../middlewares/authMiddlewares');
 *   router.get('/ruta', ...auth, roles('coordinator'), ctrl.handler);
 */
const { firebaseAuthMiddleware } = require('./firebaseAuth.middleware');
const { tenantMiddleware }       = require('./tenant.middleware');
const { subscriptionGuard }      = require('./subscriptionGuard.middleware');

const auth = [firebaseAuthMiddleware, tenantMiddleware, subscriptionGuard];

module.exports = { auth };
