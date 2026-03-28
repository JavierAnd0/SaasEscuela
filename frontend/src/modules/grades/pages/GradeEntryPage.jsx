import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Lock, Clock, AlertTriangle } from 'lucide-react';
import apiClient       from '../../../shared/api/client';
import { gradesApi }   from '../api/grades.api';
import AssignmentTabs  from '../components/AssignmentTabs';
import GradesGrid      from '../components/GradesGrid';
import SetupRequiredBanner from '../../../shared/components/SetupRequiredBanner';

export default function GradeEntryPage() {
  // — Datos de referencia —
  const [assignments,  setAssignments]  = useState([]);
  const [periods,      setPeriods]      = useState([]);

  // — Selección activa —
  const [selected,    setSelected]    = useState(null);   // asignación { classroomId, subjectId, ... }
  const [periodId,    setPeriodId]    = useState('');

  // — Datos del grid —
  const [students,    setStudents]    = useState([]);
  const [grades,      setGrades]      = useState({});     // { studentId: string }
  const [savedGrades, setSavedGrades] = useState(new Set());
  const [savingGrades,setSavingGrades]= useState(new Set());

  // — Estado UI —
  const [loadingRef,  setLoadingRef]  = useState(true);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [toast,       setToast]       = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Estado de la ventana de notas para el período seleccionado
  const gradeWindowInfo = useCallback(() => {
    const p = periods.find(x => x.id === periodId);
    if (!p) return null;
    if (p.is_closed) return { type: 'closed', msg: `El período "${p.name}" está cerrado manualmente.` };
    const today = new Date().toISOString().slice(0, 10);
    const fmt = d => new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
    if (p.grades_open_from && today < p.grades_open_from)
      return { type: 'pending', msg: `La ventana de notas abre el ${fmt(p.grades_open_from)}.` };
    if (p.grades_open_until && today > p.grades_open_until)
      return { type: 'expired', msg: `La ventana de notas cerró el ${fmt(p.grades_open_until)}.` };
    return null;
  }, [periods, periodId]);

  // Cargar asignaciones y períodos al montar
  useEffect(() => {
    setLoadingRef(true);
    Promise.all([
      gradesApi.getMyAssignments(),
      apiClient.get('/periods'),
    ])
      .then(([asgRes, perRes]) => {
        const asgList = asgRes.data?.data  || [];
        const perList = perRes.data?.data  || [];
        setAssignments(asgList);
        setPeriods(perList);

        // Preseleccionar primer elemento de cada lista
        if (asgList.length > 0) setSelected(asgList[0]);
        if (perList.length > 0) setPeriodId(perList[0].id);
      })
      .catch(() => showToast('Error al cargar asignaciones.', 'error'))
      .finally(() => setLoadingRef(false));
  }, [showToast]);

  // Cargar estudiantes y notas cuando cambia la selección
  useEffect(() => {
    if (!selected || !periodId) return;

    setLoadingGrid(true);
    setGrades({});
    setSavedGrades(new Set());

    Promise.all([
      apiClient.get('/students', { params: { classroomId: selected.classroom_id } }),
      gradesApi.getByClassroomSubjectPeriod(selected.classroom_id, selected.subject_id, periodId),
    ])
      .then(([studRes, gradesRes]) => {
        const studs     = studRes.data?.data   || [];
        const existing  = gradesRes.data?.data || [];

        setStudents(studs);

        // Construir mapa de notas existentes y marcarlas como guardadas
        const gradeMap  = {};
        const savedSet  = new Set();
        existing.forEach(g => {
          gradeMap[g.student_id] = String(parseFloat(g.grade_value).toFixed(1));
          savedSet.add(g.student_id);
        });
        setGrades(gradeMap);
        setSavedGrades(savedSet);
      })
      .catch(() => showToast('Error al cargar los estudiantes.', 'error'))
      .finally(() => setLoadingGrid(false));
  }, [selected, periodId, showToast]);

  // Auto-guardado al salir de un campo
  const handleGradeBlur = useCallback(async (studentId, parsedValue) => {
    if (parsedValue === null) return;                         // valor inválido
    if (savedGrades.has(studentId)) {
      const existing = parseFloat(grades[studentId]);
      if (existing === parsedValue) return;                   // sin cambios
    }

    setSavingGrades(prev => new Set([...prev, studentId]));
    try {
      await gradesApi.bulkSave({
        classroomId: selected.classroom_id,
        subjectId:   selected.subject_id,
        periodId,
        grades: [{ studentId, gradeValue: parsedValue }],
      });
      setSavedGrades(prev => new Set([...prev, studentId]));
    } catch {
      showToast('No se pudo guardar la nota. Intente de nuevo.', 'error');
    } finally {
      setSavingGrades(prev => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
    }
  }, [selected, periodId, grades, savedGrades, showToast]);

  // Guardado masivo de todas las notas válidas
  const handleSaveAll = async () => {
    const toSave = students
      .map(s => ({ studentId: s.id, gradeValue: parseFloat(grades[s.id]) }))
      .filter(g => !isNaN(g.gradeValue) && g.gradeValue >= 1 && g.gradeValue <= 5);

    if (!toSave.length) {
      showToast('No hay notas válidas para guardar.', 'error');
      return;
    }

    setSaving(true);
    try {
      await gradesApi.bulkSave({
        classroomId: selected.classroom_id,
        subjectId:   selected.subject_id,
        periodId,
        grades: toSave,
      });
      setSavedGrades(new Set(toSave.map(g => g.studentId)));
      showToast(`${toSave.length} nota${toSave.length !== 1 ? 's' : ''} guardada${toSave.length !== 1 ? 's' : ''} correctamente.`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al guardar las notas.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // — Render —

  if (loadingRef) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 gap-2 text-sm">
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        Cargando asignaciones…
      </div>
    );
  }

  if (periods.length === 0) {
    return (
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ingreso de Notas</h1>
          <p className="text-gray-500 text-sm mt-0.5">Escala colombiana · 1.0 – 5.0</p>
        </div>
        <SetupRequiredBanner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ingreso de Notas</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Escala colombiana · 1.0 – 5.0
          </p>
        </div>

        {/* Selector de período */}
        {periods.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 font-medium whitespace-nowrap">Período</label>
            <select
              value={periodId}
              onChange={e => setPeriodId(e.target.value)}
              className="text-sm rounded-lg border border-gray-300 px-3 py-2
                         focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              {periods.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`p-3 rounded-lg text-sm border ${
          toast.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Banner de ventana de notas */}
      {(() => {
        const info = gradeWindowInfo();
        if (!info) return null;
        const styles = {
          closed:  { bg: 'bg-red-50 border-red-200 text-red-700',    Icon: Lock },
          pending: { bg: 'bg-blue-50 border-blue-200 text-blue-700',  Icon: Clock },
          expired: { bg: 'bg-amber-50 border-amber-200 text-amber-700', Icon: AlertTriangle },
        }[info.type];
        return (
          <div className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${styles.bg}`}>
            <styles.Icon size={16} className="flex-shrink-0" />
            <span>{info.msg}</span>
          </div>
        );
      })()}

      {/* Sin asignaciones */}
      {assignments.length === 0 && (
        <div className="card p-10 text-center">
          <ClipboardList size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-700">Sin asignaciones activas</p>
          <p className="text-gray-400 text-sm mt-1">
            No tiene materias asignadas para el año académico en curso.
            Contacte al coordinador para que configure sus asignaciones.
          </p>
        </div>
      )}

      {/* Tabs de asignaciones */}
      {assignments.length > 0 && (
        <div className="card p-4 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Sus materias</p>
          <AssignmentTabs
            assignments={assignments}
            selectedId={selected?.assignment_id}
            onSelect={a => {
              setSelected(a);
              setStudents([]);
            }}
          />
        </div>
      )}

      {/* Grid de notas */}
      {selected && periodId && (
        <div className="card p-5">

          {/* Header del grid */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="font-semibold text-gray-900 text-base">
                {selected.subject_name}
              </h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {selected.classroom_name}
                {selected.grade_level_name && ` · ${selected.grade_level_name}`}
                {' · '}
                {periods.find(p => p.id === periodId)?.name || ''}
              </p>
            </div>
          </div>

          {loadingGrid ? (
            <div className="flex items-center justify-center py-12 text-gray-400 gap-2 text-sm">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Cargando estudiantes…
            </div>
          ) : students.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              No hay estudiantes matriculados en este grupo.
            </div>
          ) : (
            <GradesGrid
              students={students}
              grades={grades}
              savedGrades={savedGrades}
              savingGrades={savingGrades}
              onGradeChange={(id, raw) => {
                setGrades(prev => ({ ...prev, [id]: raw }));
                // Ya no está guardado si cambió el valor
                setSavedGrades(prev => {
                  const next = new Set(prev);
                  next.delete(id);
                  return next;
                });
              }}
              onGradeBlur={handleGradeBlur}
              onSaveAll={handleSaveAll}
              saving={saving}
            />
          )}
        </div>
      )}

      {/* Estado: falta seleccionar período */}
      {selected && !periodId && (
        <div className="card p-8 text-center text-gray-400 text-sm">
          Seleccione un período para comenzar a ingresar notas.
        </div>
      )}
    </div>
  );
}
