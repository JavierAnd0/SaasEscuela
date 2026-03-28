import { useState, useEffect } from 'react';
import { ClipboardList, AlertTriangle, CalendarDays, ListChecks } from 'lucide-react';
import AttendanceGrid from '../components/AttendanceGrid';
import AttendanceCalendar from '../components/AttendanceCalendar';
import { attendanceApi } from '../api/attendance.api';
import apiClient from '../../../shared/api/client';

const TODAY = new Date().toISOString().slice(0, 10);

function formatDate(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function AttendanceEntryPage() {
  // Contexto global
  const [currentPeriod, setCurrentPeriod] = useState(null);
  const [loadingInit,   setLoadingInit]   = useState(true);

  // Selección del docente
  const [classrooms,  setClassrooms]  = useState([]);
  const [subjects,    setSubjects]    = useState([]);
  const [classroomId, setClassroomId] = useState('');
  const [subjectId,   setSubjectId]   = useState('');
  const [recordDate,  setRecordDate]  = useState(TODAY);

  // Vista: 'grid' | 'calendar'
  const [view, setView] = useState('grid');

  // Datos de la grilla
  const [students,      setStudents]     = useState([]);
  const [existingRecs,  setExistingRecs]  = useState({});   // { studentId: status }
  const [existingRecIds,setExistingRecIds]= useState({});   // { studentId: recordId }
  const [loadingData,   setLoadingData]  = useState(false);

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      apiClient.get('/classrooms'),
      apiClient.get('/periods', { params: { current: 'true' } }),
    ])
      .then(([clRes, perRes]) => {
        setClassrooms(clRes.data?.data || []);
        const periods = perRes.data?.data || [];
        setCurrentPeriod(periods[0] ?? null);
      })
      .catch(() => {})
      .finally(() => setLoadingInit(false));
  }, []);

  // ── Materias del docente en el grupo ──────────────────────────────────────
  useEffect(() => {
    if (!classroomId) { setSubjects([]); setSubjectId(''); return; }
    attendanceApi.getSubjectsByClassroom(classroomId)
      .then(r => {
        const subs = r.data?.data || [];
        setSubjects(subs);
        setSubjectId(subs.length === 1 ? subs[0].id : '');
      })
      .catch(() => { setSubjects([]); setSubjectId(''); });
  }, [classroomId]);

  // ── Estudiantes + registros existentes ────────────────────────────────────
  useEffect(() => {
    if (!classroomId || !subjectId || !currentPeriod) {
      setStudents([]); setExistingRecs({}); setExistingRecIds({});
      return;
    }
    setLoadingData(true);
    Promise.all([
      apiClient.get('/students', { params: { classroomId } }),
      attendanceApi.getByClassroomAndDate(classroomId, recordDate, subjectId),
    ])
      .then(([studRes, attRes]) => {
        setStudents(studRes.data?.data || []);
        const statusMap = {};
        const idMap     = {};
        (attRes.data?.data || []).forEach(r => {
          statusMap[r.student_id] = r.status;
          idMap[r.student_id]     = r.id;
        });
        setExistingRecs(statusMap);
        setExistingRecIds(idMap);
      })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, [classroomId, subjectId, currentPeriod, recordDate]);

  const isPast = recordDate < TODAY;

  // ── Seleccionar fecha desde el calendario ─────────────────────────────────
  const handleSelectDate = (date) => {
    setRecordDate(date);
    setView('grid');
  };

  // ── Estados de carga ──────────────────────────────────────────────────────
  if (loadingInit) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 gap-2 text-sm">
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        Cargando…
      </div>
    );
  }

  if (!currentPeriod) {
    return (
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList size={24} className="text-primary-600" />
            Registro de Asistencia
          </h1>
        </div>
        <div className="card p-8 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">No hay período vigente para hoy</p>
            <p className="text-sm text-gray-500 mt-1">
              El coordinador debe configurar las fechas del período académico actual
              en <strong>Calendario / Períodos</strong> para habilitar el registro de asistencia.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Render principal ───────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl">

      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardList size={24} className="text-primary-600" />
          Registro de Asistencia
        </h1>
        <p className="text-gray-500 mt-1 text-sm">Registre y consulte la asistencia de su grupo</p>
      </div>

      {/* Contexto fijo — período */}
      <div className="flex items-center gap-3 mb-4 px-1 flex-wrap">
        <div className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border"
             style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(102,108,255,0.06)' }}>
          <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>
            {currentPeriod.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <CalendarDays size={14} />
          {formatDate(recordDate)}
          {recordDate !== TODAY && (
            <button
              onClick={() => setRecordDate(TODAY)}
              className="ml-2 text-xs text-indigo-600 hover:underline"
            >
              Volver a hoy
            </button>
          )}
        </div>
      </div>

      {/* Selectores */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Grupo</label>
            <select
              value={classroomId}
              onChange={e => { setClassroomId(e.target.value); setSubjectId(''); }}
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Materia</label>
            <select
              value={subjectId}
              onChange={e => setSubjectId(e.target.value)}
              disabled={!classroomId || subjects.length === 0}
              className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2
                         focus:outline-none focus:ring-2 focus:ring-primary-500
                         disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">
                {!classroomId
                  ? 'Seleccione grupo primero'
                  : subjects.length === 0
                    ? 'Sin materias asignadas'
                    : 'Seleccione una materia'}
              </option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Pestañas de vista */}
      {classroomId && subjectId && (
        <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setView('grid')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
              ${view === 'grid'
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'}`}
          >
            <ListChecks size={14} />
            Registro
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
              ${view === 'calendar'
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'}`}
          >
            <CalendarDays size={14} />
            Calendario
          </button>
        </div>
      )}

      {/* ── Vista Calendario ────────────────────────────────────────────────── */}
      {view === 'calendar' && classroomId && subjectId && (
        <AttendanceCalendar
          classroomId={classroomId}
          subjectId={subjectId}
          periodId={currentPeriod?.id}
          selectedDate={recordDate}
          onSelectDate={handleSelectDate}
        />
      )}

      {/* ── Vista Registro ──────────────────────────────────────────────────── */}
      {view === 'grid' && (
        <>
          {/* Cargando estudiantes */}
          {loadingData && (
            <div className="flex items-center gap-2 text-gray-500 text-sm p-8 justify-center">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Cargando estudiantes…
            </div>
          )}

          {/* Grilla */}
          {!loadingData && students.length > 0 && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {classrooms.find(c => c.id === classroomId)?.name} —{' '}
                    {subjects.find(s => s.id === subjectId)?.name}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(recordDate)}</p>
                </div>
                <span className="text-xs text-gray-400">{students.length} estudiantes</span>
              </div>
              <AttendanceGrid
                students={students}
                initialRecords={existingRecs}
                existingRecIds={existingRecIds}
                classroomId={classroomId}
                periodId={currentPeriod.id}
                subjectId={subjectId}
                recordDate={recordDate}
                isPast={isPast}
              />
            </div>
          )}

          {!loadingData && classroomId && subjectId && students.length === 0 && (
            <div className="card p-8 text-center text-gray-400">
              No hay estudiantes matriculados en este grupo.
            </div>
          )}

          {(!classroomId || !subjectId) && !loadingData && (
            <div className="card p-8 text-center text-gray-400">
              {!classroomId ? 'Seleccione un grupo para comenzar.' : 'Seleccione una materia.'}
            </div>
          )}
        </>
      )}
    </div>
  );
}
