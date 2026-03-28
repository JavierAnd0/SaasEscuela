'use strict';

const db = require('../../infrastructure/database/knex/config');

/** Formatea una fecha ISO como "15 ene. 2026" */
function fmt(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-CO', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/**
 * requireOpenPeriod — para ASISTENCIA.
 *
 * Bloquea si:
 *  1. is_closed = true  (cierre manual del coordinador)
 *  2. start_date existe y hoy < start_date  (período no ha iniciado)
 *  3. end_date existe   y hoy > end_date    (período ya finalizó)
 */
async function requireOpenPeriod(req, res, next) {
  try {
    const { periodId } = req.body;
    if (!periodId) return next();

    const period = await db('periods')
      .where({ id: periodId, school_id: req.schoolId })
      .select('id', 'name', 'is_closed', 'start_date', 'end_date')
      .first();

    if (!period) {
      return res.status(404).json({ error: 'Período no encontrado.' });
    }

    if (period.is_closed) {
      return res.status(422).json({
        error: `El período "${period.name}" está cerrado. No se pueden registrar cambios.`,
        code:  'PERIOD_CLOSED',
      });
    }

    const today = new Date().toISOString().slice(0, 10);

    if (period.start_date && today < period.start_date) {
      return res.status(422).json({
        error: `El período "${period.name}" aún no ha iniciado. Comienza el ${fmt(period.start_date)}.`,
        code:  'PERIOD_NOT_STARTED',
      });
    }

    if (period.end_date && today > period.end_date) {
      return res.status(422).json({
        error: `El período "${period.name}" finalizó el ${fmt(period.end_date)}.`,
        code:  'PERIOD_ENDED',
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * requireGradeWindow — para NOTAS.
 *
 * Bloquea si:
 *  1. is_closed = true          (cierre manual del coordinador)
 *  2. grades_open_from y hoy < grades_open_from  (ventana aún no abre)
 *  3. grades_open_until y hoy > grades_open_until (ventana ya cerró)
 *
 * Si no hay fechas de ventana configuradas solo aplica (1).
 */
async function requireGradeWindow(req, res, next) {
  try {
    const { periodId } = req.body;
    if (!periodId) return next();

    const period = await db('periods')
      .where({ id: periodId, school_id: req.schoolId })
      .select('id', 'name', 'is_closed', 'grades_open_from', 'grades_open_until')
      .first();

    if (!period) {
      return res.status(404).json({ error: 'Período no encontrado.' });
    }

    if (period.is_closed) {
      return res.status(422).json({
        error: `El período "${period.name}" está cerrado. No se pueden registrar notas.`,
        code:  'PERIOD_CLOSED',
      });
    }

    const today = new Date().toISOString().slice(0, 10);

    if (period.grades_open_from && today < period.grades_open_from) {
      return res.status(422).json({
        error: `La ventana de notas para "${period.name}" aún no está disponible. Abre el ${fmt(period.grades_open_from)}.`,
        code:  'GRADE_WINDOW_NOT_OPEN',
      });
    }

    if (period.grades_open_until && today > period.grades_open_until) {
      return res.status(422).json({
        error: `La ventana de notas para "${period.name}" cerró el ${fmt(period.grades_open_until)}.`,
        code:  'GRADE_WINDOW_CLOSED',
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireOpenPeriod, requireGradeWindow };
