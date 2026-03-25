'use strict';

/**
 * Migration 002: Módulo de asistencia
 * Normativa: asistencia obligatoria, justificada/injustificada (Ley 115/1994)
 */

exports.up = async (knex) => {
  // ─── attendance_records (registro diario) ─────────────────────────────────
  await knex.schema.createTable('attendance_records', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE').notNullable();
    t.uuid('student_id').references('id').inTable('students').onDelete('CASCADE').notNullable();
    t.uuid('classroom_id').references('id').inTable('classrooms').onDelete('CASCADE').notNullable();
    t.uuid('period_id').references('id').inTable('periods');
    t.date('record_date').notNullable();
    // Estados: Decreto 1290 — justificada/injustificada + tardanza
    t.string('status', 30).notNullable();
    // CHECK ejecutado via raw para compatibilidad
    t.text('justification');
    t.uuid('recorded_by').references('id').inTable('users');  // docente que registró
    t.timestamps(true, true);
    t.unique(['student_id', 'record_date']);
  });

  await knex.raw(`
    ALTER TABLE attendance_records
    ADD CONSTRAINT chk_attendance_status
    CHECK (status IN ('present', 'absent_justified', 'absent_unjustified', 'late'))
  `);

  // ─── attendance_period_summary (totales por período) ──────────────────────
  await knex.schema.createTable('attendance_period_summary', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE').notNullable();
    t.uuid('student_id').references('id').inTable('students').onDelete('CASCADE').notNullable();
    t.uuid('classroom_id').references('id').inTable('classrooms');
    t.uuid('period_id').references('id').inTable('periods').onDelete('CASCADE').notNullable();
    t.integer('total_days').defaultTo(0);
    t.integer('present_count').defaultTo(0);
    t.integer('absent_justified_count').defaultTo(0);
    t.integer('absent_unjustified_count').defaultTo(0);
    t.integer('late_count').defaultTo(0);
    t.decimal('attendance_rate', 5, 2);   // porcentaje (0–100)
    t.timestamp('computed_at');
    t.timestamps(true, true);
    t.unique(['student_id', 'period_id']);
  });

  // ─── Índices ───────────────────────────────────────────────────────────────
  await knex.schema.table('attendance_records', (t) => {
    t.index(['school_id', 'classroom_id', 'record_date']);
    t.index(['school_id', 'student_id', 'period_id']);
  });
  await knex.schema.table('attendance_period_summary', (t) => {
    t.index(['school_id', 'period_id']);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('attendance_period_summary');
  await knex.schema.dropTableIfExists('attendance_records');
};
