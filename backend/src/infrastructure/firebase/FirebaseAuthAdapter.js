'use strict';

const admin = require('firebase-admin');

let initialized = false;

function initializeFirebase() {
  if (initialized) return;
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
  initialized = true;
}

/**
 * Adaptador de Firebase Authentication para el backend.
 * Implementa el puerto de autenticación usando firebase-admin.
 */
class FirebaseAuthAdapter {
  constructor() {
    initializeFirebase();
  }

  /**
   * Verifica un ID token de Firebase y retorna los claims del usuario.
   * Los claims personalizados (schoolId, role) son inyectados por setUserRole().
   *
   * @param {string} idToken
   * @returns {Promise<{ uid: string, email: string, schoolId: string|null, role: string|null }>}
   */
  async verifyToken(idToken) {
    const decoded = await admin.auth().verifyIdToken(idToken);
    return {
      uid:      decoded.uid,
      email:    decoded.email,
      schoolId: decoded.schoolId || null,
      role:     decoded.role     || null,
    };
  }

  /**
   * Asigna el colegio y rol a un usuario Firebase via custom claims.
   * Esto persiste en el token que el cliente refresca.
   *
   * @param {string} uid
   * @param {string|null} schoolId
   * @param {string} role - superadmin|school_admin|coordinator|teacher|parent
   */
  async setUserRole(uid, schoolId, role) {
    await admin.auth().setCustomUserClaims(uid, { schoolId, role });
  }

  /**
   * Crea un usuario en Firebase Authentication
   * @param {{ email: string, password: string, displayName?: string }} data
   * @returns {Promise<{ uid: string, email: string }>}
   */
  async createUser({ email, password, displayName }) {
    const user = await admin.auth().createUser({ email, password, displayName });
    return { uid: user.uid, email: user.email };
  }

  /**
   * Elimina un usuario de Firebase Authentication
   * @param {string} uid
   */
  async deleteUser(uid) {
    await admin.auth().deleteUser(uid);
  }

  /**
   * Obtiene el usuario de Firebase por UID
   * @param {string} uid
   */
  async getUser(uid) {
    return admin.auth().getUser(uid);
  }

  /**
   * Actualiza la contraseña de un usuario en Firebase
   * @param {string} uid
   * @param {string} newPassword
   */
  async updatePassword(uid, newPassword) {
    await admin.auth().updateUser(uid, { password: newPassword });
  }

  /**
   * Deshabilita o habilita un usuario en Firebase
   * @param {string} uid
   * @param {boolean} disabled
   */
  async setDisabled(uid, disabled) {
    await admin.auth().updateUser(uid, { disabled });
  }

  /**
   * Obtiene un usuario de Firebase por email.
   * Útil para sincronizar cuando el email ya existe en Firebase pero no en la DB.
   * @param {string} email
   * @returns {Promise<admin.auth.UserRecord>}
   */
  async getUserByEmail(email) {
    return admin.auth().getUserByEmail(email);
  }
}

module.exports = { FirebaseAuthAdapter };
