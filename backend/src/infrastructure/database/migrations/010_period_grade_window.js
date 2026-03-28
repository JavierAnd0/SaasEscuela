'use strict';

/**
 * Agrega a la tabla `periods` las columnas para delimitar
 * la ventana de ingreso de notas de forma independiente al
 * rango de fechas del período (que controla la asistencia).
 *
 * grades_open_from  → desde cuándo los docentes pueden subir notas
 * grades_open_until → hasta cuándo pueden subir notas
 *
 * Ambas son opcionales (nullable). Si no se configuran, el único
 * control es el flag manual `is_closed`.
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('periods', (t) => {
    t.date('grades_open_from').nullable();
    t.date('grades_open_until').nullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('periods', (t) => {
    t.dropColumn('grades_open_from');
    t.dropColumn('grades_open_until');
  });
};
