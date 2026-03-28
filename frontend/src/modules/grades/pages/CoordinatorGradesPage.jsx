import { useState, useEffect, useCallback } from 'react';
import { Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { academicApi } from '../../academic/api/academic.api';
import apiClient from '../../../shared/api/client';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function gradeColor(val) {
  if (val === null || val === undefined) return 'text-gray-300';
  if (val < 3.0) return 'text-red-600 font-semibold';
  if (val < 4.0) return 'text-yellow-600';
  return 'text-green-600 font-semibold';
}

function gradeLabel(val) {
  if (val === null || val === undefined) return '—';
  return val.toFixed(1);
}

function Spinner({ label = 'Cargando…' }) {
  return (
    <div className="flex items-center justify-center h-32 text-gray-400 text-sm gap-2">
      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      {label}
    </div>
  );
}

// ─── Tabla de notas para una materia ─────────────────────────────────────────
function SubjectGradesCard({ subject }) {
  const [open, setOpen] = useState(false);

  const pct = subject.total_students > 0
    ? Math.round((subject.grades_entered / subject.total_students) * 100)
    : 0;

  const avg = (() => {
    const vals = subject.students.map(s => s.grade_value).filter(v => v !== null);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  })();

  return (
    <div className="card overflow-hidden">
      {/* Cabecera de la materia */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">{subject.subject_name}</span>
            {subject.subject_area && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{subject.subject_area}</span>
            )}
          </div>
          <span className="text-xs text-gray-400 mt-0.5 block">
            Docente: {subject.teacher_name}
          </span>
        </div>

        {/* Progreso notas ingresadas */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <div className="text-xs text-gray-500">{subject.grades_entered}/{subject.total_students} notas</div>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-primary-400'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">{pct}%</span>
            </div>
          </div>

          {avg !== null && (
            <div className={`text-base font-bold min-w-[2.5rem] text-right ${gradeColor(avg)}`}>
              {avg.toFixed(1)}
            </div>
          )}

          {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
        </div>
      </button>

      {/* Tabla de estudiantes */}
      {open && (
        <div className="border-t border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-2 font-medium">Estudiante</th>
                <th className="text-left px-4 py-2 font-medium w-28">Documento</th>
                <th className="text-right px-4 py-2 font-medium w-24">Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subject.students.map(st => (
                <tr key={st.student_id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-800">
                    {st.last_name}, {st.first_name}
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{st.document_number}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${gradeColor(st.grade_value)}`}>
                    {gradeLabel(st.grade_value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function CoordinatorGradesPage() {
  const [gradeLevels, setGradeLevels] = useState([]);
  const [classrooms,  setClassrooms]  = useState([]);
  const [periods,     setPeriods]     = useState([]);

  // Selecciones
  const [selGradeLevel, setSelGradeLevel] = useState('');
  const [selShift,      setSelShift]      = useState('');
  const [selClassroom,  setSelClassroom]  = useState('');
  const [selPeriod,     setSelPeriod]     = useState('');

  // Resultados
  const [viewData,  setViewData]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [loadingInit, setLoadingInit] = useState(true);
  const [error,     setError]     = useState(null);

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      academicApi.getGradeLevels(),
      academicApi.getClassrooms(),
      apiClient.get('/periods'),
    ]).then(([glRes, crRes, pRes]) => {
      setGradeLevels(glRes.data.data);
      setClassrooms(crRes.data.data);
      setPeriods(pRes.data.data || []);
    }).catch(() => {
      setError('Error al cargar datos iniciales.');
    }).finally(() => setLoadingInit(false));
  }, []);

  // ── Derivados: jornadas y aulas filtradas ──────────────────────────────────
  const availableShifts = [...new Set(
    classrooms
      .filter(c => !selGradeLevel || c.grade_level_id === selGradeLevel)
      .map(c => c.shift)
  )].sort();

  const filteredClassrooms = classrooms.filter(c => {
    if (selGradeLevel && c.grade_level_id !== selGradeLevel) return false;
    if (selShift      && c.shift !== selShift)               return false;
    return true;
  });

  // Reset en cascada
  const handleGradeChange = (val) => {
    setSelGradeLevel(val);
    setSelShift('');
    setSelClassroom('');
    setViewData(null);
  };

  const handleShiftChange = (val) => {
    setSelShift(val);
    setSelClassroom('');
    setViewData(null);
  };

  const handleClassroomChange = (val) => {
    setSelClassroom(val);
    setViewData(null);
  };

  const handlePeriodChange = (val) => {
    setSelPeriod(val);
    setViewData(null);
  };

  // ── Cargar vista de notas ──────────────────────────────────────────────────
  const handleLoad = useCallback(async () => {
    if (!selClassroom || !selPeriod) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/grades/coordinator-view', {
        params: { classroomId: selClassroom, periodId: selPeriod },
      });
      setViewData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar notas.');
      setViewData(null);
    } finally { setLoading(false); }
  }, [selClassroom, selPeriod]);

  // ── Selector de periodo activo por defecto (el primero no cerrado) ─────────
  useEffect(() => {
    if (!selPeriod && periods.length) {
      const active = periods.find(p => !p.is_closed) || periods[0];
      if (active) setSelPeriod(String(active.id));
    }
  }, [periods, selPeriod]);

  // ── Estadísticas del grupo seleccionado ───────────────────────────────────
  const stats = viewData ? (() => {
    const totalSubjects  = viewData.subjects.length;
    const totalStudents  = viewData.students?.length ?? (viewData.subjects[0]?.total_students ?? 0);
    const totalGrades    = viewData.subjects.reduce((a, s) => a + s.grades_entered, 0);
    const maxGrades      = totalSubjects * totalStudents;
    const completePct    = maxGrades > 0 ? Math.round((totalGrades / maxGrades) * 100) : 0;
    return { totalSubjects, totalStudents, totalGrades, maxGrades, completePct };
  })() : null;

  if (loadingInit) return <Spinner label="Cargando estructura académica…" />;

  const selectedClassroomObj = classrooms.find(c => c.id === selClassroom);
  const selectedPeriodObj    = periods.find(p => String(p.id) === selPeriod);

  return (
    <div className="max-w-5xl space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notas por Grado</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Vista de solo lectura. Las notas son registradas por los docentes.
        </p>
      </div>

      {/* Error global */}
      {error && (
        <div className="p-3 rounded-lg text-sm border bg-red-50 border-red-200 text-red-700">{error}</div>
      )}

      {/* Filtros en cascada */}
      <div className="card p-4 space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Seleccionar grupo y período</p>

        <div className="flex flex-wrap gap-3 items-end">
          {/* Grado */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Grado</label>
            <select
              value={selGradeLevel}
              onChange={e => handleGradeChange(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-40"
            >
              <option value="">Todos los grados</option>
              {gradeLevels.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* Jornada */}
          {availableShifts.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Jornada</label>
              <div className="flex gap-2 flex-wrap">
                {['', ...availableShifts].map(s => (
                  <button
                    key={s || 'todas'}
                    onClick={() => handleShiftChange(s)}
                    className={`text-xs px-3 py-2 rounded-lg border capitalize transition-colors ${
                      selShift === s
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'border-gray-300 text-gray-500 hover:border-primary-400'
                    }`}
                  >{s || 'Todas'}</button>
                ))}
              </div>
            </div>
          )}

          {/* Grupo */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Grupo</label>
            <select
              value={selClassroom}
              onChange={e => handleClassroomChange(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-48"
            >
              <option value="">Seleccionar grupo…</option>
              {filteredClassrooms.map(c => (
                <option key={c.id} value={c.id}>
                  {c.grade_level_name} {c.name} — {c.shift}
                </option>
              ))}
            </select>
          </div>

          {/* Período */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Período</label>
            <select
              value={selPeriod}
              onChange={e => handlePeriodChange(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-40"
            >
              <option value="">Seleccionar período…</option>
              {periods.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}{!p.is_closed ? ' (activo)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleLoad}
            disabled={!selClassroom || !selPeriod || loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            <Eye size={15} />
            {loading ? 'Cargando…' : 'Ver notas'}
          </button>
        </div>
      </div>

      {/* Spinner de carga */}
      {loading && <Spinner label="Cargando notas…" />}

      {/* Resumen del grupo */}
      {viewData && !loading && (
        <>
          {/* Info del grupo + estadísticas */}
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                {selectedClassroomObj
                  ? `${selectedClassroomObj.grade_level_name} ${selectedClassroomObj.name}`
                  : 'Grupo'}
              </h2>
              <p className="text-sm text-gray-400 capitalize">
                Jornada {selectedClassroomObj?.shift} · {selectedPeriodObj?.name ?? 'Período'}
              </p>
            </div>
            {stats && (
              <div className="ml-auto flex gap-4 text-center">
                <div>
                  <div className="text-xl font-bold text-gray-800">{stats.totalStudents}</div>
                  <div className="text-xs text-gray-400">estudiantes</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-800">{stats.totalSubjects}</div>
                  <div className="text-xs text-gray-400">materias</div>
                </div>
                <div>
                  <div className={`text-xl font-bold ${stats.completePct === 100 ? 'text-green-600' : 'text-primary-600'}`}>
                    {stats.completePct}%
                  </div>
                  <div className="text-xs text-gray-400">completado</div>
                </div>
              </div>
            )}
          </div>

          {/* Materias con notas */}
          {viewData.subjects.length === 0 ? (
            <div className="card p-10 text-center">
              <Eye size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-600">Sin materias asignadas</p>
              <p className="text-sm text-gray-400 mt-1">
                Configura las asignaciones docentes en "Asignaciones Docentes".
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {viewData.subjects.map(subject => (
                <SubjectGradesCard key={subject.subject_id} subject={subject} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Estado vacío inicial */}
      {!viewData && !loading && (
        <div className="card p-12 text-center">
          <Eye size={44} className="mx-auto mb-4 text-gray-200" />
          <p className="font-medium text-gray-500">Selecciona un grupo y período</p>
          <p className="text-sm text-gray-400 mt-1">
            Elige el grado, jornada, grupo y período para visualizar las notas.
          </p>
        </div>
      )}
    </div>
  );
}
