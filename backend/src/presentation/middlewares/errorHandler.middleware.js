'use strict';

const Sentry = require('@sentry/node');

/**
 * Manejador central de errores.
 * Debe registrarse DESPUÉS de Sentry.setupExpressErrorHandler() y ÚLTIMO en app.js.
 *
 * Flujo:
 *   1. Sentry captura el error con contexto (schoolId, userId, ruta)
 *   2. Se clasifica el error por tipo conocido (ValidationError, NotFoundError, etc.)
 *   3. En producción, los errores 500 no exponen detalles internos al cliente
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // ─── Log estructurado ────────────────────────────────────────────────────
  console.error({
    message:  err.message,
    stack:    process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path:     req.path,
    method:   req.method,
    schoolId: req.schoolId,
    userId:   req.user?.uid,
  });

  // ─── Captura en Sentry con contexto completo ──────────────────────────
  // Solo captura errores 5xx (los 4xx son errores del cliente, no bugs)
  const status = err.statusCode || err.status || 500;
  const isServerError = status >= 500;

  if (isServerError) {
    Sentry.withScope((scope) => {
      scope.setUser({
        id:    req.user?.uid   ?? 'anonymous',
        email: req.user?.email ?? undefined,
      });
      scope.setTag('schoolId', req.schoolId ?? 'none');
      scope.setTag('role', req.user?.role ?? 'none');
      scope.setContext('request_info', {
        path:   req.path,
        method: req.method,
        query:  req.query,
      });
      Sentry.captureException(err);
    });
  }

  // ─── Errores de dominio conocidos ────────────────────────────────────
  if (err.name === 'ValidationError') {
    return res.status(422).json({ error: err.message });
  }

  if (err.name === 'NotFoundError') {
    return res.status(404).json({ error: err.message });
  }

  if (err.name === 'ForbiddenError') {
    return res.status(403).json({ error: err.message });
  }

  // ─── Error genérico — no exponer internos en producción ──────────────
  const message = process.env.NODE_ENV === 'production' && isServerError
    ? 'Error interno del servidor.'
    : err.message;

  res.status(status).json({ error: message });
}

/**
 * Error personalizado para entidades no encontradas
 */
class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Error personalizado para acceso denegado
 */
class ForbiddenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Error personalizado para validaciones de dominio
 */
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

module.exports = { errorHandler, NotFoundError, ForbiddenError, ValidationError };
