import { useState, useEffect } from 'react';
import { FileDown } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import { attendanceApi } from '../api/attendance.api';
import apiClient from '../../../shared/api/client';
import { downloadExcel } from '../../../shared/utils/exportBlob';

export default function AttendanceDashboardPage() {
  const [periods,      setPeriods]      = useState([]);
  const [periodId,     setPeriodId]     = useState('');
  const [dashboard,    setDashboard]    = useState(null);
  const [alerts,       setAlerts]       = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [exportingId,  setExportingId]  = useState(null);  // classroomId being exported

  const handleExportClassroom = async (classroomId) => {
    setExportingId(classroomId);
    try {
      await downloadExcel('/export/attendance', { classroomId, periodId }, `asistencia_${Date.now()}.xlsx`);
    } catch {
      // silent — no toast setup in this page; browser will show nothing
    } finally { setExportingId(null); }
  };

  useEffect(() => {
    apiClient.get('/periods').then(r => {
      const ps = r.data?.data || [];
      setPeriods(ps);
      if (ps.length > 0) setPeriodId(ps[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!periodId) return;
    setLoading(true);
    Promise.all([
      attendanceApi.getTeacherDashboard(periodId),
      attendanceApi.getAlerts(periodId, 3),
    ])
      .then(([dashRes, alertRes]) => {
        setDashboard(dashRes.data?.data || null);
        setAlerts(alertRes.data?.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [periodId]);

  // Prepara datos para gráfica por grupo
  const chartData = (dashboard?.classrooms || []).map(c => ({
    name:       c.classroom_name || c.name,
    asistencia: parseFloat(c.stats?.avg_attendance_rate || 0),
    ausentes:   parseInt(c.stats?.total_unjustified_absences || 0, 10),
  }));

  return (
    <div className="max-w-5xl">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📊 Dashboard de Asistencia</h1>
          <p className="text-gray-500 mt-1 text-sm">Vista general de sus grupos en el período</p>
        </div>
        <select
          value={periodId}
          onChange={e => setPeriodId(e.target.value)}
          className="text-sm rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-400 text-sm p-12 justify-center">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          Cargando…
        </div>
      )}

      {!loading && dashboard && (
        <>
          {/* ─── Tarjetas de resumen por grupo ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {dashboard.classrooms.map(c => (
              <div key={c.classroom_id} className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{c.classroom_name || c.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{c.grade_level_name}</span>
                    <button
                      onClick={() => handleExportClassroom(c.classroom_id)}
                      disabled={exportingId === c.classroom_id}
                      className="btn-action-primary"
                      title="Exportar asistencia a Excel"
                    >
                      <FileDown size={12} />
                      {exportingId === c.classroom_id ? '…' : 'Excel'}
                    </button>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Estudiantes</span>
                    <span className="font-medium">{c.stats?.total_students || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">% Asistencia</span>
                    <span className={`font-semibold ${
                      (c.stats?.avg_attendance_rate || 0) >= 80 ? 'text-green-600' :
                      (c.stats?.avg_attendance_rate || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {c.stats?.avg_attendance_rate || 0}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ausencias injust.</span>
                    <span className={`font-semibold ${(c.stats?.total_unjustified_absences || 0) > 5 ? 'text-red-600' : 'text-gray-700'}`}>
                      {c.stats?.total_unjustified_absences || 0}
                    </span>
                  </div>
                </div>
                {/* Barra de asistencia */}
                <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (c.stats?.avg_attendance_rate || 0) >= 80 ? 'bg-green-500' :
                      (c.stats?.avg_attendance_rate || 0) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${c.stats?.avg_attendance_rate || 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* ─── Gráfica de barras ─── */}
          {chartData.length > 0 && (
            <div className="card p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">% Asistencia por grupo</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="asistencia" name="% Asistencia" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ausentes"   name="Ausencias injust." fill="#dc2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* ─── Alertas de inasistencias ─── */}
      {!loading && alerts.length > 0 && (
        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 mb-3">
            🚨 Estudiantes con 3+ inasistencias injustificadas
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Estudiante</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Grupo</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">Ausencias</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alerts.map(a => (
                  <tr key={a.student_id} className="hover:bg-red-50">
                    <td className="px-3 py-2 font-medium text-gray-900">{a.last_name}, {a.first_name}</td>
                    <td className="px-3 py-2 text-gray-500">{a.classroom_name}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="badge-injustificada">{a.unjustified_absences}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !dashboard && (
        <div className="card p-8 text-center text-gray-400">
          Seleccione un período para ver el dashboard.
        </div>
      )}
    </div>
  );
}
