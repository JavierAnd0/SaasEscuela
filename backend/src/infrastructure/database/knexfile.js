'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

/**
 * Configuración de Knex.js para PostgreSQL.
 * Usa queries parametrizadas automáticamente — protección nativa contra SQL injection.
 */
module.exports = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL || {
      host:     'localhost',
      port:     5432,
      user:     'saascolegio',
      password: 'saascolegio_dev',
      database: 'saascolegio',
    },
    pool: { min: 2, max: 10 },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './seeds',
    },
  },

  production: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    pool: { min: 2, max: 20 },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
    },
  },
};
