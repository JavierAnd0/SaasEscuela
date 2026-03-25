'use strict';

const {
  getColombianLevel,
  isValidGrade,
  isAtRisk,
  DEFAULT_SCALE,
  MIN_GRADE,
  MAX_GRADE,
  DEFAULT_PASSING,
} = require('../../domain/shared/colombianScale');

describe('colombianScale', () => {

  describe('getColombianLevel — escala por defecto', () => {
    test('5.0 → SUPERIOR', () => {
      expect(getColombianLevel(5.0)).toEqual({ key: 'SUPERIOR', name: 'Superior' });
    });

    test('4.6 → SUPERIOR (límite inferior)', () => {
      expect(getColombianLevel(4.6)).toEqual({ key: 'SUPERIOR', name: 'Superior' });
    });

    test('4.5 → ALTO', () => {
      expect(getColombianLevel(4.5)).toEqual({ key: 'ALTO', name: 'Alto' });
    });

    test('4.0 → ALTO (límite inferior)', () => {
      expect(getColombianLevel(4.0)).toEqual({ key: 'ALTO', name: 'Alto' });
    });

    test('3.9 → BASICO', () => {
      expect(getColombianLevel(3.9)).toEqual({ key: 'BASICO', name: 'Básico' });
    });

    test('3.0 → BASICO (límite inferior)', () => {
      expect(getColombianLevel(3.0)).toEqual({ key: 'BASICO', name: 'Básico' });
    });

    test('2.9 → BAJO', () => {
      expect(getColombianLevel(2.9)).toEqual({ key: 'BAJO', name: 'Bajo' });
    });

    test('1.0 → BAJO (nota mínima)', () => {
      expect(getColombianLevel(1.0)).toEqual({ key: 'BAJO', name: 'Bajo' });
    });
  });

  describe('getColombianLevel — configuración personalizada del colegio', () => {
    const customConfig = {
      level_superior_min:  4.8,
      level_alto_min:      4.2,
      level_basico_min:    3.2,
      level_superior_name: 'Excelente',
      level_alto_name:     'Bueno',
      level_basico_name:   'Regular',
      level_bajo_name:     'Insuficiente',
    };

    test('4.8 → Excelente con config personalizada', () => {
      expect(getColombianLevel(4.8, customConfig)).toEqual({ key: 'SUPERIOR', name: 'Excelente' });
    });

    test('4.5 → Bueno con config personalizada', () => {
      expect(getColombianLevel(4.5, customConfig)).toEqual({ key: 'ALTO', name: 'Bueno' });
    });

    test('3.5 → Regular con config personalizada', () => {
      expect(getColombianLevel(3.5, customConfig)).toEqual({ key: 'BASICO', name: 'Regular' });
    });

    test('3.1 → Insuficiente con config personalizada', () => {
      expect(getColombianLevel(3.1, customConfig)).toEqual({ key: 'BAJO', name: 'Insuficiente' });
    });
  });

  describe('isValidGrade', () => {
    test('1.0 es válida', ()  => expect(isValidGrade(1.0)).toBe(true));
    test('3.5 es válida', ()  => expect(isValidGrade(3.5)).toBe(true));
    test('5.0 es válida', ()  => expect(isValidGrade(5.0)).toBe(true));
    test('0.9 es inválida', () => expect(isValidGrade(0.9)).toBe(false));
    test('5.1 es inválida', () => expect(isValidGrade(5.1)).toBe(false));
    test('0 es inválida', ()  => expect(isValidGrade(0)).toBe(false));
    test('"3.5" string es inválida', () => expect(isValidGrade('3.5')).toBe(false));
    test('null es inválida', () => expect(isValidGrade(null)).toBe(false));
  });

  describe('isAtRisk', () => {
    test('promedio < 3.0 → en riesgo', () => {
      expect(isAtRisk(2.9)).toBe(true);
      expect(isAtRisk(1.0)).toBe(true);
    });

    test('promedio = 3.0 → no en riesgo', () => {
      expect(isAtRisk(3.0)).toBe(false);
    });

    test('promedio > 3.0 → no en riesgo', () => {
      expect(isAtRisk(4.5)).toBe(false);
    });

    test('umbral personalizado: 3.5 bajo umbral 3.6 → en riesgo', () => {
      expect(isAtRisk(3.5, 3.6)).toBe(true);
    });

    test('umbral personalizado: 3.6 bajo umbral 3.6 → no en riesgo', () => {
      expect(isAtRisk(3.6, 3.6)).toBe(false);
    });
  });

  describe('constantes', () => {
    test('DEFAULT_PASSING es 3.0', () => expect(DEFAULT_PASSING).toBe(3.0));
    test('MIN_GRADE es 1.0', ()     => expect(MIN_GRADE).toBe(1.0));
    test('MAX_GRADE es 5.0', ()     => expect(MAX_GRADE).toBe(5.0));
    test('DEFAULT_SCALE tiene 4 niveles', () => {
      expect(Object.keys(DEFAULT_SCALE)).toHaveLength(4);
    });
  });
});
