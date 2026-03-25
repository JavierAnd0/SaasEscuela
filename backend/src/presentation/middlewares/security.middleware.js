'use strict';

const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

/**
 * Middlewares de seguridad HTTP:
 * - Helmet: headers de seguridad (X-Frame-Options, CSP, etc.)
 * - CORS: whitelist de orígenes permitidos
 * - Rate limiting: protección contra abuso y brute-force
 */

function getHelmet() {
  return helmet();
}

function getCors() {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map(o => o.trim());

  return cors({
    origin: (origin, callback) => {
      // Permite requests sin origin (apps móviles, Postman en dev)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS bloqueado para origen: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
}

/** Rate limiter general: 300 req/min por IP */
function getGeneralLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes. Intente en un momento.' },
  });
}

/** Rate limiter para endpoints de IA: 20 req/min por IP */
function getAILimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Límite de generación IA alcanzado. Espere un momento.' },
  });
}

/** Rate limiter para login/auth: 10 req/min por IP (anti brute-force) */
function getAuthLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos. Espere un minuto.' },
  });
}

module.exports = { getHelmet, getCors, getGeneralLimiter, getAILimiter, getAuthLimiter };
