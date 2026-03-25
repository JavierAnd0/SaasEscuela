'use strict';

const VALID_ROLES = ['superadmin', 'school_admin', 'coordinator', 'teacher', 'parent'];

/**
 * Factory que genera un middleware de control de acceso por rol.
 *
 * @param {...string} allowedRoles - roles que tienen permiso
 * @returns {function} middleware de Express
 *
 * @example
 * router.post('/consolidation/calculate', auth, tenant, roles('coordinator', 'school_admin'), controller)
 */
function roles(...allowedRoles) {
  // Valida en tiempo de arranque que los roles sean válidos
  allowedRoles.forEach(role => {
    if (!VALID_ROLES.includes(role)) {
      throw new Error(`Rol inválido en middleware: "${role}". Válidos: ${VALID_ROLES.join(', ')}`);
    }
  });

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticación requerida.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Acceso denegado. Se requiere uno de estos roles: ${allowedRoles.join(', ')}.`,
      });
    }
    next();
  };
}

module.exports = { roles, VALID_ROLES };
