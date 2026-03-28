'use strict';

/**
 * Migration 008: Agrega número de documento del acudiente en students.
 *
 * parent_document_number — Cédula de ciudadanía (CC) del padre/madre/acudiente.
 * Se usa para crear cuentas masivas de padres en el portal familiar:
 * el admin genera las cuentas usando este campo como identificador;
 * el CC se establece como contraseña inicial que el padre debe cambiar.
 */

exports.up = async (knex) => {
  await knex.schema.alterTable('students', (t) => {
    t.string('parent_document_number', 30).nullable();   // CC del acudiente
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('students', (t) => {
    t.dropColumn('parent_document_number');
  });
};
