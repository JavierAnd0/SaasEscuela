'use strict';

const { Attendance, VALID_STATUSES, STATUS_LABELS } = require('../../domain/attendance/Attendance');

const validProps = {
  schoolId:    'school-1',
  studentId:   'student-1',
  classroomId: 'classroom-1',
  periodId:    'period-1',
  recordDate:  '2026-03-01',
  status:      'present',
  recordedBy:  'teacher-1',
};

describe('Attendance entity', () => {

  describe('validate()', () => {
    test('registro válido — sin errores', () => {
      expect(new Attendance(validProps).validate()).toHaveLength(0);
    });

    test('estado inválido → error', () => {
      const errors = new Attendance({ ...validProps, status: 'missing' }).validate();
      expect(errors.some(e => e.includes('Estado inválido'))).toBe(true);
    });

    test('absent_justified sin justificación → error', () => {
      const errors = new Attendance({ ...validProps, status: 'absent_justified', justification: null }).validate();
      expect(errors).toContain('Las ausencias justificadas requieren una justificación.');
    });

    test('absent_justified con justificación → sin error', () => {
      const a = new Attendance({ ...validProps, status: 'absent_justified', justification: 'Cita médica' });
      expect(a.validate()).toHaveLength(0);
    });

    test('absent_unjustified sin justificación → válido', () => {
      const a = new Attendance({ ...validProps, status: 'absent_unjustified' });
      expect(a.validate()).toHaveLength(0);
    });

    test('late — válido sin justificación', () => {
      expect(new Attendance({ ...validProps, status: 'late' }).validate()).toHaveLength(0);
    });

    test('sin studentId → error', () => {
      expect(new Attendance({ ...validProps, studentId: null }).validate())
        .toContain('studentId es requerido.');
    });

    test('sin classroomId → error', () => {
      expect(new Attendance({ ...validProps, classroomId: null }).validate())
        .toContain('classroomId es requerido.');
    });

    test('sin recordDate → error', () => {
      expect(new Attendance({ ...validProps, recordDate: null }).validate())
        .toContain('recordDate es requerido.');
    });

    test('múltiples errores se acumulan', () => {
      const errors = new Attendance({ ...validProps, studentId: null, classroomId: null, status: 'raro' }).validate();
      expect(errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('isAbsence()', () => {
    test('absent_justified → es ausencia', () => {
      const a = new Attendance({ ...validProps, status: 'absent_justified', justification: 'x' });
      expect(a.isAbsence()).toBe(true);
    });

    test('absent_unjustified → es ausencia', () => {
      expect(new Attendance({ ...validProps, status: 'absent_unjustified' }).isAbsence()).toBe(true);
    });

    test('present → no es ausencia', () => {
      expect(new Attendance({ ...validProps, status: 'present' }).isAbsence()).toBe(false);
    });

    test('late → no es ausencia', () => {
      expect(new Attendance({ ...validProps, status: 'late' }).isAbsence()).toBe(false);
    });
  });

  describe('requiresJustification()', () => {
    test('absent_justified → requiere justificación', () => {
      const a = new Attendance({ ...validProps, status: 'absent_justified', justification: 'x' });
      expect(a.requiresJustification()).toBe(true);
    });

    test('absent_unjustified → no requiere justificación', () => {
      expect(new Attendance({ ...validProps, status: 'absent_unjustified' }).requiresJustification()).toBe(false);
    });

    test('present → no requiere justificación', () => {
      expect(new Attendance({ ...validProps, status: 'present' }).requiresJustification()).toBe(false);
    });

    test('late → no requiere justificación', () => {
      expect(new Attendance({ ...validProps, status: 'late' }).requiresJustification()).toBe(false);
    });
  });

  describe('getStatusLabel()', () => {
    test('present → "Presente"', () => {
      expect(new Attendance({ ...validProps, status: 'present' }).getStatusLabel()).toBe('Presente');
    });

    test('absent_justified → "Ausente Justificado"', () => {
      const a = new Attendance({ ...validProps, status: 'absent_justified', justification: 'x' });
      expect(a.getStatusLabel()).toBe('Ausente Justificado');
    });

    test('absent_unjustified → "Ausente Injustificado"', () => {
      expect(new Attendance({ ...validProps, status: 'absent_unjustified' }).getStatusLabel()).toBe('Ausente Injustificado');
    });

    test('late → "Tardanza"', () => {
      expect(new Attendance({ ...validProps, status: 'late' }).getStatusLabel()).toBe('Tardanza');
    });

    test('estado desconocido → retorna el estado tal cual', () => {
      const a = new Attendance({ ...validProps, status: 'present' });
      a.status = 'estado_raro';
      expect(a.getStatusLabel()).toBe('estado_raro');
    });
  });

  describe('isValidStatus() — método estático', () => {
    test('todos los estados válidos retornan true', () => {
      VALID_STATUSES.forEach(s => expect(Attendance.isValidStatus(s)).toBe(true));
    });

    test('"absent" (incompleto) → false', () => {
      expect(Attendance.isValidStatus('absent')).toBe(false);
    });

    test('string vacío → false', () => {
      expect(Attendance.isValidStatus('')).toBe(false);
    });

    test('null → false', () => {
      expect(Attendance.isValidStatus(null)).toBe(false);
    });

    test('undefined → false', () => {
      expect(Attendance.isValidStatus(undefined)).toBe(false);
    });
  });

  describe('VALID_STATUSES y STATUS_LABELS', () => {
    test('VALID_STATUSES tiene exactamente 4 estados', () => {
      expect(VALID_STATUSES).toHaveLength(4);
    });

    test('STATUS_LABELS tiene un label por cada estado válido', () => {
      VALID_STATUSES.forEach(s => expect(STATUS_LABELS[s]).toBeDefined());
    });
  });
});
