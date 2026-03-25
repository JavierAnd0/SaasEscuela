import GradeInput      from './GradeInput';
import GradeLevelBadge  from './GradeLevelBadge';
import { getGradeLevel } from './GradeLevelBadge';

/**
 * Tabla principal de ingreso de notas.
 *
 * Props:
 *   students       - array de estudiantes
 *   grades         - { [studentId]: string } — valores actuales en el formulario
 *   savedGrades    - Set<studentId>
 *   savingGrades   - Set<studentId>
 *   onGradeChange  - (studentId, rawValue) => void
 *   onGradeBlur    - (studentId, parsedValue | null) => void
 *   onSaveAll      - () => void
 *   saving         - boolean (guardado global)
 *   disabled       - boolean
 */
export default function GradesGrid({
  students = [],
  grades = {},
  savedGrades = new Set(),
  savingGrades = new Set(),
  onGradeChange,
  onGradeBlur,
  onSaveAll,
  saving,
  disabled,
}) {
  // Estadísticas en tiempo real
  const totalStudents = students.length;
  const validGrades   = students.filter(s => {
    const v = parseFloat(grades[s.id]);
    return !isNaN(v) && v >= 1 && v <= 5;
  });
  const entered       = validGrades.length;
  const pending       = totalStudents - entered;
  const completion    = totalStudents > 0 ? (entered / totalStudents) * 100 : 0;
  const avg           = entered > 0
    ? (validGrades.reduce((sum, s) => sum + parseFloat(grades[s.id]), 0) / entered).toFixed(1)
    : null;

  const avgLevel = getGradeLevel(avg);

  return (
    <div className="flex flex-col gap-4">

      {/* — Barra de progreso y estadísticas — */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-gray-900">
              {entered}<span className="text-gray-400 font-normal">/{totalStudents} notas</span>
            </span>
            {pending > 0 && (
              <span className="text-amber-600 font-medium text-xs">
                {pending} pendiente{pending !== 1 ? 's' : ''}
              </span>
            )}
            {pending === 0 && entered > 0 && (
              <span className="text-green-600 font-medium text-xs">✓ Completo</span>
            )}
          </div>
          {avg && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">Promedio actual</span>
              <span className="font-mono font-bold text-gray-900">{avg}</span>
              {avgLevel && <span className={avgLevel.cls}>{avgLevel.label}</span>}
            </div>
          )}
        </div>

        {/* Barra de progreso */}
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              completion === 100
                ? 'bg-green-500'
                : completion > 50
                ? 'bg-blue-500'
                : 'bg-amber-400'
            }`}
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>

      {/* — Tabla — */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estudiante</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Nota</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Nivel</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.map((student, idx) => {
              const gradeVal = grades[student.id];
              const isAtRisk = parseFloat(gradeVal) > 0 && parseFloat(gradeVal) < 3.0;

              return (
                <tr
                  key={student.id}
                  className={`hover:bg-gray-50 transition-colors ${isAtRisk ? 'bg-red-50/40' : ''}`}
                >
                  <td className="px-4 py-3 text-gray-400 text-xs font-mono">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">
                      {student.last_name}, {student.first_name}
                    </span>
                    {student.document_number && (
                      <span className="ml-2 text-xs text-gray-400">{student.document_number}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
                      <GradeInput
                        value={gradeVal ?? ''}
                        onChange={(raw) => onGradeChange?.(student.id, raw)}
                        onBlur={(parsed) => onGradeBlur?.(student.id, parsed)}
                        disabled={disabled}
                        saving={savingGrades.has(student.id)}
                        saved={savedGrades.has(student.id)}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <GradeLevelBadge value={gradeVal} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* — Acciones — */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-gray-400">
          Las notas se guardan automáticamente al salir de cada campo
        </p>
        <button
          onClick={onSaveAll}
          disabled={saving || disabled || entered === 0}
          className="btn-primary"
        >
          {saving ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Guardando…
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
              Guardar {entered > 0 ? `${entered} nota${entered !== 1 ? 's' : ''}` : 'notas'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
