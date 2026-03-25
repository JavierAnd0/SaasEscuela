'use strict';

/**
 * Migration 003: Módulo de notas y consolidación
 * Normativa: escala 1.0–5.0, Decreto 1290/2009
 */

exports.up = async (knex) => {
  // ─── grades (notas individuales) ──────────────────────────────────────────
  await knex.schema.createTable('grades', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE').notNullable();
    t.uuid('student_id').references('id').inTable('students').onDelete('CASCADE').notNullable();
    t.uuid('subject_id').references('id').inTable('subjects').onDelete('CASCADE').notNullable();
    t.uuid('classroom_id').references('id').inTable('classrooms').onDelete('CASCADE').notNullable();
    t.uuid('period_id').references('id').inTable('periods').onDelete('CASCADE').notNullable();
    t.uuid('teacher_id').references('id').inTable('users');
    t.decimal('grade_value', 3, 1).notNullable();     // 1.0 – 5.0
    t.string('entry_method', 20).defaultTo('web');     // web|csv|whatsapp_ocr|google_forms
    t.text('raw_ocr_image_url');                        // si se ingresó por foto WhatsApp
    t.timestamps(true, true);
    t.unique(['student_id', 'subject_id', 'period_id']);
  });

  // CHECK: escala colombiana 1.0–5.0 (Decreto 1290)
  await knex.raw(`
    ALTER TABLE grades
    ADD CONSTRAINT chk_grade_value
    CHECK (grade_value >= 1.0 AND grade_value <= 5.0)
  `);

  await knex.raw(`
    ALTER TABLE grades
    ADD CONSTRAINT chk_grade_entry_method
    CHECK (entry_method IN ('web', 'csv', 'whatsapp_ocr', 'google_forms'))
  `);

  // ─── grade_entry_status (completitud por docente/período) ─────────────────
  await knex.schema.createTable('grade_entry_status', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE').notNullable();
    t.uuid('teacher_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    t.uuid('classroom_id').references('id').inTable('classrooms').onDelete('CASCADE').notNullable();
    t.uuid('subject_id').references('id').inTable('subjects').onDelete('CASCADE').notNullable();
    t.uuid('period_id').references('id').inTable('periods').onDelete('CASCADE').notNullable();
    t.integer('total_students').defaultTo(0);
    t.integer('grades_entered').defaultTo(0);
    t.boolean('is_complete').defaultTo(false);
    t.timestamp('completed_at');
    t.timestamp('alert_sent_at');
    t.timestamps(true, true);
    t.unique(['teacher_id', 'classroom_id', 'subject_id', 'period_id']);
  });

  // ─── student_period_summary (consolidado por período) ────────────────────
  await knex.schema.createTable('student_period_summary', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE').notNullable();
    t.uuid('student_id').references('id').inTable('students').onDelete('CASCADE').notNullable();
    t.uuid('classroom_id').references('id').inTable('classrooms');
    t.uuid('period_id').references('id').inTable('periods').onDelete('CASCADE').notNullable();
    t.decimal('period_average', 3, 1);
    t.decimal('weighted_contribution', 5, 2);   // promedio × peso / 100
    t.boolean('is_at_risk').defaultTo(false);    // promedio < min_passing_grade
    t.integer('failed_subjects_count').defaultTo(0);
    t.integer('classroom_rank');
    t.timestamp('computed_at');
    t.timestamps(true, true);
    t.unique(['student_id', 'period_id']);
  });

  // ─── student_year_summary (resultado anual) ───────────────────────────────
  await knex.schema.createTable('student_year_summary', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE').notNullable();
    t.uuid('student_id').references('id').inTable('students').onDelete('CASCADE').notNullable();
    t.uuid('classroom_id').references('id').inTable('classrooms');
    t.uuid('academic_year_id').references('id').inTable('academic_years');
    t.decimal('year_average', 3, 1);
    t.string('siee_level', 20);     // Superior|Alto|Básico|Bajo
    t.boolean('is_promoted');
    t.timestamp('computed_at');
    t.timestamps(true, true);
    t.unique(['student_id', 'academic_year_id']);
  });

  // ─── report_card_comments (comentarios IA + revisión docente) ─────────────
  await knex.schema.createTable('report_card_comments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE').notNullable();
    t.uuid('student_id').references('id').inTable('students').onDelete('CASCADE').notNullable();
    t.uuid('period_id').references('id').inTable('periods').onDelete('CASCADE').notNullable();
    t.text('ai_comment');            // output crudo de Claude
    t.text('final_comment');         // editado por docente o igual al ai_comment
    t.string('status', 20).defaultTo('pending');  // pending|approved|edited
    t.uuid('approved_by').references('id').inTable('users');
    t.timestamp('approved_at');
    t.integer('claude_tokens_used');
    t.timestamp('generated_at');
    t.timestamps(true, true);
    t.unique(['student_id', 'period_id']);
  });

  // ─── report_cards (PDFs generados) ───────────────────────────────────────
  await knex.schema.createTable('report_cards', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE').notNullable();
    t.uuid('student_id').references('id').inTable('students').onDelete('CASCADE').notNullable();
    t.uuid('period_id').references('id').inTable('periods').onDelete('CASCADE').notNullable();
    t.uuid('academic_year_id').references('id').inTable('academic_years');
    t.text('pdf_url');
    t.string('access_token', 128).unique();   // token para acceso de padres (30 días)
    t.timestamp('access_token_expires_at');
    t.timestamp('pdf_generated_at');
    t.integer('pdf_size_bytes');
    t.timestamps(true, true);
    t.unique(['student_id', 'period_id']);
  });

  // ─── delivery_logs ────────────────────────────────────────────────────────
  await knex.schema.createTable('delivery_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE').notNullable();
    t.uuid('report_card_id').references('id').inTable('report_cards').onDelete('CASCADE');
    t.uuid('student_id').references('id').inTable('students');
    t.uuid('parent_id').references('id').inTable('users');
    t.string('channel', 20).notNullable();           // whatsapp|email
    t.string('recipient', 254);                        // teléfono o email
    t.string('status', 20).defaultTo('pending');       // pending|sent|delivered|failed
    t.text('external_message_id');                     // Twilio SID o email MessageId
    t.timestamp('sent_at');
    t.timestamp('delivered_at');
    t.text('error_message');
    t.integer('retry_count').defaultTo(0);
    t.timestamps(true, true);
  });

  // ─── Índices ───────────────────────────────────────────────────────────────
  await knex.schema.table('grades', (t) => {
    t.index(['school_id', 'classroom_id', 'period_id']);
    t.index(['school_id', 'teacher_id', 'period_id']);
  });
  await knex.schema.table('student_period_summary', (t) => {
    t.index(['school_id', 'period_id', 'is_at_risk']);
  });
};

exports.down = async (knex) => {
  const tables = [
    'delivery_logs',
    'report_cards',
    'report_card_comments',
    'student_year_summary',
    'student_period_summary',
    'grade_entry_status',
    'grades',
  ];
  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
};
