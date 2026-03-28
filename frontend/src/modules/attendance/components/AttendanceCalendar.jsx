import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { attendanceApi } from '../api/attendance.api';
import apiClient from '../../../shared/api/client';

// ── helpers ────────────────────────────────────────────────────────────────────

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];
const DAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

function rateColor(rate) {
  if (rate === null || rate === undefined) return null;
  if (rate >= 90) return { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' };
  if (rate >= 75) return { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-400'  };
  return            { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500'   };
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function buildCalendarGrid(year, month) {
  // month: 1-12
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const lastDate = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= lastDate; d++) {
    cells.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return cells;
}

// ── ExportButton ───────────────────────────────────────────────────────────────

function ExportButton({ classroomId, subjectId, periodId, year, month, rangeLabel }) {
  const [open,     setOpen]     = useState(false);
  const [loading,  setLoading]  = useState(false);

  const download = async (mode) => {
    setLoading(true);
    setOpen(false);
    try {
      const params = { classroomId };
      if (subjectId)  params.subjectId = subjectId;
      if (mode === 'period' && periodId) {
        params.periodId = periodId;
      } else {
        params.year  = year;
        params.month = month;
      }
      const resp = await apiClient.get('/export/attendance/matrix', {
        params,
        responseType: 'blob',
      });
      const url  = URL.createObjectURL(resp.data);
      const link = document.createElement('a');
      link.href  = url;
      link.download = `asistencia_${rangeLabel.replace(/\s+/g, '_')}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Error al generar el archivo. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!classroomId) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                   bg-indigo-50 text-indigo-700 hover:bg-indigo-100 active:scale-95
                   transition-all duration-100 disabled:opacity-50"
      >
        {loading
          ? <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          : <Download size={13} />
        }
        Exportar
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200
                        rounded-xl shadow-lg overflow-hidden min-w-[180px]">
          {periodId && (
            <button
              onClick={() => download('period')}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors border-b border-gray-100"
            >
              <p className="font-medium text-gray-800">Por período</p>
              <p className="text-xs text-gray-400">Todas las fechas del período</p>
            </button>
          )}
          <button
            onClick={() => download('month')}
            className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
          >
            <p className="font-medium text-gray-800">Por mes — {MONTHS[month - 1]}</p>
            <p className="text-xs text-gray-400">Solo este mes</p>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

/**
 * AttendanceCalendar
 *
 * Props:
 *  classroomId   — UUID del grupo (puede ser '')
 *  subjectId     — UUID de la materia (puede ser '')
 *  periodId      — UUID del período vigente
 *  selectedDate  — 'YYYY-MM-DD' — fecha actualmente seleccionada
 *  onSelectDate  — (date: string) => void
 */
export default function AttendanceCalendar({
  classroomId,
  subjectId,
  periodId,
  selectedDate,
  onSelectDate,
}) {
  const today = isoToday();
  const [year,  setYear]  = useState(() => parseInt(today.slice(0, 4)));
  const [month, setMonth] = useState(() => parseInt(today.slice(5, 7)));
  const [data,  setData]  = useState({});   // { 'YYYY-MM-DD': { present, absent_justified, absent_unjustified, late, total, rate } }
  const [loading, setLoading] = useState(false);

  const fetchCalendar = useCallback(async () => {
    if (!classroomId) { setData({}); return; }
    setLoading(true);
    try {
      const resp = await attendanceApi.getCalendar(classroomId, subjectId || undefined, year, month);
      const map = {};
      for (const row of resp.data?.data ?? []) {
        map[row.date] = row;
      }
      setData(map);
    } catch {
      setData({});
    } finally {
      setLoading(false);
    }
  }, [classroomId, subjectId, year, month]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  const cells = buildCalendarGrid(year, month);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const isFuture = (date) => date > today;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          aria-label="Mes anterior"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-900 text-sm">
            {MONTHS[month - 1]} {year}
          </h3>
          {loading && (
            <svg className="animate-spin h-3.5 w-3.5 text-gray-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ExportButton
            classroomId={classroomId}
            subjectId={subjectId}
            periodId={periodId}
            year={year}
            month={month}
            rangeLabel={`${MONTHS[month - 1]}_${year}`}
          />
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
            aria-label="Mes siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Leyenda ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100 flex-wrap">
        {[
          { label: '≥ 90%', bg: 'bg-emerald-500' },
          { label: '75–89%', bg: 'bg-amber-400' },
          { label: '< 75%',  bg: 'bg-red-500' },
        ].map(({ label, bg }) => (
          <span key={label} className="flex items-center gap-1 text-xs text-gray-500">
            <span className={`w-2.5 h-2.5 rounded-full ${bg}`} />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
          Toca un día para registrar
        </span>
      </div>

      {/* ── Días de la semana ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DAYS.map(d => (
          <div key={d} className="py-1.5 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* ── Grilla de días ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-7">
        {cells.map((date, idx) => {
          if (!date) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }

          const row   = data[date];
          const color = rateColor(row?.rate);
          const isSelected = date === selectedDate;
          const isToday    = date === today;
          const future     = isFuture(date);
          const dayNum     = parseInt(date.slice(8));

          return (
            <button
              key={date}
              onClick={() => !future && onSelectDate(date)}
              disabled={future}
              className={`
                relative flex flex-col items-center justify-center aspect-square
                text-xs transition-all duration-100 border border-transparent
                ${future ? 'opacity-30 cursor-not-allowed' : 'hover:border-indigo-300 active:scale-95 cursor-pointer'}
                ${isSelected ? 'ring-2 ring-indigo-500 ring-inset z-10 rounded-lg' : ''}
                ${color ? `${color.bg} ${color.text}` : 'text-gray-700'}
              `}
              aria-label={date}
            >
              {/* Número del día */}
              <span className={`font-semibold text-[11px] leading-none
                               ${isToday ? 'underline decoration-2 decoration-indigo-500' : ''}`}>
                {dayNum}
              </span>

              {/* Indicador de asistencia */}
              {row && (
                <span className={`mt-0.5 w-1.5 h-1.5 rounded-full ${color.dot}`} />
              )}

              {/* Porcentaje en hover — solo en desktop */}
              {row && (
                <span className="hidden sm:block text-[9px] leading-none opacity-80 mt-0.5 tabular-nums">
                  {row.rate}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Resumen del día seleccionado ────────────────────────────────────── */}
      {selectedDate && data[selectedDate] && (() => {
        const r = data[selectedDate];
        const color = rateColor(r.rate);
        return (
          <div className={`px-4 py-3 border-t border-gray-100 ${color?.bg ?? 'bg-gray-50'}`}>
            <p className={`text-xs font-semibold mb-1.5 ${color?.text ?? 'text-gray-700'}`}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-CO', {
                weekday: 'long', day: 'numeric', month: 'long',
              })} — {r.rate}% asistencia
            </p>
            <div className="flex gap-3 flex-wrap">
              {[
                { label: 'Presentes', val: r.present, color: 'text-emerald-700' },
                { label: 'Aus. Injust.', val: r.absent_unjustified, color: 'text-red-600' },
                { label: 'Aus. Just.', val: r.absent_justified, color: 'text-blue-600' },
                { label: 'Tardanzas', val: r.late, color: 'text-amber-600' },
              ].map(({ label, val, color: c }) => (
                <span key={label} className={`text-xs ${c}`}>
                  <span className="font-bold tabular-nums">{val}</span> {label}
                </span>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
