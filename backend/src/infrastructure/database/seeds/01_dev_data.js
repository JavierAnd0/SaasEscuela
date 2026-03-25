'use strict';

/**
 * Seed de datos de desarrollo.
 * Crea: 1 colegio, estructura académica 2026, 3 docentes, 1 coordinador,
 * 5 asignaturas, 2 grupos (9A y 9B), 20 estudiantes.
 *
 * IMPORTANTE: Este seed usa firebase_uid ficticios.
 * En desarrollo, crear los usuarios reales en Firebase Console y
 * actualizar los firebase_uid aquí o usar el endpoint /auth/register-user.
 */

const { v4: uuidv4 } = require('uuid');

exports.seed = async (knex) => {
  // Limpia en orden inverso para respetar foreign keys
  await knex('student_classroom').del();
  await knex('student_parents').del();
  await knex('students').del();
  await knex('teacher_assignments').del();
  await knex('classrooms').del();
  await knex('subjects').del();
  await knex('grade_levels').del();
  await knex('periods').del();
  await knex('academic_years').del();
  await knex('school_siee_config').del();
  await knex('users').del();
  await knex('schools').del();

  // ─── Colegio ───────────────────────────────────────────────────────────────
  const schoolId = uuidv4();
  await knex('schools').insert({
    id:            schoolId,
    name:          'Colegio San José Demo',
    slug:          'san-jose-demo',
    nit:           '900123456-1',
    dane_code:     '11001012345',
    city:          'Bogotá',
    department:    'Cundinamarca',
    primary_color: '#1E3A8A',
    subscription_plan:   'trial',
    subscription_status: 'trial',
    trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
  });

  await knex('school_siee_config').insert({ school_id: schoolId });

  // ─── Usuarios ──────────────────────────────────────────────────────────────
  const coordId  = uuidv4();
  const teacher1 = uuidv4();
  const teacher2 = uuidv4();
  const teacher3 = uuidv4();

  await knex('users').insert([
    {
      id:           coordId,
      school_id:    schoolId,
      firebase_uid: 'DEV_COORD_UID_001',   // reemplazar con UID real de Firebase
      email:        'coordinador@sanjose.edu.co',
      first_name:   'Ana',
      last_name:    'Martínez',
      role:         'coordinator',
      phone_whatsapp: '+573001234567',
    },
    {
      id:           teacher1,
      school_id:    schoolId,
      firebase_uid: 'DEV_TEACHER_UID_001',
      email:        'docente.matematicas@sanjose.edu.co',
      first_name:   'Carlos',
      last_name:    'Pérez',
      role:         'teacher',
      phone_whatsapp: '+573009876543',
    },
    {
      id:           teacher2,
      school_id:    schoolId,
      firebase_uid: 'DEV_TEACHER_UID_002',
      email:        'docente.lenguaje@sanjose.edu.co',
      first_name:   'María',
      last_name:    'González',
      role:         'teacher',
    },
    {
      id:           teacher3,
      school_id:    schoolId,
      firebase_uid: 'DEV_TEACHER_UID_003',
      email:        'docente.ciencias@sanjose.edu.co',
      first_name:   'Jorge',
      last_name:    'Rodríguez',
      role:         'teacher',
    },
  ]);

  // ─── Año escolar 2026 ──────────────────────────────────────────────────────
  const yearId = uuidv4();
  await knex('academic_years').insert({
    id:         yearId,
    school_id:  schoolId,
    name:       '2026',
    start_date: '2026-01-26',   // calendario MEN Colombia 2026
    end_date:   '2026-11-29',
    is_active:  true,
  });

  // 4 períodos con pesos (40 + 20 + 20 + 20 = 100)
  const periodIds = [uuidv4(), uuidv4(), uuidv4(), uuidv4()];
  await knex('periods').insert([
    { id: periodIds[0], school_id: schoolId, academic_year_id: yearId, period_number: 1, name: 'Primer Período',   start_date: '2026-01-26', end_date: '2026-03-27', weight_percent: 40.00 },
    { id: periodIds[1], school_id: schoolId, academic_year_id: yearId, period_number: 2, name: 'Segundo Período',  start_date: '2026-03-30', end_date: '2026-06-19', weight_percent: 20.00 },
    { id: periodIds[2], school_id: schoolId, academic_year_id: yearId, period_number: 3, name: 'Tercer Período',   start_date: '2026-07-06', end_date: '2026-09-25', weight_percent: 20.00 },
    { id: periodIds[3], school_id: schoolId, academic_year_id: yearId, period_number: 4, name: 'Cuarto Período',   start_date: '2026-09-28', end_date: '2026-11-27', weight_percent: 20.00 },
  ]);

  // ─── Estructura académica ──────────────────────────────────────────────────
  const grade9Id = uuidv4();
  await knex('grade_levels').insert({
    id: grade9Id, school_id: schoolId, name: 'Grado 9°', sort_order: 9,
  });

  const classroom9A = uuidv4();
  const classroom9B = uuidv4();
  await knex('classrooms').insert([
    { id: classroom9A, school_id: schoolId, grade_level_id: grade9Id, academic_year_id: yearId, director_teacher_id: teacher1, name: '9A' },
    { id: classroom9B, school_id: schoolId, grade_level_id: grade9Id, academic_year_id: yearId, director_teacher_id: teacher2, name: '9B' },
  ]);

  // ─── Asignaturas ──────────────────────────────────────────────────────────
  const subjects = [
    { id: uuidv4(), school_id: schoolId, name: 'Matemáticas',    area: 'Ciencias Exactas' },
    { id: uuidv4(), school_id: schoolId, name: 'Lenguaje',        area: 'Humanidades' },
    { id: uuidv4(), school_id: schoolId, name: 'Ciencias Naturales', area: 'Ciencias Naturales' },
    { id: uuidv4(), school_id: schoolId, name: 'Inglés',           area: 'Humanidades' },
    { id: uuidv4(), school_id: schoolId, name: 'Ciencias Sociales', area: 'Ciencias Sociales' },
  ];
  await knex('subjects').insert(subjects);

  // ─── Asignaciones docentes ────────────────────────────────────────────────
  const mathSubject     = subjects.find(s => s.name === 'Matemáticas');
  const lenguajeSubject = subjects.find(s => s.name === 'Lenguaje');
  const cienciasSubject = subjects.find(s => s.name === 'Ciencias Naturales');

  await knex('teacher_assignments').insert([
    // Carlos Pérez → Matemáticas en 9A y 9B
    { id: uuidv4(), school_id: schoolId, teacher_id: teacher1, classroom_id: classroom9A, subject_id: mathSubject.id, academic_year_id: yearId },
    { id: uuidv4(), school_id: schoolId, teacher_id: teacher1, classroom_id: classroom9B, subject_id: mathSubject.id, academic_year_id: yearId },
    // María González → Lenguaje en 9A y 9B
    { id: uuidv4(), school_id: schoolId, teacher_id: teacher2, classroom_id: classroom9A, subject_id: lenguajeSubject.id, academic_year_id: yearId },
    { id: uuidv4(), school_id: schoolId, teacher_id: teacher2, classroom_id: classroom9B, subject_id: lenguajeSubject.id, academic_year_id: yearId },
    // Jorge Rodríguez → Ciencias en 9A
    { id: uuidv4(), school_id: schoolId, teacher_id: teacher3, classroom_id: classroom9A, subject_id: cienciasSubject.id, academic_year_id: yearId },
  ]);

  // ─── Estudiantes ──────────────────────────────────────────────────────────
  const studentNames = [
    ['Valentina', 'Ramírez'], ['Sebastián', 'López'],  ['Isabella', 'García'],
    ['Miguel', 'Hernández'],  ['Sofía', 'Torres'],      ['Mateo', 'Vargas'],
    ['Luciana', 'Mora'],      ['Daniel', 'Jiménez'],    ['Valeria', 'Ruiz'],
    ['Santiago', 'Díaz'],     ['Camila', 'Castro'],      ['Julián', 'Romero'],
    ['Mariana', 'Suárez'],    ['Alejandro', 'Medina'],  ['Natalia', 'Ortiz'],
    ['Nicolás', 'Guerrero'],  ['Paula', 'Sánchez'],      ['Andrés', 'Reyes'],
    ['Gabriela', 'Núñez'],   ['Juan Felipe', 'Vásquez'],
  ];

  const studentIds = studentNames.map((_, i) => uuidv4());

  await knex('students').insert(
    studentNames.map(([fn, ln], i) => ({
      id:              studentIds[i],
      school_id:       schoolId,
      document_type:   'TI',
      document_number: `100${String(i + 1).padStart(3, '0')}`,
      first_name:      fn,
      last_name:       ln,
      date_of_birth:   '2011-01-01',
      gender:          i % 2 === 0 ? 'F' : 'M',
    }))
  );

  // 10 estudiantes en 9A, 10 en 9B
  await knex('student_classroom').insert([
    ...studentIds.slice(0, 10).map(sid => ({
      id: uuidv4(), student_id: sid, classroom_id: classroom9A,
      academic_year_id: yearId, enrollment_status: 'active',
    })),
    ...studentIds.slice(10, 20).map(sid => ({
      id: uuidv4(), student_id: sid, classroom_id: classroom9B,
      academic_year_id: yearId, enrollment_status: 'active',
    })),
  ]);

  console.log('✅ Seed completado:');
  console.log(`   Colegio: ${schoolId}`);
  console.log(`   Coordinador UID Firebase: DEV_COORD_UID_001`);
  console.log(`   Docente 1 UID Firebase: DEV_TEACHER_UID_001`);
  console.log(`   Período activo: ${periodIds[0]} (Primer Período 2026)`);
  console.log(`   Grupos: 9A (${classroom9A}), 9B (${classroom9B})`);
};
