'use strict';

const router = require('express').Router();
const { firebaseAuthMiddleware } = require('../middlewares/firebaseAuth.middleware');
const { tenantMiddleware }       = require('../middlewares/tenant.middleware');
const { roles }                  = require('../middlewares/roles.middleware');
const { FirebaseAuthAdapter }    = require('../../infrastructure/firebase/FirebaseAuthAdapter');
const db                         = require('../../infrastructure/database/knex/config');
const { z }                      = require('zod');
const { validate }               = require('../middlewares/validate.middleware');

const firebaseAuth = new FirebaseAuthAdapter();

const SetRoleSchema = z.object({
  uid:       z.string().min(1),
  schoolId:  z.string().uuid().nullable(),
  role:      z.enum(['superadmin', 'school_admin', 'coordinator', 'teacher', 'parent']),
});

/**
 * POST /api/v1/auth/set-role
 * Superadmin o school_admin asigna schoolId + rol a un Firebase UID.
 * Esto inyecta los custom claims en Firebase para que el token los incluya.
 */
router.post(
  '/set-role',
  firebaseAuthMiddleware,
  tenantMiddleware,
  roles('superadmin', 'school_admin'),
  validate(SetRoleSchema),
  async (req, res, next) => {
    try {
      const { uid, schoolId, role } = req.body;

      // school_admin solo puede asignar roles dentro de su propio colegio
      if (req.user.role === 'school_admin' && schoolId !== req.schoolId) {
        return res.status(403).json({ error: 'Solo puede asignar roles en su colegio.' });
      }

      await firebaseAuth.setUserRole(uid, schoolId, role);

      // Actualiza también la tabla users en PostgreSQL
      await db('users')
        .where({ firebase_uid: uid })
        .update({ role, school_id: schoolId, updated_at: db.fn.now() });

      res.json({ message: 'Rol asignado correctamente.', uid, role, schoolId });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/auth/me
 * Retorna el perfil completo del usuario autenticado desde la DB
 */
router.get(
  '/me',
  firebaseAuthMiddleware,
  tenantMiddleware,
  async (req, res, next) => {
    try {
      const user = await db('users')
        .where({ firebase_uid: req.user.uid })
        .first();

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado. Contacte al administrador.' });
      }

      // No exponer campos sensibles
      const { firebase_uid: _, ...safeUser } = user;
      res.json({ data: safeUser });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/auth/register-user
 * school_admin crea un usuario en Firebase + DB
 */
router.post(
  '/register-user',
  firebaseAuthMiddleware,
  tenantMiddleware,
  roles('superadmin', 'school_admin'),
  async (req, res, next) => {
    try {
      const { email, password, firstName, lastName, role, phoneWhatsapp } = req.body;

      const { uid } = await firebaseAuth.createUser({
        email,
        password,
        displayName: `${firstName} ${lastName}`,
      });

      const schoolId = req.user.role === 'superadmin'
        ? (req.body.schoolId || null)
        : req.schoolId;

      await firebaseAuth.setUserRole(uid, schoolId, role);

      const [newUser] = await db('users').insert({
        firebase_uid:    uid,
        school_id:       schoolId,
        email,
        first_name:      firstName,
        last_name:       lastName,
        role,
        phone_whatsapp:  phoneWhatsapp || null,
      }).returning('*');

      const { firebase_uid: _, ...safeUser } = newUser;
      res.status(201).json({ data: safeUser });
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        return res.status(409).json({ error: 'Ya existe un usuario con ese email.' });
      }
      next(err);
    }
  }
);

module.exports = router;
