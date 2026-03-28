import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Check, Search, UserCheck, UserX, WifiOff, AlertCircle, Lock } from 'lucide-react';
import { attendanceApi } from '../api/attendance.api';

// ── Status config ──────────────────────────────────────────────────────────────

const CYCLE = ['present', 'absent_unjustified', 'absent_justified', 'late'];

const STATUS = {
  present: {
    short: 'P', label: 'Presente',
    chip: 'bg-emerald-500 text-white shadow-emerald-200',
    row: '',
    avatar: 'bg-emerald-100 text-emerald-700',
  },
  absent_unjustified: {
    short: 'AI', label: 'Aus. Injust.',
    chip: 'bg-red-500 text-white shadow-red-200',
    row: 'bg-red-50/70',
    avatar: 'bg-red-100 text-red-700',
  },
  absent_justified: {
    short: 'AJ', label: 'Aus. Just.',
    chip: 'bg-blue-500 text-white shadow-blue-200',
    row: 'bg-blue-50/70',
    avatar: 'bg-blue-100 text-blue-700',
  },
  late: {
    short: 'T', label: 'Tarde',
    chip: 'bg-amber-400 text-white shadow-amber-200',
    row: 'bg-amber-50/70',
    avatar: 'bg-amber-100 text-amber-700',
  },
};

// ── Save indicator ─────────────────────────────────────────────────────────────

function SaveIndicator({ state }) {
  if (state === 'saving') return (
    <span className="flex items-center gap-1.5 text-xs text-gray-400">
      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
      Guardando…
    </span>
  );
  if (state === 'saved') return (
    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
      <Check size={11} strokeWidth={3} /> Guardado
    </span>
  );
  if (state === 'error') return (
    <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
      <WifiOff size={11} /> Error al guardar
    </span>
  );
  return null;
}

// ── Student row ────────────────────────────────────────────────────────────────

