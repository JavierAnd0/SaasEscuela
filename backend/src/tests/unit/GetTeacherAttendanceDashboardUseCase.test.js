'use strict';

const { GetTeacherAttendanceDashboardUseCase } = require('../../application/attendance/GetTeacherAttendanceDashboardUseCase');

const PARAMS = { schoolId: 'school-1', teacherId: 'teacher-1', periodId: 'period-1' };

const DEFAULT_STATS = {
  total_students:              0,
  total_unjustified_absences:  0,
  total_justified_absences:    0,
  avg_attendance_rate:         null,
};

function makeRepo(classrooms = [], summary = []) {
  return {
    getTeacherDashboard: jest.fn().mockResolvedValue({ classrooms, summary }),
  };
}

describe('GetTeacherAttendanceDashboardUseCase', () => {

  describe('enriquecimiento de classrooms', () => {
    test('classroom con summary → stats correctas', async () => {
      const repo = makeRepo(
        [{ classroom_id: 'c1', name: '9A' }],
        [{ classroom_id: 'c1', total_students: 30, total_unjustified_absences: 5,
           total_justified_absences: 2, avg_attendance_rate: 0.9 }]
      );

      const { classrooms } = await new GetTeacherAttendanceDashboardUseCase(repo).execute(PARAMS);

      expect(classrooms[0].stats.total_students).toBe(30);
      expect(classrooms[0].stats.total_unjustified_absences).toBe(5);
      expect(classrooms[0].stats.avg_attendance_rate).toBe(0.9);
    });

    test('classroom sin summary → stats con valores por defecto (0 / null)', async () => {
      const repo = makeRepo([{ classroom_id: 'c2', name: '10B' }], []);

      const { classrooms } = await new GetTeacherAttendanceDashboardUseCase(repo).execute(PARAMS);

      expect(classrooms[0].stats).toEqual(DEFAULT_STATS);
    });

    test('múltiples classrooms — cada una recibe su summary', async () => {
      const repo = makeRepo(
        [{ classroom_id: 'c1' }, { classroom_id: 'c2' }],
        [
          { classroom_id: 'c1', total_students: 25, total_unjustified_absences: 1,
            total_justified_absences: 0, avg_attendance_rate: 0.95 },
          { classroom_id: 'c2', total_students: 30, total_unjustified_absences: 3,
            total_justified_absences: 1, avg_attendance_rate: 0.88 },
        ]
      );

      const { classrooms } = await new GetTeacherAttendanceDashboardUseCase(repo).execute(PARAMS);

      expect(classrooms).toHaveLength(2);
      expect(classrooms[0].stats.total_students).toBe(25);
      expect(classrooms[1].stats.total_students).toBe(30);
    });

    test('preserva las propiedades originales del classroom', async () => {
      const repo = makeRepo([{ classroom_id: 'c1', name: '7C', grade_level: 'Grado 7°' }], []);

      const { classrooms } = await new GetTeacherAttendanceDashboardUseCase(repo).execute(PARAMS);

      expect(classrooms[0].name).toBe('7C');
      expect(classrooms[0].grade_level).toBe('Grado 7°');
    });

    test('lista vacía de classrooms → retorna array vacío', async () => {
      const { classrooms } = await new GetTeacherAttendanceDashboardUseCase(makeRepo()).execute(PARAMS);
      expect(classrooms).toEqual([]);
    });
  });

  describe('llamada al repositorio', () => {
    test('pasa los parámetros exactos al repositorio', async () => {
      const repo = makeRepo();
      await new GetTeacherAttendanceDashboardUseCase(repo).execute(PARAMS);
      expect(repo.getTeacherDashboard).toHaveBeenCalledWith(PARAMS);
    });

    test('llama al repositorio exactamente una vez', async () => {
      const repo = makeRepo();
      await new GetTeacherAttendanceDashboardUseCase(repo).execute(PARAMS);
      expect(repo.getTeacherDashboard).toHaveBeenCalledTimes(1);
    });
  });

  describe('summary con classroom_id que no coincide con ningún classroom', () => {
    test('summary huérfano no afecta a los classrooms existentes', async () => {
      const repo = makeRepo(
        [{ classroom_id: 'c1' }],
        [{ classroom_id: 'c-desconocido', total_students: 99 }]
      );

      const { classrooms } = await new GetTeacherAttendanceDashboardUseCase(repo).execute(PARAMS);

      // c1 no tiene match → stats por defecto
      expect(classrooms[0].stats).toEqual(DEFAULT_STATS);
    });
  });
});
