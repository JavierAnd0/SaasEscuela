import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { PenSquare, AlertTriangle, Bell } from 'lucide-react';
import apiClient from '../../../shared/api/client';
import { dashboardApi } from '../api/dashboard.api';
import GradeLevelBadge from '../../grades/components/GradeLevelBadge';

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function barColor(pct) {
  if (pct >= 100) return '#10b981'; // emerald-500
  if (pct > 50)   return '#f59e0b'; // amber-500
  return '#ef4444';                  // red-500
}

function KpiCard({ icon, label, value, sub, accent }) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-xl ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-3xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// Custom tooltip for the bar chart
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs max-w-xs">
      <p className="font-semibold text-gray-900 mb-1">{d.label}</p>
      <p className="text-gray-600">{d.subject_name}</p>
      <p className="text-gray-600">{d.classroom_name}</p>
      <p className="mt-2 font-medium" style={{ color: barColor(d.completion_percent) }}>
        {d.grades_entered} / {d.total_students} estudiantes ({d.completion_percent.toFixed(0)}%)
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const [periods,           setPeriods]           = useState([]);
  const [periodId,          setPeriodId]          = useState('');

  const [gradeProgress,     setGradeProgress]     = useState([]);
  const [atRisk,            setAtRisk]            = useState([]);
  const [attendanceAlerts,  setAttendanceAlerts]  = useState([]);

  const [loading,           setLoading]           = useState(false);

  // Load periods on mount
  useEffect(() => {
    apiClient.get('/periods')
      .then(r => {
        const list = r.data?.data || [];
        setPeriods(list);
        if (list.length > 0) setPeriodId(list[0].id);
      })
      .catch(() => {});
  }, []);

  // Load all dashboard data when period changes
  useEffect(() => {
    if (!periodId) return;
    setLoading(true);
    Promise.all([
      dashboardApi.getGradeProgress(periodId),
      dashboardApi.getAtRisk(periodId),
      dashboardApi.getAttendanceAlerts(periodId, 3),
    ])
      .then(([gpRes, arRes, aaRes]) => {
        setGradeProgress(gpRes.data?.data || []);
        setAtRisk(arRes.data?.data || []);
        setAttendanceAlerts(aaRes.data?.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [periodId]);

  // KPI derived values
  const totalTeachers    = gradeProgress.length;
  const completeTeachers = gradeProgress.filter(t => t.is_complete).length;

  // Chart data: one bar per teacher+subject
  const chartData = gradeProgress.map(t => ({
    label:              `${t.teacher_first_name} ${t.teacher_last_name}`.trim(),
    subject_name:       t.subject_name,
    classroom_name:     t.classroom_name,
    grades_entered:     t.grades_entered,
    total_students:     t.total_students,
    completion_percent: parseFloat(t.completion_percent || 0),
    short:              `${t.teacher_first_name?.[0] || ''}${t.teacher_last_name?.[0] || ''}·${t.subject_name?.slice(0, 6) || ''}`,
  }));

  return (
    <div className="max-w-6xl space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Coordinador</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Seguimiento en tiempo real del estado académico del colegio
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
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-4 justify-center">
          <Spinner />
          Cargando datos del período…
        </div>
      )}

      {/* No period selected */}
      {!periodId && !loading && (
        <div className="card p-12 text-center text-gray-400">
          Seleccione un período para ver el dashboard.
        </div>
      )}

      {periodId && !loading && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              icon={<PenSquare size={22} className="text-blue-600" />}
              label="Docentes con notas completas"
              value={`${completeTeachers} / ${totalTeachers}`}
              sub={totalTeachers > 0 ? `${((completeTeachers / totalTeachers) * 100).toFixed(0)}% de completitud` : 'Sin datos'}
              accent="bg-blue-50"
            />
            <KpiCard
              icon={<AlertTriangle size={22} className={atRisk.length > 0 ? 'text-red-500' : 'text-emerald-500'} />}
              label="Estudiantes en riesgo académico"
              value={atRisk.length}
              sub={atRisk.length > 0 ? 'Promedio por debajo de 3.0' : 'Ningún estudiante en riesgo'}
              accent={atRisk.length > 0 ? 'bg-red-50' : 'bg-emerald-50'}
            />
            <KpiCard
              icon={<Bell size={22} className={attendanceAlerts.length > 0 ? 'text-amber-500' : 'text-emerald-500'} />}
              label="Alertas de inasistencia"
              value={attendanceAlerts.length}
              sub={attendanceAlerts.length > 0 ? 'Más de 3 faltas injustificadas' : 'Sin alertas activas'}
              accent={attendanceAlerts.length > 0 ? 'bg-amber-50' : 'bg-emerald-50'}
            />
          </div>

          {/* Grade entry progress chart */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-1">Progreso de ingreso de notas por docente</h2>
            <p className="text-xs text-gray-400 mb-5">
              Verde = 100% completado · Amarillo = {'>'} 50% · Rojo = ≤ 50%
            </p>
            {chartData.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">
                No hay datos de ingreso de notas para este período.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 20, left: 0, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="short"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    angle={-40}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickFormatter={v => `${v}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="completion_percent" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} fill={barColor(entry.completion_percent)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* At-risk students table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Estudiantes en riesgo académico</h2>
              <span className="text-xs text-gray-400">{atRisk.length} estudiante{atRisk.length !== 1 ? 's' : ''}</span>
            </div>
            {atRisk.length === 0 ? (
              <div className="p-10 text-center text-gray-400 text-sm">
                Ningún estudiante está en riesgo académico en este período.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                      <th className="px-5 py-3 text-left font-medium">Estudiante</th>
                      <th className="px-5 py-3 text-left font-medium">Grupo</th>
                      <th className="px-5 py-3 text-center font-medium">Promedio</th>
                      <th className="px-5 py-3 text-center font-medium">Nivel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {atRisk.map((s, idx) => (
                      <tr key={idx} className="bg-red-50 hover:bg-red-100">
                        <td className="px-5 py-3 font-medium text-gray-900">
                          {s.first_name} {s.last_name}
                        </td>
                        <td className="px-5 py-3 text-gray-600">{s.classroom_name}</td>
                        <td className="px-5 py-3 text-center font-semibold text-red-700">
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

          {/* Attendance alerts table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Alertas de inasistencia injustificada</h2>
              <span className="text-xs text-gray-400">{attendanceAlerts.length} alerta{attendanceAlerts.length !== 1 ? 's' : ''}</span>
            </div>
            {attendanceAlerts.length === 0 ? (
              <div className="p-10 text-center text-gray-400 text-sm">
                No hay alertas de inasistencia para el umbral configurado (≥ 3 faltas).
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                      <th className="px-5 py-3 text-left font-medium">Estudiante</th>
                      <th className="px-5 py-3 text-left font-medium">Grupo</th>
                      <th className="px-5 py-3 text-center font-medium">Faltas injustificadas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {attendanceAlerts.map((a, idx) => (
                      <tr key={idx} className="bg-amber-50 hover:bg-amber-100">
                        <td className="px-5 py-3 font-medium text-gray-900">
                          {a.first_name} {a.last_name}
                        </td>
                        <td className="px-5 py-3 text-gray-600">{a.classroom_name}</td>
                        <td className="px-5 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-200 text-amber-800 font-bold text-sm">
                            {a.unjustified_absences}
                          </span>
                        </td>
                      </tr>
                    ))}
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
