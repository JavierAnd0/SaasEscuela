'use strict';

const { RecordDailyAttendanceUseCase } = require('../../application/attendance/RecordDailyAttendanceUseCase');

const BASE_PARAMS = {
  schoolId:    'school-1',
  classroomId: 'classroom-1',
  periodId:    'period-1',
  recordDate:  '2026-03-01',
  recordedBy:  'teacher-1',
};

function makeRepo(savedResult = []) {
  return { saveMany: jest.fn().mockResolvedValue(savedResult) };
}

describe('RecordDailyAttendanceUseCase', () => {

  describe('ejecución exitosa', () => {
    test('llama al repositorio con los registros válidos', async () => {
      const repo    = makeRepo([{ id: 'att-1' }]);
      const useCase = new RecordDailyAttendanceUseCase(repo);

      await useCase.execute({
        ...BASE_PARAMS,
        records: [{ studentId: 'student-1', status: 'present' }],
      });

      expect(repo.saveMany).toHaveBeenCalledTimes(1);
    });

    test('retorna el resultado del repositorio', async () => {
      const saved = [{ id: 'att-1' }, { id: 'att-2' }];
      const repo  = makeRepo(saved);

      const result = await new RecordDailyAttendanceUseCase(repo).execute({
        ...BASE_PARAMS,
        records: [
          { studentId: 'st-1', status: 'present' },
          { studentId: 'st-2', status: 'late' },
        ],
      });

      expect(result).toEqual(saved);
    });

    test('pasa los 3 estados no-justificados sin error', async () => {
      const repo = makeRepo([]);
      const useCase = new RecordDailyAttendanceUseCase(repo);

      for (const status of ['present', 'absent_unjustified', 'late']) {
        await expect(useCase.execute({
          ...BASE_PARAMS,
          records: [{ studentId: 'st-1', status }],
        })).resolves.not.toThrow();
      }
    });

    test('absent_justified con justificación → válido', async () => {
      const repo = makeRepo([{}]);
      await expect(
        new RecordDailyAttendanceUseCase(repo).execute({
          ...BASE_PARAMS,
          records: [{ studentId: 'st-1', status: 'absent_justified', justification: 'Cita médica' }],
        })
      ).resolves.toBeDefined();
    });

    test('múltiples registros — todos se pasan al repositorio como array', async () => {
      const repo    = makeRepo([{}, {}, {}]);
      const useCase = new RecordDailyAttendanceUseCase(repo);

      await useCase.execute({
        ...BASE_PARAMS,
        records: [
          { studentId: 'st-1', status: 'present' },
          { studentId: 'st-2', status: 'absent_unjustified' },
          { studentId: 'st-3', status: 'late' },
        ],
      });

      const [attendances] = repo.saveMany.mock.calls[0];
      expect(attendances).toHaveLength(3);
    });

    test('los objetos pasados al repo son instancias con el schoolId correcto', async () => {
      const repo = makeRepo([{}]);
      await new RecordDailyAttendanceUseCase(repo).execute({
        ...BASE_PARAMS,
        records: [{ studentId: 'st-1', status: 'present' }],
      });

      const [attendances] = repo.saveMany.mock.calls[0];
      expect(attendances[0].schoolId).toBe('school-1');
      expect(attendances[0].classroomId).toBe('classroom-1');
    });
  });

  describe('validaciones — lanza ValidationError', () => {
    test('records vacío → ValidationError', async () => {
      await expect(
        new RecordDailyAttendanceUseCase(makeRepo()).execute({ ...BASE_PARAMS, records: [] })
      ).rejects.toMatchObject({ name: 'ValidationError' });
    });

    test('records null → ValidationError', async () => {
      await expect(
        new RecordDailyAttendanceUseCase(makeRepo()).execute({ ...BASE_PARAMS, records: null })
      ).rejects.toMatchObject({ name: 'ValidationError' });
    });

    test('records undefined → ValidationError', async () => {
      await expect(
        new RecordDailyAttendanceUseCase(makeRepo()).execute({ ...BASE_PARAMS, records: undefined })
      ).rejects.toMatchObject({ name: 'ValidationError' });
    });

    test('registro con estado inválido → ValidationError', async () => {
      await expect(
        new RecordDailyAttendanceUseCase(makeRepo()).execute({
          ...BASE_PARAMS,
          records: [{ studentId: 'st-1', status: 'volar' }],
        })
      ).rejects.toMatchObject({ name: 'ValidationError' });
    });

    test('absent_justified sin justificación → ValidationError', async () => {
      await expect(
        new RecordDailyAttendanceUseCase(makeRepo()).execute({
          ...BASE_PARAMS,
          records: [{ studentId: 'st-1', status: 'absent_justified' }],
        })
      ).rejects.toMatchObject({ name: 'ValidationError' });
    });

    test('cuando hay error de validación no llama al repositorio', async () => {
      const repo = makeRepo();
      try {
        await new RecordDailyAttendanceUseCase(repo).execute({ ...BASE_PARAMS, records: [] });
      } catch (_) {}
      expect(repo.saveMany).not.toHaveBeenCalled();
    });
  });
});
