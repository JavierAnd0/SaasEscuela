'use strict';

require('dotenv').config();

const path    = require('path');
const express = require('express');
const { getHelmet, getCors, getGeneralLimiter, getAILimiter, getAuthLimiter } = require('./presentation/middlewares/security.middleware');
const { errorHandler } = require('./presentation/middlewares/errorHandler.middleware');

// Routers
const authRouter          = require('./presentation/auth/auth.routes');
const attendanceRouter    = require('./presentation/attendance/attendance.routes');
const gradesRouter        = require('./presentation/grades/grades.routes');
const schoolsRouter       = require('./presentation/schools/schools.routes');
const studentsRouter      = require('./presentation/students/students.routes');
const dashboardRouter     = require('./presentation/dashboard/dashboard.routes');
const academicRouter      = require('./presentation/academic/academic.routes');
const usersRouter         = require('./presentation/users/users.routes');
const assignmentsRouter   = require('./presentation/assignments/assignments.routes');
const consolidationRouter = require('./presentation/consolidation/consolidation.routes');
const commentsRouter      = require('./presentation/comments/comments.routes');
const reportCardsRouter   = require('./presentation/report-cards/report-cards.routes');
const deliveryRouter      = require('./presentation/delivery/delivery.routes');
const portalRouter        = require('./presentation/portal/portal.routes');

const app = express();

// Necesario para que express-rate-limit obtenga la IP real detrás de Nginx/proxies
app.set('trust proxy', 1);

// ─── Seguridad HTTP ───────────────────────────────────────────────────────────
app.use(getHelmet());
app.use(getCors());
app.use(express.json({ limit: '10mb' }));   // limite para imágenes en base64
app.use(express.urlencoded({ extended: true }));

// ─── Rate limiting ────────────────────────────────────────────────────────────
app.use('/api/v1/auth', getAuthLimiter());
app.use('/api/v1/comments/generate', getAILimiter());
app.use('/api/v1', getGeneralLimiter());

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use('/api/v1/auth',        authRouter);
app.use('/api/v1/schools',     schoolsRouter);
app.use('/api/v1/students',    studentsRouter);
app.use('/api/v1/attendance',  attendanceRouter);
app.use('/api/v1/grades',      gradesRouter);
app.use('/api/v1/dashboard',   dashboardRouter);
// Datos de referencia académica (grupos, períodos, materias)
app.use('/api/v1',             academicRouter);
app.use('/api/v1/users',       usersRouter);
app.use('/api/v1/assignments',   assignmentsRouter);
app.use('/api/v1/consolidation', consolidationRouter);
app.use('/api/v1/comments',      commentsRouter);
app.use('/api/v1/report-cards',  reportCardsRouter);
app.use('/api/v1/delivery',      deliveryRouter);
app.use('/api/v1/portal',        portalRouter);
// Static file serving for generated PDFs — requiere token válido para cada archivo.
// En producción los PDFs deben servirse desde Cloudflare R2 con URLs firmadas.
// Este middleware es solo para desarrollo local; no exponer en producción sin auth.
if (process.env.NODE_ENV !== 'production') {
  app.use('/storage', express.static(path.join(__dirname, '..', 'storage')));
}

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Recurso no encontrado.' });
});

// ─── Error handler central ───────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
