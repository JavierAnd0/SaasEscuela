'use strict';

/**
 * Migration 001: Esquema base — colegios, usuarios, estructura académica, estudiantes
 * Normativa: Decreto 1290/2009, Ley 1581/2012, Ley 115/1994
 */

exports.up = async (knex) => {
  // ─── Extensiones ───────────────────────────────────────────────────────────
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  // ─── schools (tenants) ─────────────────────────────────────────────────────
  await knex.schema.createTable('schools', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 200).notNullable();
    t.string('nit', 20).unique();                  // NIT colombiano
    t.string('slug', 100).unique().notNullable();   // subdominio: colegio-xyz
    t.string('dane_code', 12);                      // código DANE del colegio
    t.text('logo_url');
    t.string('primary_color', 7).defaultTo('#1E3A8A');
    t.string('address', 300);
    t.string('phone', 20);
    t.string('city', 100);
    t.string('department', 100);
    t.string('subscription_plan', 50).defaultTo('trial');
    t.string('subscription_status', 20).defaultTo('trial'); // trial|active|suspended
    t.timestamp('trial_ends_at');
    t.timestamps(true, true);
  });

  // ─── school_siee_config (Decreto 1290 — config por colegio) ───────────────
  await knex.schema.createTable('school_siee_config', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE').notNullable();
    // Nombres y umbrales de niveles — cada colegio define los suyos (Decreto 1290)
    t.string('level_superior_name', 100).defaultTo('Superior');
    t.decimal('level_superior_min', 3, 1).defaultTo(4.6);
    t.string('level_alto_name', 100).defaultTo('Alto');
    t.decimal('level_alto_min', 3, 1).defaultTo(4.0);
    t.string('level_basico_name', 100).defaultTo('Básico');
    t.decimal('level_basico_min', 3, 1).defaultTo(3.0);
    t.string('level_bajo_name', 100).defaultTo('Bajo');
    t.decimal('level_bajo_min', 3, 1).defaultTo(1.0);
    t.decimal('min_passing_grade', 3, 1).defaultTo(3.0); // mínimo aprobatorio nacional
    t.unique(['school_id']);
  });

  // ─── users ─────────────────────────────────────────────────────────────────
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.string('firebase_uid', 128).unique().notNullable(); // UID de Firebase Auth
    t.string('email', 254).unique().notNullable();
    t.string('first_name', 100).notNullable();
    t.string('last_name', 100).notNullable();
    t.string('role', 30).notNullable();   // superadmin|school_admin|coordinator|teacher|parent
    t.string('phone_whatsapp', 20);       // formato E.164 para Twilio
    t.boolean('is_active').defaultTo(true);
    t.timestamp('last_login_at');
    t.timestamps(true, true);
    // superadmin: school_id NULL
    // demás roles: school_id NOT NULL
  });

  // ─── data_consent (Ley 1581/2012 — protección datos menores) ─────────────
  await knex.schema.createTable('data_consent', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE').notNullable();
    t.uuid('parent_user_id').references('id').inTable('users');
    t.uuid('student_id');               // se referenciará cuando exista la tabla students
    t.boolean('consented').notNullable();
    t.timestamp('consent_date').defaultTo(knex.fn.now());
    t.specificType('ip_address', 'inet');
    t.text('consent_text');             // snapshot del texto al momento del consentimiento
  });

  // ─── academic_years ────────────────────────────────────────────────────────
  await knex.schema.createTable('academic_years', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE').notNullable();
    t.string('name', 50).notNullable();    // '2026'
    t.date('start_date').notNullable();    // 2026-01-26 (calendario MEN)
    t.date('end_date').notNullable();      // 2026-11-29
    t.boolean('is_active').defaultTo(false);
    t.timestamps(true, true);
    t.unique(['school_id', 'name']);
  });

  // ─── periods (períodos académicos — típicamente 4 en Colombia) ─────────────
  await knex.schema.createTable('periods', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE').notNullable();
    t.uuid('academic_year_id').references('id').inTable('academic_years').onDelete('CASCADE').notNullable();
    t.integer('period_number').notNullable();          // 1, 2, 3, 4
    t.string('name', 50);                              // 'Primer Período'
    t.date('start_date');
    t.date('end_date');
    t.decimal('weight_percent', 5, 2);                // 40.00 (todos deben sumar 100)
    t.boolean('is_closed').defaultTo(false);
    t.timestamp('closed_at');
    t.timestamps(true, true);
    t.unique(['school_id', 'academic_year_id', 'period_number']);
  });

  // ─── grade_levels (grados: 1° a 11°, preescolar, etc.) ────────────────────
  await knex.schema.createTable('grade_levels', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE').notNullable();
    t.string('name', 50).notNullable();   // 'Grado 1°', 'Grado 11°', 'Preescolar'
    t.integer('sort_order');
    t.unique(['school_id', 'name']);
  });

  // ─── classrooms (grupos: 9A, 11-01) ───────────────────────────────────────
  await knex.schema.createTable('classrooms', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE').notNullable();
    t.uuid('grade_level_id').references('id').inTable('grade_levels').onDelete('CASCADE');
    t.uuid('academic_year_id').references('id').inTable('academic_years').onDelete('CASCADE');
    t.uuid('director_teacher_id').references('id').inTable('users');  // director de grupo
    t.string('name', 50).notNullable();   // '9A', '11-01'
    t.timestamps(true, true);
    t.unique(['school_id', 'academic_year_id', 'grade_level_id', 'name']);
  });

  // ─── subjects (asignaturas) ────────────────────────────────────────────────
  await knex.schema.createTable('subjects', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE').notNullable();
    t.string('name', 100).notNullable();    // 'Matemáticas', 'Lenguaje'
    t.string('code', 20);
    t.string('area', 100);                  // 'Ciencias Naturales', 'Humanidades'
    t.timestamps(true, true);
    t.unique(['school_id', 'name']);
  });

  // ─── teacher_assignments ───────────────────────────────────────────────────
  await knex.schema.createTable('teacher_assignments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE').notNullable();
    t.uuid('teacher_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    t.uuid('classroom_id').references('id').inTable('classrooms').onDelete('CASCADE').notNullable();
    t.uuid('subject_id').references('id').inTable('subjects').onDelete('CASCADE').notNullable();
    t.uuid('academic_year_id').references('id').inTable('academic_years').onDelete('CASCADE');
    t.timestamps(true, true);
    t.unique(['school_id', 'teacher_id', 'classroom_id', 'subject_id', 'academic_year_id']);
  });

  // ─── students ──────────────────────────────────────────────────────────────
  await knex.schema.createTable('students', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE').notNullable();
    t.string('document_type', 10).defaultTo('TI');   // TI (Tarjeta Identidad), CC, CE
    t.string('document_number', 30);
    t.string('first_name', 100).notNullable();
    t.string('last_name', 100).notNullable();
    t.date('date_of_birth');
    t.string('gender', 20);
    t.date('enrollment_date');
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
    t.unique(['school_id', 'document_type', 'document_number']);
  });

  // ─── student_classroom (matrícula por año) ─────────────────────────────────
  await knex.schema.createTable('student_classroom', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('student_id').references('id').inTable('students').onDelete('CASCADE').notNullable();
    t.uuid('classroom_id').references('id').inTable('classrooms').onDelete('CASCADE').notNullable();
    t.uuid('academic_year_id').references('id').inTable('academic_years').notNullable();
    t.string('enrollment_status', 20).defaultTo('active'); // active|withdrawn|promoted
    t.timestamps(true, true);
    t.unique(['student_id', 'classroom_id', 'academic_year_id']);
  });

  // ─── student_parents ───────────────────────────────────────────────────────
  await knex.schema.createTable('student_parents', (t) => {
    t.uuid('student_id').references('id').inTable('students').onDelete('CASCADE').notNullable();
    t.uuid('parent_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    t.string('relationship', 50);   // 'madre', 'padre', 'acudiente'
    t.primary(['student_id', 'parent_id']);
  });

  // ─── Índices de performance ────────────────────────────────────────────────
  await knex.schema.table('users', (t) => {
    t.index(['school_id', 'role']);
    t.index(['firebase_uid']);
  });
  await knex.schema.table('students', (t) => {
    t.index(['school_id', 'is_active']);
  });
  await knex.schema.table('classrooms', (t) => {
    t.index(['school_id', 'academic_year_id']);
  });
};

exports.down = async (knex) => {
  const tables = [
    'student_parents',
    'student_classroom',
    'students',
    'teacher_assignments',
    'subjects',
    'classrooms',
    'grade_levels',
    'periods',
    'academic_years',
    'data_consent',
    'users',
    'school_siee_config',
    'schools',
  ];
  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
};
