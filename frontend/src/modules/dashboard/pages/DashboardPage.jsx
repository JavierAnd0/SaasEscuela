import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  Users, GraduationCap, BookOpen, UserCog,
  TrendingUp, AlertTriangle, Bell, CheckCircle2,
  Clock, LayoutGrid,
} from 'lucide-react';
import { dashboardApi } from '../api/dashboard.api';
import apiClient from '../../../shared/api/client';
import GradeLevelBadge from '../../grades/components/GradeLevelBadge';
import SetupRequiredBanner from '../../../shared/components/SetupRequiredBanner';

// ─── Colores ─────────────────────────────────────────────────────────────────
function barColor(pct) {
  if (pct >= 100) return '#10b981';
  if (pct > 50)   return '#f59e0b';
  return '#ef4444';
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

// ─── KPI principal (número grande) ───────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = 'blue', loading }) {
  const palettes = {
    blue:    { bg: 'bg-blue-50',    icon: 'text-blue-600',    val: 'text-blue-700' },
    green:   { bg: 'bg-emerald-50', icon: 'text-emerald-600', val: 'text-emerald-700' },
    amber:   { bg: 'bg-amber-50',   icon: 'text-amber-600',   val: 'text-amber-700' },
    red:     { bg: 'bg-red-50',     icon: 'text-red-600',     val: 'text-red-700' },
    violet:  { bg: 'bg-violet-50',  icon: 'text-violet-600',  val: 'text-violet-700' },
    gray:    { bg: 'bg-gray-50',    icon: 'text-gray-500',    val: 'text-gray-700' },
  };
  const p = palettes[color] || palettes.blue;

  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${p.bg}`}>
        <span className={p.icon}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide truncate">{label}</p>
        <p className={`text-3xl font-extrabold mt-0.5 tabular-nums ${p.val}`}>
          {loading ? <span className="text-gray-300">—</span> : value}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-1 truncate">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Barra de progreso con label ─────────────────────────────────────────────
function ProgressBar({ pct, color }) {
  const c = color === 'green' ? 'bg-emerald-500' : color === 'amber' ? 'bg-amber-400' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${c}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs tabular-nums text-gray-500 w-9 text-right">{pct.toFixed(0)}%</span>
    </div>
  );
}

// ─── Tooltip del gráfico ─────────────────────────────────────────────────────
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs max-w-xs">
      <p className="font-semibold text-gray-900 mb-1">{d.label}</p>
      <p className="text-gray-500">{d.subject_name} · {d.classroom_name}</p>
      <p className="mt-1.5 font-medium" style={{ color: barColor(d.completion_percent) }}>
        {d.grades_entered} / {d.total_students} estudiantes ({d.completion_percent.toFixed(0)}%)
      </p>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [periods,          setPeriods]          = useState([]);
  const [periodId,         setPeriodId]         = useState('');
  const [summary,          setSummary]          = useState(null);
  const [gradeProgress,    setGradeProgress]    = useState([]);
  const [atRisk,           setAtRisk]           = useState([]);
  const [attendanceAlerts, setAttendanceAlerts] = useState([]);
  const [loading,          setLoading]          = useState(false);
  const [loadingInit,      setLoadingInit]      = useState(true);

  // Cargar períodos al montar
  useEffect(() => {
    apiClient.get('/periods')
      .then(r => {
        const list = r.data?.data || [];
        setPeriods(list);
        const active = list.find(p => !p.is_closed) || list[0];
        if (active) setPeriodId(String(active.id));
      })
      .catch(() => {})
      .finally(() => setLoadingInit(false));
  }, []);

  // Cargar datos del período seleccionado
  useEffect(() => {
    if (!periodId) return;
    setLoading(true);
    Promise.all([
      dashboardApi.getSummary(periodId),
      dashboardApi.getGradeProgress(periodId),
      dashboardApi.getAtRisk(periodId),
      dashboardApi.getAttendanceAlerts(periodId, 3),
    ])
      .then(([sumRes, gpRes, arRes, aaRes]) => {
        setSummary(sumRes.data?.data ?? null);
        setGradeProgress(gpRes.data?.data || []);
        setAtRisk(arRes.data?.data || []);
        setAttendanceAlerts(aaRes.data?.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [periodId]);

  // KPIs derivados
  const totalAssignments = gradeProgress.length;
  const completeAssignments = gradeProgress.filter(t => t.is_complete).length;
  const completionPct = totalAssignments > 0
    ? Math.round((completeAssignments / totalAssignments) * 100)
    : 0;

  // Datos del gráfico
  const chartData = gradeProgress.map(t => ({
    label:              `${t.teacher_first_name?.[0] || ''}. ${t.teacher_last_name || ''}`,
    subject_name:       t.subject_name,
    classroom_name:     `${t.classroom_name}`,
    grades_entered:     t.grades_entered,
    total_students:     t.total_students,
    completion_percent: parseFloat(t.completion_percent || 0),
    short:              `${t.teacher_last_name?.slice(0, 8) || ''}·${t.subject_name?.slice(0, 5) || ''}`,
  }));

  const selectedPeriod = periods.find(p => String(p.id) === periodId);

  if (loadingInit) {
    return (
      <div className="flex items-center justify-center h-48 gap-2 text-gray-400 text-sm">
        <Spinner /> Cargando…
      </div>
    );
  }

  if (periods.length === 0) {
    return (
      <div className="max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Seguimiento académico en tiempo real</p>
        </div>
        <SetupRequiredBanner />
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">

      {/* ── Encabezado ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {summary?.active_year_name
              ? `Año académico ${summary.active_year_name}`
              : 'Seguimiento académico en tiempo real'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 font-medium whitespace-nowrap">Período</label>
          <select
            value={periodId}
            onChange={e => setPeriodId(e.target.value)}
            className="text-sm rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">Seleccione…</option>
            {periods.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}{!p.is_closed ? ' (activo)' : ''}
              </option>
            ))}
          </select>
          {loading && <Spinner />}
        </div>
      </div>

      {!periodId && (
        <div className="card p-12 text-center text-gray-400">Selecciona un período para ver el dashboard.</div>
      )}

      {periodId && (
        <>
          {/* ── Fila 1: Contadores globales del colegio ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Users size={20} />}
              label="Estudiantes activos"
              value={summary?.total_students ?? '—'}
              sub="matriculados año activo"
              color="blue"
              loading={loading}
            />
            <StatCard
              icon={<UserCog size={20} />}
              label="Docentes"
              value={summary?.total_teachers ?? '—'}
              sub="activos en el colegio"
              color="violet"
              loading={loading}
            />
            <StatCard
              icon={<LayoutGrid size={20} />}
              label="Grupos"
              value={summary?.total_classrooms ?? '—'}
              sub="año académico activo"
              color="amber"
              loading={loading}
            />
            <StatCard
              icon={<BookOpen size={20} />}
              label="Materias"
              value={summary?.total_subjects ?? '—'}
              sub="configuradas"
              color="gray"
              loading={loading}
            />
          </div>

          {/* ── Fila 2: KPIs del período ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={<TrendingUp size={20} />}
              label="Notas completadas"
              value={`${completeAssignments} / ${totalAssignments}`}
              sub={totalAssignments > 0 ? `${completionPct}% de las asignaciones` : 'Sin asignaciones con notas'}
              color={completionPct === 100 ? 'green' : completionPct > 50 ? 'amber' : 'blue'}
              loading={loading}
            />
            <StatCard
              icon={<AlertTriangle size={20} />}
              label="Estudiantes en riesgo"
              value={atRisk.length}
              sub={atRisk.length > 0 ? 'Promedio por debajo de 3.0' : 'Ningún estudiante en riesgo'}
              color={atRisk.length > 0 ? 'red' : 'green'}
              loading={loading}
            />
            <StatCard
              icon={<Bell size={20} />}
              label="Alertas de inasistencia"
              value={attendanceAlerts.length}
              sub={attendanceAlerts.length > 0 ? 'Con ≥ 3 faltas injustificadas' : 'Sin alertas activas'}
              color={attendanceAlerts.length > 0 ? 'amber' : 'green'}
              loading={loading}
            />
          </div>

          {/* ── Gráfico: progreso de notas por docente ── */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-gray-900">Ingreso de notas por asignación</h2>
              <span className="text-xs text-gray-400">{selectedPeriod?.name}</span>
            </div>
            <p className="text-xs text-gray-400 mb-5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />100%
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mx-1 ml-3" />&gt;50%
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 mx-1 ml-3" />≤50%
            </p>
            {chartData.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">
                No hay datos de ingreso de notas para este período.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="short"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    angle={-40}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    tickFormatter={v => `${v}%`}
                    width={36}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="completion_percent" radius={[4, 4, 0, 0]} maxBarSize={44}>
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} fill={barColor(entry.completion_percent)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Tabla: progreso detallado por asignación ── */}
          {chartData.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Detalle por asignación</h2>
                <span className="text-xs text-gray-400">{chartData.length} asignaciones</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                      <th className="px-5 py-3 text-left font-medium">Docente</th>
                      <th className="px-5 py-3 text-left font-medium">Materia</th>
                      <th className="px-5 py-3 text-left font-medium">Grupo</th>
                      <th className="px-5 py-3 text-right font-medium">Progreso</th>
                      <th className="px-5 py-3 text-right font-medium w-28">Completitud</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {gradeProgress.map((t, idx) => {
                      const pct = parseFloat(t.completion_percent || 0);
                      const color = pct >= 100 ? 'green' : pct > 50 ? 'amber' : 'red';
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">
                            {t.teacher_last_name}, {t.teacher_first_name}
                          </td>
                          <td className="px-5 py-3 text-gray-600">{t.subject_name}</td>
                          <td className="px-5 py-3 text-gray-600">{t.classroom_name}</td>
                          <td className="px-5 py-3 text-right text-xs text-gray-400 tabular-nums whitespace-nowrap">
                            {t.grades_entered} / {t.total_students}
                          </td>
                          <td className="px-5 py-3 w-28">
                            <ProgressBar pct={pct} color={color} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Tabla: estudiantes en riesgo ── */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className={atRisk.length > 0 ? 'text-red-500' : 'text-emerald-500'} />
                <h2 className="font-semibold text-gray-900">Estudiantes en riesgo académico</h2>
              </div>
              <span className="text-xs text-gray-400">{atRisk.length} estudiante{atRisk.length !== 1 ? 's' : ''}</span>
            </div>
            {atRisk.length === 0 ? (
              <div className="p-10 text-center">
                <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-400" />
                <p className="text-sm text-gray-500 font-medium">Ningún estudiante en riesgo</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                      <th className="px-5 py-3 text-left font-medium">#</th>
                      <th className="px-5 py-3 text-left font-medium">Estudiante</th>
                      <th className="px-5 py-3 text-left font-medium">Grupo</th>
                      <th className="px-5 py-3 text-center font-medium">Promedio</th>
                      <th className="px-5 py-3 text-center font-medium">Nivel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {atRisk.map((s, idx) => (
                      <tr key={idx} className="hover:bg-red-50">
                        <td className="px-5 py-3 text-gray-400 tabular-nums">{idx + 1}</td>
                        <td className="px-5 py-3 font-medium text-gray-900">
                          {s.last_name}, {s.first_name}
                        </td>
                        <td className="px-5 py-3 text-gray-500">{s.classroom_name}</td>
                        <td className="px-5 py-3 text-center font-bold text-red-700 tabular-nums">
                          {parseFloat(s.period_average || 0).toFixed(2)}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <GradeLevelBadge value={s.period_average} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Tabla: alertas de inasistencia ── */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className={attendanceAlerts.length > 0 ? 'text-amber-500' : 'text-emerald-500'} />
                <h2 className="font-semibold text-gray-900">Inasistencias injustificadas</h2>
                <span className="text-xs text-gray-400">(umbral ≥ 3 faltas)</span>
              </div>
              <span className="text-xs text-gray-400">{attendanceAlerts.length} alerta{attendanceAlerts.length !== 1 ? 's' : ''}</span>
            </div>
            {attendanceAlerts.length === 0 ? (
              <div className="p-10 text-center">
                <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-400" />
                <p className="text-sm text-gray-500 font-medium">Sin alertas de inasistencia</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                      <th className="px-5 py-3 text-left font-medium">Estudiante</th>
                      <th className="px-5 py-3 text-left font-medium">Grupo</th>
                      <th className="px-5 py-3 text-center font-medium">Faltas injustificadas</th>
                      <th className="px-5 py-3 text-left font-medium">Severidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {attendanceAlerts.map((a, idx) => {
                      const n = parseInt(a.unjustified_absences, 10);
                      const sev = n >= 10 ? { label: 'Crítico', cls: 'bg-red-100 text-red-700' }
                                : n >= 6  ? { label: 'Alto',    cls: 'bg-orange-100 text-orange-700' }
                                :           { label: 'Medio',   cls: 'bg-amber-100 text-amber-700' };
                      return (
                        <tr key={idx} className="hover:bg-amber-50">
                          <td className="px-5 py-3 font-medium text-gray-900">
                            {a.last_name}, {a.first_name}
                          </td>
                          <td className="px-5 py-3 text-gray-500">{a.classroom_name}</td>
                          <td className="px-5 py-3 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-200 text-amber-800 font-bold text-sm tabular-nums">
                              {n}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${sev.cls}`}>
                              {sev.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
