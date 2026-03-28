'use strict';

const db = require('../../infrastructure/database/knex/config');

/**
 * Middleware: rechaza la solicitud con 422 si el período indicado en
 * req.body.periodId está cerrado (is_closed = true).
 *
 * Uso: añadir antes del controller en rutas POST que modifican datos
 * académicos (notas, asistencia).
 */
async function requireOpenPeriod(req, res, next) {
  try {
    const { periodId } = req.body;

    if (!periodId) {
      // El validador de esquema ya debe exigir periodId; si no viene, lo dejamos pasar.
      return next();
    }

    const period = await db('periods')
      .where({ id: periodId, school_id: req.schoolId })
      .select('id', 'name', 'is_closed')
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

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireOpenPeriod };
