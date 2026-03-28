import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart2, CheckCircle2, ClipboardList, PenSquare,
  TrendingUp, Users, BookOpen, AlertCircle,
} from 'lucide-react';
import apiClient from '../../../shared/api/client';
import SetupRequiredBanner from '../../../shared/components/SetupRequiredBanner';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function KpiCard({ icon, label, value, sub, color = 'blue' }) {
  const palettes = {
    blue:   { bg: 'bg-blue-50',    icon: 'text-blue-500',    val: 'text-blue-700'    },
    green:  { bg: 'bg-emerald-50', icon: 'text-emerald-500', val: 'text-emerald-700' },
    amber:  { bg: 'bg-amber-50',   icon: 'text-amber-500',   val: 'text-amber-700'   },
    violet: { bg: 'bg-violet-50',  icon: 'text-violet-500',  val: 'text-violet-700'  },
  };
  const p = palettes[color] || palettes.blue;

  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${p.bg}`}>
        <span className={p.icon}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide truncate">{label}</p>
        <p className={`text-3xl font-extrabold mt-0.5 tabular-nums ${p.val}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1 truncate">{sub}</p>}
      </div>
    </div>
  );
}

function ProgressBar({ pct }) {
  const color = pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs tabular-nums text-gray-500 w-9 text-right">{pct}%</span>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function TeacherDashboardPage() {
  const [periods,     setPeriods]     = useState([]);
  const [periodId,    setPeriodId]    = useState('');
  const [summary,     setSummary]     = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [loadingInit, setLoadingInit] = useState(true);

  // Cargar períodos al montar
  useEffect(() => {
    apiClient.get('/periods')
      .then(r => {
        const list = r.data?.data || [];
        setPeriods(list);
        // Preseleccionar el primer período abierto (o el primero disponible)
        const active = list.find(p => !p.is_closed) || list[0];
        if (active) setPeriodId(String(active.id));
      })
      .catch(() => {})
      .finally(() => setLoadingInit(false));
  }, []);

  // Cargar resumen cuando cambia el período
  useEffect(() => {
    if (!periodId) return;
    setLoading(true);
    apiClient.get('/dashboard/teacher-summary', { params: { periodId } })
      .then(r => setSummary(r.data?.data ?? null))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [periodId]);

  if (loadingInit) {
    return (
      <div className="flex items-center justify-center h-48 gap-2 text-gray-400 text-sm">
        <Spinner /> Cargando…
      </div>
    );
  }

  if (periods.length === 0) {
    return (
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Resumen de mis grupos y progreso del período</p>
        </div>
        <SetupRequiredBanner />
      </div>
    );
  }

  const kpis     = summary?.kpis            || {};
  const progress = summary?.grade_progress  || [];
  const attendance = summary?.attendance_summary || [];

  return (
    <div className="max-w-5xl space-y-6">

      {/* ── Encabezado ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Resumen de mis grupos y progreso del período</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 font-medium whitespace-nowrap">Período</label>
          <select
            value={periodId}
            onChange={e => setPeriodId(e.target.value)}
            className="text-sm rounded-lg border border-gray-300 px-3 py-2
                       focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            {periods.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}{!p.is_closed ? ' (activo)' : ''}
              </option>
            ))}
          </select>
          {loading && <Spinner />}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<BookOpen size={20} />}
          label="Mis asignaciones"
          value={loading ? '—' : kpis.total_assignments ?? 0}
          sub="materias en el período"
          color="blue"
        />
        <KpiCard
          icon={<CheckCircle2 size={20} />}
          label="Notas completadas"
          value={loading ? '—' : `${kpis.complete_assignments ?? 0} / ${kpis.total_assignments ?? 0}`}
          sub={loading ? '' : `${kpis.avg_completion_pct ?? 0}% promedio`}
          color={!loading && (kpis.avg_completion_pct ?? 0) >= 100 ? 'green' : 'amber'}
        />
        <KpiCard
          icon={<Users size={20} />}
          label="Grupos activos"
          value={loading ? '—' : attendance.length || [...new Set(progress.map(r => r.classroom_id))].length}
          sub="en el año académico"
          color="violet"
        />
        <KpiCard
          icon={<TrendingUp size={20} />}
          label="% Asistencia prom."
          value={loading ? '—' : kpis.avg_attendance_rate != null ? `${kpis.avg_attendance_rate}%` : '—'}
          sub="promedio de mis grupos"
          color={!loading && (kpis.avg_attendance_rate ?? 0) >= 80 ? 'green' : 'amber'}
        />
      </div>

      {!loading && summary && (
        <>
          {/* ── Progreso de notas por asignación ── */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PenSquare size={16} className="text-indigo-500" />
                <h2 className="font-semibold text-gray-900">Progreso de ingreso de notas</h2>
              </div>
              <Link
                to="/app/grades"
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                Ir a notas →
              </Link>
            </div>

            {progress.length === 0 ? (
              <div className="p-10 text-center">
                <AlertCircle size={28} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-400">
                  No hay asignaciones configuradas para este período.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                      <th className="px-5 py-3 text-left font-medium">Materia</th>
                      <th className="px-5 py-3 text-left font-medium">Grupo</th>
                      <th className="px-5 py-3 text-right font-medium">Ingresadas</th>
                      <th className="px-5 py-3 text-right font-medium w-36">Completitud</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {progress.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-900">
                          {row.subject_name}
                          {row.subject_area && (
                            <span className="ml-1.5 text-xs text-gray-400">{row.subject_area}</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-gray-600">{row.classroom_name}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-gray-500 text-xs">
                          {row.grades_entered} / {row.total_students}
                        </td>
                        <td className="px-5 py-3 w-36">
                          <ProgressBar pct={parseFloat(row.completion_percent || 0)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Resumen de asistencia por grupo ── */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList size={16} className="text-indigo-500" />
                <h2 className="font-semibold text-gray-900">Asistencia por grupo</h2>
              </div>
              <Link
                to="/app/attendance"
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                Registrar asistencia →
              </Link>
            </div>

            {attendance.length === 0 ? (
              <div className="p-10 text-center">
                <AlertCircle size={28} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-400">
                  Aún no hay registros de asistencia en este período.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {attendance.map(c => {
                  const rate = parseFloat(c.attendance_rate || 0);
                  const color = rate >= 80 ? 'emerald' : rate >= 60 ? 'amber' : 'red';
                  const barColor = { emerald: 'bg-emerald-500', amber: 'bg-amber-400', red: 'bg-red-400' }[color];
                  const textColor = { emerald: 'text-emerald-700', amber: 'text-amber-700', red: 'text-red-600' }[color];

                  return (
                    <div key={c.classroom_id} className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-semibold text-gray-900 text-sm">{c.classroom_name}</p>
                        <p className={`text-lg font-extrabold tabular-nums ${textColor}`}>{rate}%</p>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                        <div
                          className={`h-full rounded-full transition-all ${barColor}`}
                          style={{ width: `${Math.min(rate, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 tabular-nums">
                        <span>{c.present_count} presentes</span>
                        <span>{c.absent_count} ausentes</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {!loading && !summary && (
        <div className="card p-12 text-center text-gray-400 text-sm">
          <BarChart2 size={36} className="mx-auto mb-3 text-gray-200" />
          No hay datos disponibles para este período.
        </div>
      )}
    </div>
  );
}
