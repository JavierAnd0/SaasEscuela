'use strict';

const { Attendance } = require('../../domain/attendance/Attendance');
const { ValidationError } = require('../../presentation/middlewares/errorHandler.middleware');

/**
 * Caso de uso: Registrar asistencia diaria de un grupo (bulk).
 * Orquesta el dominio sin depender de infraestructura (inyección de dependencia).
 */
class RecordDailyAttendanceUseCase {
  /**
   * @param {import('../../domain/attendance/AttendanceRepository').AttendanceRepository} attendanceRepo
   */
  constructor(attendanceRepo) {
    this.attendanceRepo = attendanceRepo;
  }

  /**
   * @param {object} params
   * @param {string} params.schoolId
   * @param {string} params.classroomId
   * @param {string} params.periodId
   * @param {string} params.recordDate       - formato YYYY-MM-DD
   * @param {string} params.recordedBy       - userId del docente
   * @param {Array<{ studentId, status, justification? }>} params.records
   * @returns {Promise<object[]>}
   */
  async execute({ schoolId, classroomId, periodId, recordDate, recordedBy, records }) {
    if (!records || records.length === 0) {
      throw new ValidationError('Se requiere al menos un registro de asistencia.');
    }

    // Valida cada registro con la entidad de dominio
    const attendances = records.map(r => {
      const attendance = new Attendance({
        schoolId,
        studentId:   r.studentId,
        classroomId,
        periodId,
        recordDate,
        status:       r.status,
        justification: r.justification || null,
        recordedBy,
      });

      const errors = attendance.validate();
      if (errors.length > 0) {
        throw new ValidationError(`Registro inválido para estudiante ${r.studentId}: ${errors.join('; ')}`);
      }
      return attendance;
    });

    return this.attendanceRepo.saveMany(attendances);
  }
}

module.exports = { RecordDailyAttendanceUseCase };
