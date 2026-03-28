'use strict';

/**
 * Migration 009: Agrega materia (subject_id) al registro de asistencia.
 *
 * Antes: un registro por (student_id, record_date)  → asistencia general del día
 * Ahora: un registro por (student_id, record_date, subject_id) → asistencia por materia
 *
 * Se mantiene la columna nullable para preservar registros históricos sin materia.
 * La restricción de unicidad se reemplaza por un índice parcial que cubre
 * exclusivamente los registros con subject_id, más el índice legado para los sin subject.
 */

exports.up = async (knex) => {
  // 1. Agregar columna subject_id (nullable para registros históricos)
  await knex.schema.alterTable('attendance_records', (t) => {
    t.uuid('subject_id').references('id').inTable('subjects').onDelete('SET NULL').nullable();
  });

  // 2. Eliminar el índice único antiguo (student_id, record_date)
  await knex.raw(`
    ALTER TABLE attendance_records
    DROP CONSTRAINT IF EXISTS attendance_records_student_id_record_date_unique
  `);

  // 3. Índice parcial: unicidad por materia (registros nuevos con subject_id)
  await knex.raw(`
    CREATE UNIQUE INDEX attendance_records_student_date_subject_unique
    ON attendance_records (student_id, record_date, subject_id)
    WHERE subject_id IS NOT NULL
  `);

  // 4. Índice parcial: unicidad sin materia (registros legado sin subject_id)
  await knex.raw(`
    CREATE UNIQUE INDEX attendance_records_student_date_no_subject_unique
    ON attendance_records (student_id, record_date)
    WHERE subject_id IS NULL
  `);

  // 5. Índice de búsqueda por subject_id
  await knex.schema.table('attendance_records', (t) => {
    t.index(['school_id', 'classroom_id', 'subject_id', 'record_date']);
  });
};

exports.down = async (knex) => {
  await knex.raw('DROP INDEX IF EXISTS attendance_records_student_date_subject_unique');
  await knex.raw('DROP INDEX IF EXISTS attendance_records_student_date_no_subject_unique');
  await knex.schema.alterTable('attendance_records', (t) => {
    t.dropIndex(['school_id', 'classroom_id', 'subject_id', 'record_date']);
    t.dropColumn('subject_id');
  });
  await knex.schema.alterTable('attendance_records', (t) => {
    t.unique(['student_id', 'record_date']);
  });
};