function StudentRow({ student, status, onToggle, isPast }) {
  const cfg = STATUS[status] ?? STATUS.present;
  const initials = `${student.first_name?.[0] ?? ''}${student.last_name?.[0] ?? ''}`.toUpperCase();

  // On past dates: only absent_unjustified ↔ absent_justified is allowed
  const canToggle = !isPast || status === 'absent_unjustified' || status === 'absent_justified';
  const next = isPast
    ? (status === 'absent_justified' ? 'absent_unjustified' : 'absent_justified')
    : CYCLE[(CYCLE.indexOf(status) + 1) % CYCLE.length];

  // Swipe detection (mobile) — disabled on past dates
  const touch = useRef(null);

  const onTouchStart = (e) => {
    if (isPast) return;
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const onTouchEnd = (e) => {
    if (isPast || !touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = Math.abs(e.changedTouches[0].clientY - touch.current.y);
    touch.current = null;
    if (dy > 30 || Math.abs(dx) < 50) return;
    e.preventDefault();
    onToggle(student.id, dx > 0 ? 'present' : 'absent_unjustified');
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0
                  transition-colors duration-150 select-none active:brightness-95 ${cfg.row}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Avatar */}
      <div className={`w-9 h-9 rounded-full flex items-center justify-center
                       text-xs font-bold flex-shrink-0 transition-colors duration-150 ${cfg.avatar}`}>
        {initials}
      </div>

      {/* Name */}
      <p className="flex-1 text-sm font-medium text-gray-900 leading-tight truncate">
        {student.last_name}, {student.first_name}
      </p>

      {/* Status chip */}
      {canToggle ? (
        <button
          onClick={() => onToggle(student.id, next)}
          className={`flex-shrink-0 w-14 py-1.5 rounded-full text-xs font-bold
                      transition-all duration-150 active:scale-90 shadow-sm ${cfg.chip}`}
          aria-label={`Estado actual: ${cfg.label}. Toca para cambiar.`}
          title={isPast ? 'Solo puede justificar/quitar justificación' : cfg.label}
        >
          {cfg.short}
        </button>
      ) : (
        <span className={`flex-shrink-0 w-14 py-1.5 rounded-full text-xs font-bold
                          text-center opacity-60 ${cfg.chip}`}>
          {cfg.short}
        </span>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

/**
 * AttendanceGrid — registro rápido de asistencia con auto-guardado.
 *
 * Props:
 *  students[]       — lista de estudiantes del grupo
 *  initialRecords   — mapa { studentId: status } de registros existentes
 *  existingRecIds   — mapa { studentId: recordId } para edición individual (fechas pasadas)
 *  classroomId      — UUID del grupo
 *  periodId         — UUID del período vigente
 *  subjectId        — UUID de la materia
 *  recordDate       — 'YYYY-MM-DD'
 *  isPast           — true si recordDate < hoy (solo permite justificar)
 *  loading          — spinner mientras carga
 */
export default function AttendanceGrid({
  students,
  initialRecords = {},
  existingRecIds = {},
  classroomId,
  periodId,
  subjectId,
  recordDate,
  isPast = false,
  loading,
}) {
  const [statuses, setStatuses] = useState({});
  const statusesRef     = useRef({});
  const initialRef      = useRef({});   // espejo de initialRecords para comparar en doSave
  const existingIdsRef  = useRef({});
  const [saveState, setSaveState] = useState('idle');
  const [search, setSearch] = useState('');
  const isDirty = useRef(false);
  const saveTimer = useRef(null);

  // Inicializar cuando cambian estudiantes / registros existentes
  useEffect(() => {
    const map = {};
    for (const s of students) map[s.id] = 'present';
    for (const [id, st] of Object.entries(initialRecords)) map[id] = st;
    setStatuses(map);
    statusesRef.current  = map;
    initialRef.current   = { ...map };
    existingIdsRef.current = existingRecIds;
    isDirty.current = false;
    setSaveState(Object.keys(initialRecords).length > 0 ? 'saved' : 'idle');
    setSearch('');
  }, [students, initialRecords, existingRecIds]);

  // Limpiar timer al desmontar
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  // ── Auto-save ──────────────────────────────────────────────────────────────

  const doSave = useCallback(async () => {
    if (!isDirty.current) return;
    setSaveState('saving');
    try {
      if (isPast) {
        // Fechas pasadas: solo enviar cambios individuales vía PUT
        const changes = Object.entries(statusesRef.current).filter(([studentId, status]) => {
          const orig = initialRef.current[studentId];
          const rid  = existingIdsRef.current[studentId];
          // Solo si cambió, tiene registro existente y el nuevo estado es valid para fecha pasada
          return status !== orig && rid &&
            (status === 'absent_justified' || status === 'absent_unjustified');
        });
        if (changes.length === 0) { isDirty.current = false; setSaveState('saved'); return; }
        await Promise.all(
          changes.map(([studentId, status]) =>
            attendanceApi.update(existingIdsRef.current[studentId], { status })
          )
        );
      } else {
        // Fecha de hoy: guardar todo el grupo (upsert)
        const records = Object.entries(statusesRef.current).map(([studentId, status]) => ({
          studentId,
          status,
        }));
        await attendanceApi.bulkRecord({
          classroomId,
          periodId,
          subjectId: subjectId || undefined,   // nunca enviar string vacío
          recordDate,
          records,
        });
      }
      setSaveState('saved');
      isDirty.current = false;
    } catch (err) {
      console.error('[AttendanceGrid] Error al guardar:', err?.response?.data ?? err.message);
      setSaveState('error');
    }
  }, [classroomId, periodId, subjectId, recordDate, isPast]);

  const scheduleAutoSave = useCallback(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(doSave, 2000);
  }, [doSave]);

  // ── Acciones ───────────────────────────────────────────────────────────────

  const toggle = useCallback((studentId, newStatus) => {
    setStatuses((prev) => {
      const next = { ...prev, [studentId]: newStatus };
      statusesRef.current = next;
      return next;
    });
    isDirty.current = true;
    setSaveState('idle');
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const markAll = useCallback((status) => {
    setStatuses((prev) => {
      const next = {};
      for (const id of Object.keys(prev)) next[id] = status;
      statusesRef.current = next;
      return next;
    });
    isDirty.current = true;
    setSaveState('idle');
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  // ── Contadores ─────────────────────────────────────────────────────────────

  const counts = useMemo(() => {
    const c = { present: 0, absent_unjustified: 0, absent_justified: 0, late: 0 };
    for (const v of Object.values(statuses)) if (c[v] !== undefined) c[v]++;
    return c;
  }, [statuses]);

  // ── Filtrado ───────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter((s) =>
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q)
    );
  }, [students, search]);

  // ── Estados de carga / vacío ───────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
      Cargando estudiantes…
    </div>
  );

  if (students.length === 0) return null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col" style={{ minHeight: 0 }}>

      {/* Aviso fecha pasada */}
      {isPast && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-100 text-amber-700 text-xs">
          <Lock size={12} className="flex-shrink-0" />
          <span>Fecha pasada — solo puede cambiar <strong>Aus. Injust.</strong> a <strong>Aus. Just.</strong> (y viceversa)</span>
        </div>
      )}

      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white rounded-t-xl border-b border-gray-100 shadow-sm">

        {/* Fila 1: contadores + indicador de guardado */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { key: 'present',            short: 'P',  full: 'Presentes',   bg: 'bg-emerald-100 text-emerald-700' },
              { key: 'absent_unjustified', short: 'AI', full: 'Aus. Injust.', bg: 'bg-red-100 text-red-700' },
              { key: 'absent_justified',   short: 'AJ', full: 'Aus. Just.',   bg: 'bg-blue-100 text-blue-700' },
              { key: 'late',               short: 'T',  full: 'Tardanza',     bg: 'bg-amber-100 text-amber-700' },
            ].map(({ key, short, full, bg }) => (
              <span key={key}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${bg}`}>
                <span>{short}</span>
                <span className="font-normal opacity-75 hidden sm:inline">{full}</span>
                <span className="tabular-nums">{counts[key]}</span>
              </span>
            ))}
          </div>
          <SaveIndicator state={saveState} />
        </div>

        {/* Fila 2: acciones rápidas + búsqueda (ocultas en fechas pasadas) */}
        <div className="flex items-center gap-2 px-4 pb-3">
          {!isPast && (
            <>
              <button
                onClick={() => markAll('present')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                           bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-95
                           transition-all duration-100 whitespace-nowrap"
              >
                <UserCheck size={13} /> Todos P
              </button>
              <button
                onClick={() => markAll('absent_unjustified')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                           bg-red-50 text-red-700 hover:bg-red-100 active:scale-95
                           transition-all duration-100 whitespace-nowrap"
              >
                <UserX size={13} /> Todos AI
              </button>
            </>
          )}
          <div className="relative flex-1 min-w-0">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Buscar (${students.length})`}
              className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-gray-200
                         bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300
                         focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Tip swipe — solo en mobile y fecha de hoy */}
        {!isPast && (
          <div className="px-4 pb-2 sm:hidden">
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <AlertCircle size={10} />
              Desliza → para presente, ← para ausente
            </p>
          </div>
        )}
      </div>

      {/* ── Lista de estudiantes ───────────────────────────────────────────── */}
      <div className="overflow-y-auto flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
        {filtered.length === 0 ? (
          <p className="text-center py-10 text-sm text-gray-400">
            Sin resultados para &ldquo;{search}&rdquo;
          </p>
        ) : (
          filtered.map((student) => (
            <StudentRow
              key={student.id}
              student={student}
              status={statuses[student.id] ?? 'present'}
              onToggle={toggle}
              isPast={isPast}
            />
          ))
        )}
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 rounded-b-xl">
        <p className="text-xs text-gray-400 text-center">
          {students.length} estudiantes ·{' '}
          {isPast ? 'Solo justificación de ausencias' : 'Auto-guardado activado'}
        </p>
      </div>
    </div>
  );
}
