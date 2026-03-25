'use strict';

// ── Mocks deben declararse antes de cualquier require del módulo bajo prueba ──

// Mock del FirebaseAuthAdapter
const mockVerifyToken = jest.fn();
jest.mock('../../infrastructure/firebase/FirebaseAuthAdapter', () => ({
  FirebaseAuthAdapter: jest.fn().mockImplementation(() => ({
    verifyToken: mockVerifyToken,
  })),
}));

// Mock de knex config — simula la query chain db('users').where().select().first()
const mockFirst = jest.fn();
jest.mock('../../infrastructure/database/knex/config', () => {
  const queryBuilder = {
    where:  jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    first:  mockFirst,
  };
  return jest.fn().mockReturnValue(queryBuilder);
});

const { firebaseAuthMiddleware } = require('../../presentation/middlewares/firebaseAuth.middleware');

function makeReq(authHeader) {
  return { headers: { authorization: authHeader } };
}

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

describe('firebaseAuthMiddleware', () => {

  beforeEach(() => jest.clearAllMocks());

  describe('header Authorization ausente o mal formado', () => {
    test('sin header Authorization → 401', async () => {
      const res = makeRes();
      await firebaseAuthMiddleware({ headers: {} }, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('header sin "Bearer " → 401', async () => {
      const res = makeRes();
      await firebaseAuthMiddleware(makeReq('Basic abc123'), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('header vacío → 401', async () => {
      const res = makeRes();
      await firebaseAuthMiddleware(makeReq(''), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('con header inválido no llama a verifyToken', async () => {
      await firebaseAuthMiddleware({ headers: {} }, makeRes(), jest.fn());
      expect(mockVerifyToken).not.toHaveBeenCalled();
    });
  });

  describe('token inválido o expirado', () => {
    test('token expirado → 401 con mensaje específico', async () => {
      const expiredErr = Object.assign(new Error('Token expired'), { code: 'auth/id-token-expired' });
      mockVerifyToken.mockRejectedValueOnce(expiredErr);

      const res = makeRes();
      await firebaseAuthMiddleware(makeReq('Bearer expired-token'), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringMatching(/[Tt]oken expirado/i) })
      );
    });

    test('token inválido (otro error) → 401 con mensaje genérico', async () => {
      mockVerifyToken.mockRejectedValueOnce(new Error('Token inválido'));

      const res = makeRes();
      await firebaseAuthMiddleware(makeReq('Bearer bad-token'), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringMatching(/[Tt]oken inv[aá]lido/i) })
      );
    });
  });

  describe('token válido', () => {
    const firebaseUser = { uid: 'firebase-uid-1', email: 'docente@colegio.edu', role: 'teacher', schoolId: 'school-1' };

    beforeEach(() => {
      mockVerifyToken.mockResolvedValue(firebaseUser);
      mockFirst.mockResolvedValue({ id: 'db-uuid-1' });
    });

    test('llama a next()', async () => {
      const next = jest.fn();
      await firebaseAuthMiddleware(makeReq('Bearer valid-token'), makeRes(), next);
      expect(next).toHaveBeenCalled();
    });

    test('inyecta req.user con datos de Firebase', async () => {
      const req = makeReq('Bearer valid-token');
      await firebaseAuthMiddleware(req, makeRes(), jest.fn());
      expect(req.user.uid).toBe('firebase-uid-1');
      expect(req.user.email).toBe('docente@colegio.edu');
    });

    test('inyecta req.user.dbId con el UUID interno de PostgreSQL', async () => {
      const req = makeReq('Bearer valid-token');
      await firebaseAuthMiddleware(req, makeRes(), jest.fn());
      expect(req.user.dbId).toBe('db-uuid-1');
    });

    test('usuario no encontrado en DB → dbId es null (no lanza error)', async () => {
      mockFirst.mockResolvedValueOnce(null);
      const req = makeReq('Bearer valid-token');
      await firebaseAuthMiddleware(req, makeRes(), jest.fn());
      expect(req.user.dbId).toBeNull();
    });

    test('no responde con error cuando el token es válido', async () => {
      const res = makeRes();
      await firebaseAuthMiddleware(makeReq('Bearer valid-token'), res, jest.fn());
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
