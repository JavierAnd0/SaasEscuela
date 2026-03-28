'use strict';

/**
 * Migration 007: Configuración SMTP por tenant.
 *
 * Permite que cada colegio configure su propio servidor de correo
 * saliente. Si no hay config SMTP, el sistema usa el servidor global
 * de la plataforma (variable de entorno SMTP_*).
 */
exports.up = async (knex) => {
  await knex.schema.createTable('school_smtp_config', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('school_id').notNullable().references('id').inTable('schools').onDelete('CASCADE').unique();

    t.string('smtp_host',       255);
    t.integer('smtp_port').defaultTo(587);
    t.boolean('smtp_secure').defaultTo(false);      // true = TLS/465, false = STARTTLS/587
    t.string('smtp_user',       255);
    t.text('smtp_pass');                             // cifrar en producción con pgcrypto o vault
    t.string('smtp_from_name',  255);
    t.string('smtp_from_email', 255);
    t.boolean('is_active').defaultTo(false);         // false hasta que el admin configure y active

    t.timestamps(true, true);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('school_smtp_config');
};
