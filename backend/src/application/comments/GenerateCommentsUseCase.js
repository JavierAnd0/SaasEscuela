'use strict';

const { NotFoundError, ValidationError } = require('../../presentation/middlewares/errorHandler.middleware');

/**
 * Caso de uso: Generar comentarios de boletín con IA para todos los estudiantes de un grupo.
 * Depende de un repositorio de comentarios y un adaptador de IA (inyectados).
 */
class GenerateCommentsUseCase {
  /**
   * @param {import('../../domain/comments/CommentRepository').CommentRepository} commentRepo
   * @param {{ generateComment(prompt: string): Promise<string> }} aiAdapter
   */
  constructor(commentRepo, aiAdapter) {
    this.commentRepo = commentRepo;
    this.aiAdapter   = aiAdapter;
  }

  async execute({ schoolId, classroomId, periodId }) {
    const classroom = await this.commentRepo.findClassroomWithGradeLevel({ classroomId });
    const period    = await this.commentRepo.findPeriod({ periodId, schoolId });
    if (!period) throw new NotFoundError('Período no encontrado.');

    const summaries = await this.commentRepo.findSummariesWithStudents({ schoolId, classroomId, periodId });
    if (!summaries.length) {
      throw new ValidationError('No hay consolidación para este período. Ejecute primero la consolidación.');
    }

    const gradesWithSubjects = await this.commentRepo.findGradesWithSubjects({ schoolId, classroomId, periodId });

    const results   = [];
    let generated   = 0;
    let errors      = 0;

    for (const summary of summaries) {
      const studentGrades = gradesWithSubjects.filter(g => g.student_id === summary.student_id);

      const bySubject = {};
      for (const g of studentGrades) {
        if (!bySubject[g.subject_name]) bySubject[g.subject_name] = [];
        bySubject[g.subject_name].push(parseFloat(g.grade_value));
      }

      const subjectSummary = Object.entries(bySubject).map(([name, gs]) => ({
        name,
        avg: parseFloat((gs.reduce((a, b) => a + b, 0) / gs.length).toFixed(1)),
      }));

      const strong = subjectSummary.filter(s => s.avg >= 4.0).map(s => s.name);
      const weak   = subjectSummary.filter(s => s.avg < 3.0).map(s => s.name);
      const level  = this._gradeLevel(summary.period_average);

      const prompt = this._buildPrompt({ classroom, period, summary, strong, weak, level });

      let aiComment = '';
      try {
        aiComment = await this.aiAdapter.generateComment(prompt);
        generated++;
      } catch (aiErr) {
        console.error(`Error generando comentario para ${summary.student_id}:`, aiErr.message);
        aiComment = `El/La estudiante obtuvo un promedio de ${summary.period_average} en ${period.name}. Se recomienda continuar con el proceso de aprendizaje.`;
        errors++;
      }

      results.push({
        school_id:      schoolId,
        student_id:     summary.student_id,
        classroom_id:   classroomId,
        period_id:      periodId,
        ai_comment:     aiComment,
        final_comment:  aiComment,
        status:         'pending',
        first_name:     summary.first_name,
        last_name:      summary.last_name,
        period_average: summary.period_average,
      });
    }

    await this.commentRepo.upsertComments(results);

    return { data: results, count: results.length, generated, errors };
  }

  /** @private */
  _gradeLevel(avg) {
    const v = parseFloat(avg);
    if (v >= 4.6) return 'Superior';
    if (v >= 4.0) return 'Alto';
    if (v >= 3.0) return 'Básico';
    return 'Bajo';
  }

  /** @private */
  _buildPrompt({ classroom, period, summary, strong, weak, level }) {
    return `Eres un director de grupo en un colegio colombiano de educación básica y media. Tu tarea es escribir el comentario del boletín académico de un estudiante.

Normas del comentario:
- En español, tono formal pero cálido y motivador
- Exactamente 2 a 3 oraciones
- Menciona el desempeño general del período
- ${strong.length ? `Reconoce el buen desempeño en: ${strong.join(', ')}` : 'Motiva al estudiante a fortalecer todas las áreas'}
- ${weak.length ? `Recomienda refuerzo en: ${weak.join(', ')}` : 'Felicita el rendimiento integral'}
- Comienza con "El/La estudiante" o "Durante este período"
- NO uses el nombre real del estudiante

Datos del estudiante:
- Grado: ${classroom?.classroom_name || ''} (${classroom?.grade_level || ''})
- Período: ${period.name}
- Promedio del período: ${summary.period_average} — Desempeño ${level}
- Materias sobresalientes (≥ 4.0): ${strong.join(', ') || 'ninguna'}
- Materias con dificultad (< 3.0): ${weak.join(', ') || 'ninguna'}

Responde ÚNICAMENTE con el comentario, sin comillas ni texto adicional.`;
  }
}

module.exports = { GenerateCommentsUseCase };
