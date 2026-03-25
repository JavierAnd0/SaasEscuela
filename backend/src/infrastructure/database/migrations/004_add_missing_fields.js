'use strict';

/**
 * Migration 004: Agrega campos faltantes para gestión de usuarios y entrega a padres.
 *
 * - users.document_number  — Cédula del docente/coordinador (para identificación)
 * - students.parent_email  — Email del acudiente para envío de boletines (Módulo 5)
 * - students.parent_phone  — WhatsApp del acudiente para envío vía Twilio
 * - students.parent_name   — Nombre del acudiente
 */

exports.up = async (knex) => {
  // Campos para usuarios del sistema (docentes, coordinadores, rectores)
  await knex.schema.alterTable('users', (t) => {
    t.string('document_number', 20);          // Cédula de ciudadanía
  });

  // Campos para contacto con el acudiente del estudiante
  await knex.schema.alterTable('students', (t) => {
    t.string('parent_name', 200);             // Nombre del acudiente
    t.string('parent_email', 254);            // Email del acudiente
    t.string('parent_phone', 20);             // WhatsApp del acudiente (formato E.164)
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('document_number');
  });

  await knex.schema.alterTable('students', (t) => {
    t.dropColumn('parent_name');
    t.dropColumn('parent_email');
    t.dropColumn('parent_phone');
  });
};
