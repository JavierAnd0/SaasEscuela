'use strict';

/**
 * Caso de uso: Dashboard de asistencia para el docente.
 * Retorna métricas de todos sus grupos en el período activo.
 */
class GetTeacherAttendanceDashboardUseCase {
  /**
   * @param {import('../../domain/attendance/AttendanceRepository').AttendanceRepository} attendanceRepo
   */
  constructor(attendanceRepo) {
    this.attendanceRepo = attendanceRepo;
  }

  /**
   * @param {object} params
   * @param {string} params.schoolId
   * @param {string} params.teacherId
   * @param {string} params.periodId
   * @returns {Promise<object>}
   */
  async execute({ schoolId, teacherId, periodId }) {
    const { classrooms, summary } = await this.attendanceRepo.getTeacherDashboard({
      schoolId,
      teacherId,
      periodId,
    });

    // Enriquece cada grupo con los datos del summary
    const summaryByClassroom = summary.reduce((acc, s) => {
      acc[s.classroom_id] = s;
      return acc;
    }, {});

    const enrichedClassrooms = classrooms.map(c => ({
      ...c,
      stats: summaryByClassroom[c.classroom_id] || {
        total_students: 0,
        total_unjustified_absences: 0,
        total_justified_absences: 0,
        avg_attendance_rate: null,
      },
    }));

    return { classrooms: enrichedClassrooms };
  }
}

module.exports = { GetTeacherAttendanceDashboardUseCase };
