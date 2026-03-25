'use strict';

/**
 * Middleware: inyecta req.schoolId desde el custom claim de Firebase.
 * Debe ejecutarse DESPUÉS de firebaseAuthMiddleware.
 *
 * Garantiza multi-tenancy: todos los controladores y repositorios
 * deben usar req.schoolId para filtrar datos. Un docente o coordinador
 * NUNCA puede ver datos de otro colegio.
 */
function tenantMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Autenticación requerida.' });
  }

  // superadmin no tiene schoolId (puede ver todos los colegios)
  if (req.user.role === 'superadmin') {
    req.schoolId = req.params.schoolId || req.query.schoolId || null;
    return next();
  }

  if (!req.user.schoolId) {
    return res.status(403).json({
      error: 'Usuario sin colegio asignado. Contacte al administrador.',
    });
  }

  req.schoolId = req.user.schoolId;
  next();
}

module.exports = { tenantMiddleware };
