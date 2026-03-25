'use strict';

const { z } = require('zod');
const { validate } = require('../../presentation/middlewares/validate.middleware');

const TestSchema = z.object({
  name: z.string().min(1),
  age:  z.number().int().positive(),
});

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

describe('validate middleware', () => {

  describe('datos válidos', () => {
    test('llama next() con datos correctos', () => {
      const req  = { body: { name: 'Juan', age: 20 } };
      const res  = makeRes();
      const next = jest.fn();

      validate(TestSchema)(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('reemplaza req.body con los datos parseados por Zod', () => {
      const req  = { body: { name: 'Ana', age: 25 } };
      validate(TestSchema)(req, makeRes(), jest.fn());
      expect(req.body).toEqual({ name: 'Ana', age: 25 });
    });

    test('source "query" valida req.query', () => {
      const QuerySchema = z.object({ id: z.string().uuid() });
      const req  = { query: { id: '123e4567-e89b-12d3-a456-426614174000' } };
      const next = jest.fn();

      validate(QuerySchema, 'query')(req, makeRes(), next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('datos inválidos', () => {
    test('responde 422 cuando el body falla la validación', () => {
      const req = { body: { name: '', age: -1 } };
      const res = makeRes();

      validate(TestSchema)(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String), details: expect.any(Array) })
      );
    });

    test('no llama next() cuando hay errores', () => {
      const req  = { body: {} };
      const next = jest.fn();

      validate(TestSchema)(req, makeRes(), next);

      expect(next).not.toHaveBeenCalled();
    });

    test('body completamente vacío → 422', () => {
      const res = makeRes();
      validate(TestSchema)({ body: {} }, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(422);
    });

    test('UUID inválido en query → 422', () => {
      const Schema = z.object({ id: z.string().uuid() });
      const res = makeRes();
      validate(Schema, 'query')({ query: { id: 'not-a-uuid' } }, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(422);
    });

    test('details incluye el campo que falló', () => {
      const req = { body: { name: 'ok', age: 'no-es-numero' } };
      const res = makeRes();

      validate(TestSchema)(req, res, jest.fn());

      const payload = res.json.mock.calls[0][0];
      expect(payload.details.some(d => d.field === 'age')).toBe(true);
    });

    test('details incluye el mensaje de error del campo', () => {
      const req = { body: { name: 'ok', age: -5 } };
      const res = makeRes();

      validate(TestSchema)(req, res, jest.fn());

      const payload = res.json.mock.calls[0][0];
      const ageError = payload.details.find(d => d.field === 'age');
      expect(ageError).toBeDefined();
      expect(ageError.message).toBeTruthy();
    });
  });
});
