'use strict';

const { FirebaseAuthAdapter } = require('../../infrastructure/firebase/FirebaseAuthAdapter');
const db = require('../../infrastructure/database/knex/config');

const firebaseAuth = new FirebaseAuthAdapter();

/**
 * Middleware: verifica el Firebase ID token en el header Authorization.
 * Inyecta req.user = { uid, email, schoolId, role, dbId } para uso en capas superiores.
 *
 * dbId: UUID interno del usuario en PostgreSQL, necesario para foreign keys
 * en tablas como grades, teacher_assignments, etc.
 */
async function firebaseAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autorización requerido.' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const firebaseUser = await firebaseAuth.verifyToken(idToken);

    // Resuelve el UUID interno para uso en relaciones de base de datos
    const dbUser = await db('users')
      .where({ firebase_uid: firebaseUser.uid })
      .select('id')
      .first();

    req.user = { ...firebaseUser, dbId: dbUser?.id ?? null };
    next();
  } catch (err) {
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token expirado. Por favor inicie sesión nuevamente.' });
    }
    return res.status(401).json({ error: 'Token inválido.' });
  }
}

module.exports = { firebaseAuthMiddleware };
