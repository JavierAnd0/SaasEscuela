import { useState, useEffect } from 'react';
import { Zap, AlertTriangle, Check, TrendingUp } from 'lucide-react';
import apiClient from '../../../shared/api/client';
import { consolidationApi } from '../api/consolidation.api';
import GradeLevelBadge, { getGradeLevel } from '../../grades/components/GradeLevelBadge';

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function getAverageColor(value) {
  const v = parseFloat(value);
  if (isNaN(v)) return 'text-gray-500';
  if (v >= 4.6) return 'text-emerald-600 font-semibold';
  if (v >= 4.0) return 'text-blue-600 font-semibold';
  if (v >= 3.0) return 'text-yellow-600 font-semibold';
  return 'text-red-600 font-semibold';
}

export default function ConsolidationPage() {
  const [classrooms,   setClassrooms]   = useState([]);
  const [periods,      setPeriods]      = useState([]);
  const [classroomId,  setClassroomId]  = useState('');
  const [periodId,     setPeriodId]     = useState('');

  const [summary,      setSummary]      = useState([]);
  const [loadingData,  setLoadingData]  = useState(false);
  const [running,      setRunning]      = useState(false);
  const [toast,        setToast]        = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load classrooms and periods on mount
  useEffect(() => {
    apiClient.get('/classrooms').then(r => setClassrooms(r.data?.data || [])).catch(() => {});
    apiClient.get('/periods').then(r => setPeriods(r.data?.data || [])).catch(() => {});
  }, []);

  // Load consolidation summary when both filters are selected
  useEffect(() => {
    if (!classroomId || !periodId) {
      setSummary([]);
      return;
    }
    setLoadingData(true);
    consolidationApi.getSummary(classroomId, periodId)
      .then(r => setSummary(r.data?.data || []))
      .catch(() => setSummary([]))
      .finally(() => setLoadingData(false));
  }, [classroomId, periodId]);

  const handleRunConsolidation = async () => {
    if (!classroomId || !periodId) {
      showToast('Seleccione un grupo y un período primero.', 'error');
      return;
    }
    setRunning(true);
    try {
      await consolidationApi.run({ classroomId, periodId });
      // Reload summary after running
      const r = await consolidationApi.getSummary(classroomId, periodId);
      setSummary(r.data?.data || []);
      showToast('Consolidación calculada correctamente.');
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al calcular la consolidación.', 'error');
    } finally {
      setRunning(false);
    }
  };

  // Computed stats
  const totalStudents = summary.length;
  const atRiskCount   = summary.filter(s => s.is_at_risk).length;
  const classAverage  = totalStudents > 0
    ? (summary.reduce((acc, s) => acc + parseFloat(s.period_average || 0), 0) / totalStudents).toFixed(2)
    : null;

  // Sort by rank if available, otherwise by average desc
  const sorted = [...summary].sort((a, b) => {
    if (a.rank && b.rank) return a.rank - b.rank;
    return parseFloat(b.period_average || 0) - parseFloat(a.period_average || 0);
  });

  return (
    <div className="max-w-5xl space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consolidación y Promedios</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Calcule los promedios del período y consulte el estado académico del grupo
          </p>
        </div>
        <button
          onClick={handleRunConsolidation}
          disabled={!classroomId || !periodId || running}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {running ? <Spinner /> : <Zap size={16} />}
          {running ? 'Calculando…' : 'Calcular Consolidación'}
        </button>
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

      {/* Filter bar */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Grupo</label>
            <select
              value={classroomId}
              onChange={e => setClassroomId(e.target.value)}
              className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="">Seleccione un grupo…</option>
              {classrooms.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Período</label>
            <select
              value={periodId}
              onChange={e => setPeriodId(e.target.value)}
              className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="">Seleccione un período…</option>
              {periods.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loadingData && (
        <div className="flex items-center justify-center gap-2 text-gray-500 text-sm py-12">
          <Spinner />
          Cargando consolidación…
        </div>
      )}

      {/* Stats summary */}
      {!loadingData && summary.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{totalStudents}</p>
            <p className="text-sm text-gray-500 mt-1">Estudiantes</p>
          </div>
          <div className="card p-4 text-center">
            <p className={`text-3xl font-bold ${atRiskCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {atRiskCount}
            </p>
            <p className="text-sm text-gray-500 mt-1">En riesgo académico</p>
          </div>
          <div className="card p-4 text-center">
            <p className={`text-3xl font-bold ${getAverageColor(classAverage)}`}>
              {classAverage ?? '—'}
            </p>
            <p className="text-sm text-gray-500 mt-1">Promedio del grupo</p>
          </div>
        </div>
      )}

      {/* Results table */}
      {!loadingData && summary.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Resultados del período</h2>
            <span className="text-xs text-gray-400">{totalStudents} estudiantes</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-medium">#</th>
                  <th className="px-5 py-3 text-left font-medium">Estudiante</th>
                  <th className="px-5 py-3 text-center font-medium">Promedio</th>
                  <th className="px-5 py-3 text-center font-medium">Nivel</th>
                  <th className="px-5 py-3 text-center font-medium">Mat. perdidas</th>
                  <th className="px-5 py-3 text-center font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((student, idx) => (
                  <tr
                    key={student.student_id || idx}
                    className={student.is_at_risk ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}
                  >
                    <td className="px-5 py-3 text-gray-400 font-mono text-xs">
                      {student.rank || idx + 1}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-medium text-gray-900">
                        {student.first_name} {student.last_name}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={getAverageColor(student.period_average)}>
                        {parseFloat(student.period_average || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <GradeLevelBadge value={student.period_average} />
                    </td>
                    <td className="px-5 py-3 text-center">
                      {student.failed_subjects_count > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                          {student.failed_subjects_count}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {student.is_at_risk ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full">
                          <AlertTriangle size={12} /> En riesgo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
                          <Check size={12} /> Al día
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state — filters selected but no data */}
      {!loadingData && classroomId && periodId && summary.length === 0 && (
        <div className="card p-12 text-center">
          <TrendingUp size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-700">Sin consolidación calculada</p>
          <p className="text-gray-400 text-sm mt-1">
            Presione "Calcular Consolidación" para generar los promedios de este período.
          </p>
        </div>
      )}

      {/* Initial state — no filters selected */}
      {!classroomId && (
        <div className="card p-12 text-center text-gray-400">
          Seleccione un grupo y período para ver o calcular la consolidación.
        </div>
      )}
    </div>
  );
}
