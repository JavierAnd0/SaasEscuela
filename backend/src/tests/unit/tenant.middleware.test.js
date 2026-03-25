'use strict';

const { tenantMiddleware } = require('../../presentation/middlewares/tenant.middleware');

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

describe('tenantMiddleware', () => {

  test('401 si req.user no existe', () => {
    const req  = { user: null };
    const res  = makeRes();
    const next = jest.fn();

    tenantMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('superadmin sin schoolId — usa req.query.schoolId', () => {
    const req  = { user: { role: 'superadmin' }, params: {}, query: { schoolId: 'school-x' } };
    const res  = makeRes();
    const next = jest.fn();

    tenantMiddleware(req, res, next);

    expect(req.schoolId).toBe('school-x');
    expect(next).toHaveBeenCalled();
  });

  test('superadmin sin schoolId en query — req.schoolId queda null', () => {
    const req  = { user: { role: 'superadmin' }, params: {}, query: {} };
    const res  = makeRes();
    const next = jest.fn();

    tenantMiddleware(req, res, next);

    expect(req.schoolId).toBeNull();
    expect(next).toHaveBeenCalled();
  });

  test('403 si un coordinador no tiene schoolId en el claim', () => {
    const req  = { user: { role: 'coordinator', schoolId: null } };
    const res  = makeRes();
    const next = jest.fn();

    tenantMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('inyecta req.schoolId desde el custom claim del usuario', () => {
    const req  = { user: { role: 'teacher', schoolId: 'colegio-abc' } };
    const res  = makeRes();
    const next = jest.fn();

    tenantMiddleware(req, res, next);

    expect(req.schoolId).toBe('colegio-abc');
    expect(next).toHaveBeenCalled();
  });

  test('un teacher no puede sobreescribir schoolId con query param', () => {
    const req = {
      user:   { role: 'teacher', schoolId: 'colegio-real' },
      query:  { schoolId: 'otro-colegio' },
      params: {},
    };
    const res  = makeRes();
    const next = jest.fn();

    tenantMiddleware(req, res, next);

    // Siempre usa el schoolId del claim, nunca el query param (solo superadmin)
    expect(req.schoolId).toBe('colegio-real');
  });
});
