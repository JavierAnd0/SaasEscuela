'use strict';

const { roles, VALID_ROLES } = require('../../presentation/middlewares/roles.middleware');

// Helpers para simular req/res/next de Express
function makeReq(user = null) {
  return { user };
}

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

describe('roles middleware', () => {

  describe('roles() — validación en tiempo de arranque', () => {
    test('lanza error si se pasa un rol desconocido', () => {
      expect(() => roles('rol_inventado')).toThrow(/Rol inválido/);
    });

    test('no lanza error con roles válidos', () => {
      expect(() => roles('teacher')).not.toThrow();
      expect(() => roles('coordinator', 'school_admin')).not.toThrow();
    });
  });

  describe('middleware generado', () => {
    test('401 si no hay usuario autenticado (req.user = null)', () => {
      const mw  = roles('teacher');
      const req = makeReq(null);
      const res = makeRes();
      const next = jest.fn();

      mw(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
      expect(next).not.toHaveBeenCalled();
    });

    test('403 si el rol del usuario no está en la lista permitida', () => {
      const mw  = roles('coordinator');
      const req = makeReq({ role: 'teacher' });
      const res = makeRes();
      const next = jest.fn();

      mw(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    test('llama next() si el rol está permitido', () => {
      const mw  = roles('teacher', 'coordinator');
      const req = makeReq({ role: 'teacher' });
      const res = makeRes();
      const next = jest.fn();

      mw(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('superadmin pasa si está en la lista', () => {
      const mw  = roles('superadmin');
      const req = makeReq({ role: 'superadmin' });
      const res = makeRes();
      const next = jest.fn();

      mw(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('múltiples roles permitidos — cualquiera pasa', () => {
      const mw = roles('coordinator', 'school_admin', 'superadmin');

      for (const role of ['coordinator', 'school_admin', 'superadmin']) {
        const req  = makeReq({ role });
        const res  = makeRes();
        const next = jest.fn();
        mw(req, res, next);
        expect(next).toHaveBeenCalled();
      }
    });
  });

  describe('VALID_ROLES', () => {
    test('contiene exactamente los 5 roles del sistema', () => {
      expect(VALID_ROLES).toEqual(
        expect.arrayContaining(['superadmin', 'school_admin', 'coordinator', 'teacher', 'parent'])
      );
      expect(VALID_ROLES).toHaveLength(5);
    });
  });
});
