'use strict';

const { getColombianLevel } = require('../../domain/shared/colombianScale');
const { NotFoundError, ValidationError } = require('../../presentation/middlewares/errorHandler.middleware');

/**
 * Caso de uso: Calcular y persistir los promedios de período para un grupo.
 * Lógica de negocio extraída del controller — sin dependencias de infraestructura directa.
 */
class RunConsolidationUseCase {
  /**
   * @param {import('../../domain/consolidation/ConsolidationRepository').ConsolidationRepository} consolidationRepo
   */
  constructor(consolidationRepo) {
    this.consolidationRepo = consolidationRepo;
  }

  async execute({ schoolId, classroomId, periodId }) {
    const period = await this.consolidationRepo.findPeriod({ periodId, schoolId });
    if (!period) throw new NotFoundError('Período no encontrado.');

    const students = await this.consolidationRepo.findActiveStudents({
      schoolId, classroomId, academicYearId: period.academic_year_id,
    });
    if (!students.length) throw new ValidationError('No hay estudiantes matriculados en este grupo.');

    const allGrades = await this.consolidationRepo.findGrades({ schoolId, classroomId, periodId });
    if (!allGrades.length) throw new ValidationError('No hay notas ingresadas para consolidar.');

    const weight   = parseFloat(period.weight_percent) / 100;
    const summaries = [];

    for (const student of students) {
      const studentGrades = allGrades.filter(g => g.student_id === student.id);
      if (!studentGrades.length) continue;

      // Agrupar notas por materia y calcular promedio por materia
      const bySubject = {};
      for (const g of studentGrades) {
        if (!bySubject[g.subject_id]) bySubject[g.subject_id] = [];
        bySubject[g.subject_id].push(parseFloat(g.grade_value));
      }

      const subjectAvgs = Object.values(bySubject).map(
        gs => gs.reduce((a, b) => a + b, 0) / gs.length
      );

      const periodAvg  = subjectAvgs.reduce((a, b) => a + b, 0) / subjectAvgs.length;
      const weighted   = periodAvg * weight;
      const failedCount = subjectAvgs.filter(a => a < 3.0).length;

      summaries.push({
        school_id:             schoolId,
        student_id:            student.id,
        classroom_id:          classroomId,
        period_id:             periodId,
        academic_year_id:      period.academic_year_id,
        period_average:        parseFloat(periodAvg.toFixed(1)),
        weighted_contribution: parseFloat(weighted.toFixed(2)),
        is_at_risk:            periodAvg < 3.0,
        failed_subjects_count: failedCount,
      });
    }

    if (!summaries.length) throw new ValidationError('Ningún estudiante tiene notas ingresadas.');

    await this.consolidationRepo.savePeriodSummaries(summaries);
    await this._tryConsolidateYear({ schoolId, classroomId, period, students });

    return summaries
      .map(s => ({
        ...s,
        first_name: students.find(st => st.id === s.student_id)?.first_name,
        last_name:  students.find(st => st.id === s.student_id)?.last_name,
      }))
      .sort((a, b) => b.period_average - a.period_average);
  }

  /**
   * Si todos los períodos del año ya tienen consolidación, calcula el promedio anual.
   * @private
   */
  async _tryConsolidateYear({ schoolId, classroomId, period, students }) {
    const allPeriods = await this.consolidationRepo.findAllPeriodsForYear({
      academicYearId: period.academic_year_id,
      schoolId,
    });

    for (const p of allPeriods) {
      const count = await this.consolidationRepo.countPeriodSummaries({
        schoolId, periodId: p.id, classroomId,
      });
      if (count === 0) return; // No todos los períodos están consolidados
    }

    // Todos los períodos consolidados → calcular promedio anual por estudiante
    const periodIds = allPeriods.map(p => p.id);

    for (const student of students) {
      const periodSummaries = await this.consolidationRepo.findPeriodSummariesForStudentInYear({
        schoolId, studentId: student.id, periodIds,
      });
      if (!periodSummaries.length) continue;

      const yearAvg = periodSummaries
        .reduce((sum, ps) => sum + parseFloat(ps.weighted_contribution), 0);

      // Reutiliza la escala colombiana en lugar de duplicar las condiciones
      const sieeLevel = getColombianLevel(yearAvg).key.toLowerCase();

      await this.consolidationRepo.saveYearSummary({
        schoolId,
        studentId:       student.id,
        academicYearId:  period.academic_year_id,
        yearAverage:     parseFloat(yearAvg.toFixed(1)),
        sieeLevel,
        isPromoted:      yearAvg >= 3.0,
      });
    }
  }
}

module.exports = { RunConsolidationUseCase };
