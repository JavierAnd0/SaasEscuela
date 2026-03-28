'use strict';

/**
 * Migration 006: Agrega la columna shift a classrooms de forma segura.
 *
 * La migración 005 usó `.alter()` asumiendo que shift existía — incorrecto.
 * Esta migración verifica primero con hasColumn() antes de alterar.
 */
exports.up = async (knex) => {
  const hasShift = await knex.schema.hasColumn('classrooms', 'shift');

  if (!hasShift) {
    await knex.schema.alterTable('classrooms', (t) => {
      t.string('shift', 30).defaultTo('única').notNullable();
    });
  }

  // Rellenar cualquier null existente (para filas creadas antes de este campo)
  await knex.raw(`UPDATE classrooms SET shift = 'única' WHERE shift IS NULL`);
};

exports.down = async (knex) => {
  const hasShift = await knex.schema.hasColumn('classrooms', 'shift');
  if (hasShift) {
    await knex.schema.alterTable('classrooms', (t) => {
      t.dropColumn('shift');
    });
  }
};
