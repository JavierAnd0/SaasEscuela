'use strict';

const {
  errorHandler,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} = require('../../presentation/middlewares/errorHandler.middleware');

function makeReq(overrides = {}) {
  return { path: '/test', method: 'GET', schoolId: 'school-1', user: { uid: 'u1' }, ...overrides };
}

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

// ─── Custom error classes ───────────────────────────────────────────────────

describe('clases de error personalizadas', () => {
  test('NotFoundError — name y message correctos', () => {
    const err = new NotFoundError('recurso no encontrado');
    expect(err.name).toBe('NotFoundError');
    expect(err.message).toBe('recurso no encontrado');
    expect(err).toBeInstanceOf(Error);
  });

  test('ForbiddenError — name y message correctos', () => {
    const err = new ForbiddenError('acceso denegado');
    expect(err.name).toBe('ForbiddenError');
    expect(err.message).toBe('acceso denegado');
    expect(err).toBeInstanceOf(Error);
  });

  test('ValidationError — name y message correctos', () => {
    const err = new ValidationError('dato inválido');
    expect(err.name).toBe('ValidationError');
    expect(err.message).toBe('dato inválido');
    expect(err).toBeInstanceOf(Error);
  });
});

// ─── errorHandler middleware ────────────────────────────────────────────────

describe('errorHandler', () => {
  const next = jest.fn();

  describe('errores de dominio conocidos', () => {
    test('ValidationError → 422 con el mensaje del error', () => {
      const res = makeRes();
      errorHandler(new ValidationError('campo requerido'), makeReq(), res, next);
      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith({ error: 'campo requerido' });
    });

    test('NotFoundError → 404 con el mensaje del error', () => {
      const res = makeRes();
      errorHandler(new NotFoundError('estudiante no encontrado'), makeReq(), res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'estudiante no encontrado' });
    });

    test('ForbiddenError → 403 con el mensaje del error', () => {
      const res = makeRes();
      errorHandler(new ForbiddenError('sin permisos'), makeReq(), res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'sin permisos' });
    });
  });

  describe('errores genéricos', () => {
    test('Error genérico → 500', () => {
      const res = makeRes();
      errorHandler(new Error('algo falló'), makeReq(), res, next);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('error con statusCode personalizado usa ese código', () => {
      const res = makeRes();
      const err = Object.assign(new Error('bad request'), { statusCode: 400 });
      errorHandler(err, makeReq(), res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('error con status (no statusCode) usa ese código', () => {
      const res = makeRes();
      const err = Object.assign(new Error('conflict'), { status: 409 });
      errorHandler(err, makeReq(), res, next);
      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('comportamiento según NODE_ENV', () => {
    let original;
    beforeEach(() => { original = process.env.NODE_ENV; });
    afterEach(() => { process.env.NODE_ENV = original; });

    test('en producción — error 500 muestra mensaje genérico', () => {
      process.env.NODE_ENV = 'production';
      const res = makeRes();
      errorHandler(new Error('detalle interno sensible'), makeReq(), res, next);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error interno del servidor.' });
    });

    test('en desarrollo — error 500 expone el mensaje real', () => {
      process.env.NODE_ENV = 'development';
      const res = makeRes();
      errorHandler(new Error('detalle interno sensible'), makeReq(), res, next);
      expect(res.json).toHaveBeenCalledWith({ error: 'detalle interno sensible' });
    });

    test('en producción — error 400 sigue mostrando el mensaje real', () => {
      process.env.NODE_ENV = 'production';
      const res = makeRes();
      const err = Object.assign(new Error('parámetro inválido'), { statusCode: 400 });
      errorHandler(err, makeReq(), res, next);
      expect(res.json).toHaveBeenCalledWith({ error: 'parámetro inválido' });
    });
  });

  describe('req sin user (error antes del auth)', () => {
    test('no lanza excepción si req.user es undefined', () => {
      const res = makeRes();
      expect(() => {
        errorHandler(new Error('sin auth'), { path: '/', method: 'GET', schoolId: null }, res, next);
      }).not.toThrow();
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
