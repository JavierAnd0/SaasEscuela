'use strict';

const { Grade, ENTRY_METHODS } = require('../../domain/grades/Grade');

const validProps = {
  schoolId:    'school-1',
  studentId:   'student-1',
  subjectId:   'subject-1',
  classroomId: 'classroom-1',
  periodId:    'period-1',
  teacherId:   'teacher-1',
  gradeValue:  3.5,
  entryMethod: 'web',
};

describe('Grade entity', () => {

  describe('validate()', () => {
    test('nota válida — sin errores', () => {
      expect(new Grade(validProps).validate()).toHaveLength(0);
    });

    test('nota 1.0 (mínima) — válida', () => {
      expect(new Grade({ ...validProps, gradeValue: 1.0 }).validate()).toHaveLength(0);
    });

    test('nota 5.0 (máxima) — válida', () => {
      expect(new Grade({ ...validProps, gradeValue: 5.0 }).validate()).toHaveLength(0);
    });

    test('nota 0.9 (fuera de rango) → error de nota inválida', () => {
      const errors = new Grade({ ...validProps, gradeValue: 0.9 }).validate();
      expect(errors.some(e => e.includes('Nota inválida'))).toBe(true);
    });

    test('nota 5.1 (fuera de rango) → error de nota inválida', () => {
      const errors = new Grade({ ...validProps, gradeValue: 5.1 }).validate();
      expect(errors.some(e => e.includes('Nota inválida'))).toBe(true);
    });

    test('nota 0 → error', () => {
      const errors = new Grade({ ...validProps, gradeValue: 0 }).validate();
      expect(errors.some(e => e.includes('Nota inválida'))).toBe(true);
    });

    test('nota como string "3.5" → error (debe ser número)', () => {
      const errors = new Grade({ ...validProps, gradeValue: '3.5' }).validate();
      expect(errors.some(e => e.includes('Nota inválida'))).toBe(true);
    });

    test('entryMethod inválido → error', () => {
      const errors = new Grade({ ...validProps, entryMethod: 'fax' }).validate();
      expect(errors.some(e => e.includes('Método de ingreso inválido'))).toBe(true);
    });

    test('sin studentId → error', () => {
      expect(new Grade({ ...validProps, studentId: null }).validate())
        .toContain('studentId es requerido.');
    });

    test('sin subjectId → error', () => {
      expect(new Grade({ ...validProps, subjectId: null }).validate())
        .toContain('subjectId es requerido.');
    });

    test('sin periodId → error', () => {
      expect(new Grade({ ...validProps, periodId: null }).validate())
        .toContain('periodId es requerido.');
    });

    test('múltiples errores se acumulan en un solo validate()', () => {
      const errors = new Grade({ ...validProps, studentId: null, gradeValue: 0 }).validate();
      expect(errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('isPassing()', () => {
    test('3.0 — aprobatorio con umbral por defecto', () => {
      expect(new Grade({ ...validProps, gradeValue: 3.0 }).isPassing()).toBe(true);
    });

    test('2.9 — reprobatorio', () => {
      expect(new Grade({ ...validProps, gradeValue: 2.9 }).isPassing()).toBe(false);
    });

    test('5.0 — aprobatorio', () => {
      expect(new Grade({ ...validProps, gradeValue: 5.0 }).isPassing()).toBe(true);
    });

    test('umbral personalizado 3.5: nota 3.4 → reprobatorio', () => {
      expect(new Grade({ ...validProps, gradeValue: 3.4 }).isPassing(3.5)).toBe(false);
    });

    test('umbral personalizado 3.5: nota 3.5 → aprobatorio', () => {
      expect(new Grade({ ...validProps, gradeValue: 3.5 }).isPassing(3.5)).toBe(true);
    });
  });

  describe('getLevel()', () => {
    test('5.0 → SUPERIOR', () => {
      expect(new Grade({ ...validProps, gradeValue: 5.0 }).getLevel().key).toBe('SUPERIOR');
    });

    test('4.2 → ALTO', () => {
      expect(new Grade({ ...validProps, gradeValue: 4.2 }).getLevel().key).toBe('ALTO');
    });

    test('3.5 → BASICO', () => {
      expect(new Grade({ ...validProps, gradeValue: 3.5 }).getLevel().key).toBe('BASICO');
    });

    test('2.5 → BAJO', () => {
      expect(new Grade({ ...validProps, gradeValue: 2.5 }).getLevel().key).toBe('BAJO');
    });

    test('acepta config SIEE personalizada del colegio', () => {
      const customConfig = { level_superior_min: 4.8, level_alto_min: 4.2, level_basico_min: 3.2,
        level_superior_name: 'Excelente', level_alto_name: 'Bueno',
        level_basico_name: 'Regular', level_bajo_name: 'Insuficiente' };
      const level = new Grade({ ...validProps, gradeValue: 4.9 }).getLevel(customConfig);
      expect(level.name).toBe('Excelente');
    });
  });

  describe('ENTRY_METHODS', () => {
    test('contiene exactamente los 4 métodos válidos', () => {
      expect(ENTRY_METHODS).toEqual(
        expect.arrayContaining(['web', 'csv', 'whatsapp_ocr', 'google_forms'])
      );
      expect(ENTRY_METHODS).toHaveLength(4);
    });
  });
});
