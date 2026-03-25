'use strict';

/**
 * Manejador central de errores.
 * Debe registrarse ÚLTIMO en app.js (después de todas las rutas).
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Log estructurado
  console.error({
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    schoolId: req.schoolId,
    userId: req.user?.uid,
  });

  // Errores de dominio conocidos
  if (err.name === 'ValidationError') {
    return res.status(422).json({ error: err.message });
  }

  if (err.name === 'NotFoundError') {
    return res.status(404).json({ error: err.message });
  }

  if (err.name === 'ForbiddenError') {
    return res.status(403).json({ error: err.message });
  }

  // Error genérico — no exponer detalles internos en producción
  const status = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
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
