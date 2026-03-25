'use strict';

/**
 * Script de bootstrap para desarrollo.
 *
 * Uso:
 *   node scripts/bootstrap-admin.js <FIREBASE_UID> <EMAIL>
 *
 * Ejemplo:
 *   node scripts/bootstrap-admin.js abc123XYZ... coordinador@sanjose.edu.co
 *
 * Qué hace:
 *  1. Crea (o reutiliza) el colegio demo en PostgreSQL
 *  2. Inserta (o actualiza) el registro de usuario vinculando el UID real
 *  3. Asigna los custom claims en Firebase (schoolId + role = coordinator)
 *
 * Después de correrlo, el usuario debe cerrar sesión y volver a entrar
 * para que el token se refresque con los nuevos claims.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

// ─── Validar argumentos ────────────────────────────────────────────────────
const [, , firebaseUid, email] = process.argv;

if (!firebaseUid || !email) {
  console.error('\n❌  Uso: node scripts/bootstrap-admin.js <FIREBASE_UID> <EMAIL>\n');
  console.error('   El FIREBASE_UID lo encuentra en Firebase Console → Authentication → Users\n');
  process.exit(1);
}

// ─── Inicializar Firebase Admin ────────────────────────────────────────────
admin.initializeApp({
  credential: admin.credential.cert({
    projectId:   process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

// ─── Inicializar Knex ──────────────────────────────────────────────────────
const knex = require('../src/infrastructure/database/knex/config');

async function bootstrap() {
  console.log('\n🚀  Iniciando bootstrap de administrador...\n');

  // 1. Colegio demo
  let school = await knex('schools').where({ slug: 'san-jose-demo' }).first();

  if (!school) {
    const schoolId = uuidv4();
    await knex('schools').insert({
      id:                  schoolId,
      name:                'Colegio San José Demo',
      slug:                'san-jose-demo',
      nit:                 '900123456-1',
      dane_code:           '11001012345',
      city:                'Bogotá',
      department:          'Cundinamarca',
      primary_color:       '#1E3A8A',
      subscription_plan:   'trial',
      subscription_status: 'trial',
      trial_ends_at:       new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await knex('school_siee_config').insert({ school_id: schoolId });
    school = await knex('schools').where({ id: schoolId }).first();
    console.log(`   ✅  Colegio creado: ${school.name} (${school.id})`);
  } else {
    console.log(`   ♻️   Colegio existente reutilizado: ${school.name} (${school.id})`);
  }

  const schoolId = school.id;

  // 2. Usuario en PostgreSQL
  const existingUser = await knex('users').where({ firebase_uid: firebaseUid }).first();

  if (existingUser) {
    await knex('users')
      .where({ firebase_uid: firebaseUid })
      .update({ school_id: schoolId, role: 'coordinator', updated_at: knex.fn.now() });
    console.log(`   ♻️   Usuario actualizado en DB: ${email}`);
  } else {
    // Intentar actualizar por email si existe con UID ficticio
    const byEmail = await knex('users').where({ email }).first();
    if (byEmail) {
      await knex('users')
        .where({ email })
        .update({ firebase_uid: firebaseUid, school_id: schoolId, role: 'coordinator', updated_at: knex.fn.now() });
      console.log(`   ♻️   UID actualizado para usuario existente: ${email}`);
    } else {
      await knex('users').insert({
        id:           uuidv4(),
        school_id:    schoolId,
        firebase_uid: firebaseUid,
        email,
        first_name:   'Admin',
        last_name:    'Demo',
        role:         'coordinator',
        is_active:    true,
      });
      console.log(`   ✅  Usuario creado en DB: ${email}`);
    }
  }

  // 3. Custom claims en Firebase
  await admin.auth().setCustomUserClaims(firebaseUid, {
    schoolId,
    role: 'coordinator',
  });
  console.log(`   ✅  Custom claims asignados en Firebase:`);
  console.log(`         schoolId → ${schoolId}`);
  console.log(`         role     → coordinator`);

  console.log('\n✅  Bootstrap completado.\n');
  console.log('   ⚠️   Cierre sesión en el navegador y vuelva a ingresar');
  console.log('        para que el token de Firebase se refresque con los nuevos claims.\n');
}

bootstrap()
  .catch((err) => {
    console.error('\n❌  Error durante el bootstrap:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await knex.destroy();
    admin.app().delete();
  });
