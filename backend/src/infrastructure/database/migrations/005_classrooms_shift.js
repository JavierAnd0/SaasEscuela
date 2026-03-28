'use strict';

/**
 * Migration 005: Agrega campo shift (jornada) a classrooms.
 *
 * Un colegio puede tener múltiples jornadas (mañana, tarde, noche, única, sabatina).
 * El campo es opcional para no romper datos existentes — NULL se interpreta como 'única'.
 */

exports.up = async (knex) => {
  const hasShift = await knex.schema.hasColumn('classrooms', 'shift');

  if (!hasShift) {
    await knex.schema.alterTable('classrooms', (t) => {
      // mañana | tarde | noche | única | sabatina
      t.string('shift', 30).defaultTo('única').notNullable();
    });
  }

  // Para classrooms existentes que no tengan shift, asignar 'única'
  await knex.raw(`UPDATE classrooms SET shift = 'única' WHERE shift IS NULL`);
};

exports.down = async (knex) => {
  await knex.schema.alterTable('classrooms', (t) => {
    t.dropColumn('shift');
  });
};
