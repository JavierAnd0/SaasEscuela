'use strict';

const path = require('path');
const fs   = require('fs');
const { v4: uuidv4 } = require('uuid');
const { NotFoundError, ValidationError } = require('../../presentation/middlewares/errorHandler.middleware');
const { buildReportCardHtml } = require('../../presentation/report-cards/reportCardTemplate');

const STORAGE_DIR = path.join(__dirname, '..', '..', '..', 'storage', 'report-cards');

/**
 * Caso de uso: Generar un PDF de boletín por cada estudiante de un grupo y período.
 * Orquesta: repositorio de datos + adaptador PDF + escritura a disco.
 */
class GenerateReportCardsUseCase {
  /**
   * @param {import('../../domain/report-cards/ReportCardRepository').ReportCardRepository} reportCardRepo
   * @param {{ generateBatch(pages: Array<{id, html}>): Promise<Array<{id, buffer, error}>> }} pdfAdapter
   */
  constructor(reportCardRepo, pdfAdapter) {
    this.reportCardRepo = reportCardRepo;
    this.pdfAdapter     = pdfAdapter;
  }

  async execute({ schoolId, classroomId, periodId }) {
    const school   = await this.reportCardRepo.findSchool({ schoolId });
    const period   = await this.reportCardRepo.findPeriod({ periodId, schoolId });
    if (!period) throw new NotFoundError('Período no encontrado.');

    const academicYear = await this.reportCardRepo.findAcademicYear({ id: period.academic_year_id, schoolId });
    const classroom    = await this.reportCardRepo.findClassroom({ id: classroomId, schoolId });

    const students = await this.reportCardRepo.findStudentsWithSummaries({
      schoolId, classroomId, periodId, academicYearId: period.academic_year_id,
    });
    if (!students.length) throw new ValidationError('No hay estudiantes matriculados.');

    const allGrades     = await this.reportCardRepo.findGradesWithSubjects({ schoolId, classroomId, periodId });
    const allComments   = await this.reportCardRepo.findApprovedComments({ schoolId, classroomId, periodId });

    // Construir las páginas HTML para cada estudiante
    const pages = students.map(student => ({
      id:   student.id,
      html: buildReportCardHtml({
        school, student, classroom, period, academicYear,
        subjects:      allGrades.filter(g => g.student_id === student.id),
        periodAverage: student.period_average ?? 0,
        comment:       allComments.find(c => c.student_id === student.id)?.final_comment || '',
      }),
    }));

    // Generar todos los PDFs en una sola instancia del browser
    const pdfResults = await this.pdfAdapter.generateBatch(pages);

    const storageDir = this._ensureStorageDir(schoolId);
    const generated  = [];
    const errors     = [];

    for (const { id: studentId, buffer, error } of pdfResults) {
      if (error) {
        errors.push({ studentId, error });
        continue;
      }

      const filename    = `boletin-${studentId}-${periodId}.pdf`;
      const filePath    = path.join(storageDir, filename);
      fs.writeFileSync(filePath, buffer);

      const accessToken = uuidv4();
      const pdfUrl      = `/storage/report-cards/${schoolId}/${filename}`;

      await this.reportCardRepo.saveReportCard({ schoolId, studentId, classroomId, periodId, pdfUrl, accessToken });
      generated.push({ studentId, pdfUrl, accessToken });
    }

    return { generated: generated.length, errors: errors.length, data: generated };
  }

  /** @private */
  _ensureStorageDir(schoolId) {
    const dir = path.join(STORAGE_DIR, schoolId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }
}

module.exports = { GenerateReportCardsUseCase };
