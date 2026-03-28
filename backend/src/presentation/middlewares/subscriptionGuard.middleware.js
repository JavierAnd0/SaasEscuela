'use strict';

const db = require('../../infrastructure/database/knex/config');

/**
 * Middleware: verifica que el colegio del request tenga una suscripción activa.
 *
 * Debe ejecutarse DESPUÉS de tenantMiddleware (que inyecta req.schoolId).
 * Superadmins y rutas sin schoolId siempre pasan.
 *
 * Códigos de error:
 *   402 SUBSCRIPTION_SUSPENDED  — colegio suspendido manualmente
 *   402 SUBSCRIPTION_CANCELLED  — cuenta cancelada
 *   402 TRIAL_EXPIRED           — prueba gratuita vencida
 */
async function subscriptionGuard(req, res, next) {
  // Sin contexto de colegio → superadmin o ruta pública; dejar pasar
  if (!req.schoolId) return next();

  try {
    const school = await db('schools')
      .where({ id: req.schoolId })
      .select('name', 'subscription_status', 'trial_ends_at')
      .first();

    if (!school) return next(); // el tenantMiddleware ya valida la existencia

    const status = school.subscription_status;

    if (status === 'suspended') {
      return res.status(402).json({
        error: `La suscripción del colegio "${school.name}" está suspendida. Contacte al administrador de la plataforma para reactivarla.`,
        code:  'SUBSCRIPTION_SUSPENDED',
      });
    }

    if (status === 'cancelled') {
      return res.status(402).json({
        error: `La cuenta del colegio "${school.name}" ha sido cancelada. Contacte al administrador de la plataforma.`,
        code:  'SUBSCRIPTION_CANCELLED',
      });
    }

    if (status === 'trial' && school.trial_ends_at && new Date(school.trial_ends_at) < new Date()) {
      return res.status(402).json({
        error: 'El período de prueba ha vencido. Contacte al administrador de la plataforma para activar la suscripción.',
        code:  'TRIAL_EXPIRED',
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { subscriptionGuard };
