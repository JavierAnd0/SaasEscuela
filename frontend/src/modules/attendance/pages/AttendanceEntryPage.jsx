import { useState, useEffect } from 'react';
import { ClipboardList } from 'lucide-react';
import AttendanceGrid from '../components/AttendanceGrid';
import { attendanceApi } from '../api/attendance.api';
import apiClient from '../../../shared/api/client';
export default function AttendanceEntryPage() {
  // Filtros
  const [classrooms,   setClassrooms]   = useState([]);
  const [periods,      setPeriods]       = useState([]);
  const [classroomId,  setClassroomId]   = useState('');
  const [periodId,     setPeriodId]      = useState('');
  const [recordDate,   setRecordDate]    = useState(() => new Date().toISOString().slice(0, 10));

  // Datos
  const [students,     setStudents]      = useState([]);
  const [existingRecs, setExistingRecs]  = useState({});
  const [loadingData,  setLoadingData]   = useState(false);
  const [saving,       setSaving]        = useState(false);
  const [toast,        setToast]         = useState(null);

  // Carga grupos y períodos al montar
  useEffect(() => {
    apiClient.get('/classrooms').then(r => setClassrooms(r.data?.data || [])).catch(() => {});
    apiClient.get('/periods').then(r => setPeriods(r.data?.data   || [])).catch(() => {});
  }, []);

  // Carga estudiantes y asistencia existente al cambiar filtros
  useEffect(() => {
    if (!classroomId || !periodId || !recordDate) return;

    setLoadingData(true);
    Promise.all([
      apiClient.get('/students', { params: { classroomId } }),
      attendanceApi.getByClassroomAndDate(classroomId, recordDate),
    ])
      .then(([studRes, attRes]) => {
        setStudents(studRes.data?.data || []);
        // Convierte array de registros a mapa { studentId: status }
        const map = {};
        (attRes.data?.data || []).forEach(r => { map[r.student_id] = r.status; });
        setExistingRecs(map);
      })
      .catch(() => showToast('Error al cargar datos.', 'error'))
      .finally(() => setLoadingData(false));
  }, [classroomId, periodId, recordDate]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSave = async (records) => {
    setSaving(true);
    try {
      await attendanceApi.bulkRecord({ classroomId, periodId, recordDate, records });
      showToast(`Asistencia guardada para ${records.length} estudiantes.`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al guardar.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl">
      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardList size={24} className="text-primary-600" />
          Registro de Asistencia
        </h1>
        <p className="text-gray-500 mt-1 text-sm">Registre la asistencia diaria de su grupo</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          toast.type === 'error'
            ? 'bg-red-50 border border-red-200 text-red-700'
            : 'bg-green-50 border border-green-200 text-green-700'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Filtros */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
            <input
              type="date"
              value={recordDate}
              onChange={e => setRecordDate(e.target.value)}
              className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2
                         focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Grupo</label>
            <select
              value={classroomId}
              onChange={e => setClassroomId(e.target.value)}
              className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2
                         focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Seleccione un grupo</option>
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
              className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2
                         focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Seleccione un período</option>
              {periods.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid de asistencia */}
      {loadingData && (
        <div className="flex items-center gap-2 text-gray-500 text-sm p-8 justify-center">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          Cargando estudiantes…
        </div>
      )}

      {!loadingData && students.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">
              {classrooms.find(c => c.id === classroomId)?.name} —{' '}
              {new Date(recordDate + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h2>
            <span className="text-xs text-gray-400">{students.length} estudiantes</span>
          </div>
          <AttendanceGrid
            students={students}
            initialRecords={existingRecs}
            onSave={handleSave}
            saving={saving}
          />
        </div>
      )}

      {!loadingData && classroomId && periodId && students.length === 0 && (
        <div className="card p-8 text-center text-gray-400">
          No hay estudiantes matriculados en este grupo.
        </div>
      )}

      {!classroomId && (
        <div className="card p-8 text-center text-gray-400">
          Seleccione un grupo y período para comenzar.
        </div>
      )}
    </div>
  );
}
