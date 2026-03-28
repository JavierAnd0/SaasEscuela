import { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays, PenLine, Lock, Unlock, Plus, Trash2,
  ClipboardList, BookOpen, AlertTriangle, CheckCircle2, Clock,
} from 'lucide-react';
import { academicApi } from '../api/academic.api';
import Modal from '../../../shared/components/Modal';
import { useToast, Toast } from '../../../shared/hooks/useToast';

// ─── Utilidades de fechas ─────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);

function fmtShort(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-CO', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function daysBetween(a, b) {
  return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86_400_000);
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// ─── Cómputo de estado del período ───────────────────────────────────────────

function getPeriodStatus(p) {
  if (p.is_closed) {
    return { label: 'Cerrado', color: 'red', Icon: Lock };
  }
  if (!p.start_date && !p.end_date) {
    return { label: 'Sin configurar', color: 'gray', Icon: AlertTriangle };
  }
  if (p.start_date && TODAY < p.start_date) {
    return { label: 'Próximo', color: 'blue', Icon: Clock };
  }
  if (p.end_date && TODAY > p.end_date) {
    return { label: 'Finalizado', color: 'slate', Icon: CheckCircle2 };
  }
  // Dentro del período
  if (p.grades_open_from || p.grades_open_until) {
    if (p.grades_open_from && TODAY < p.grades_open_from) {
      return { label: 'En curso · Notas pendientes', color: 'amber', Icon: ClipboardList };
    }
    if (p.grades_open_until && TODAY > p.grades_open_until) {
      return { label: 'En curso · Notas cerradas', color: 'orange', Icon: ClipboardList };
    }
    return { label: 'Notas abiertas', color: 'green', Icon: BookOpen };
  }
  return { label: 'En curso', color: 'amber', Icon: ClipboardList };
}

const STATUS_STYLES = {
  red:    'bg-red-100 text-red-700',
  gray:   'bg-gray-100 text-gray-500',
  blue:   'bg-blue-100 text-blue-700',
  slate:  'bg-slate-100 text-slate-600',
  amber:  'bg-amber-100 text-amber-700',
  orange: 'bg-orange-100 text-orange-700',
  green:  'bg-emerald-100 text-emerald-700',
};

const BORDER_COLORS = {
  red:    '#ef4444',
  gray:   '#9ca3af',
  blue:   '#3b82f6',
  slate:  '#64748b',
  amber:  '#f59e0b',
  orange: '#f97316',
  green:  '#10b981',
};

// ─── Barra de progreso / línea de tiempo ─────────────────────────────────────

function TimelineBar({ period }) {
  if (!period.start_date || !period.end_date) return null;

  const total = daysBetween(period.start_date, period.end_date);
  if (total <= 0) return null;

  const elapsedDays = daysBetween(period.start_date, TODAY);
  const elapsedPct  = clamp((elapsedDays / total) * 100, 0, 100);

  let gradeFromPct = null, gradeWidthPct = null;
  if (period.grades_open_from && period.grades_open_until) {
    const gFrom  = clamp(daysBetween(period.start_date, period.grades_open_from) / total * 100, 0, 100);
    const gUntil = clamp(daysBetween(period.start_date, period.grades_open_until) / total * 100, 0, 100);
    gradeFromPct  = gFrom;
    gradeWidthPct = gUntil - gFrom;
  }

  const isFuture = TODAY < period.start_date;
  const isPast   = TODAY > period.end_date;

  return (
    <div className="mt-4">
      <div className="relative h-2 rounded-full overflow-hidden bg-gray-100">
        {/* Porción transcurrida */}
        {!isFuture && (
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all"
            style={{ width: `${elapsedPct}%`, backgroundColor: 'rgba(102,108,255,0.25)' }}
          />
        )}
        {/* Ventana de notas */}
        {gradeFromPct !== null && (
          <div
            className="absolute inset-y-0 rounded-full"
            style={{
              left:  `${gradeFromPct}%`,
              width: `${gradeWidthPct}%`,
              backgroundColor: 'rgba(16,185,129,0.55)',
            }}
          />
        )}
        {/* Marcador de hoy */}
        {!isFuture && !isPast && (
          <div
            className="absolute inset-y-0 w-0.5 rounded-full"
            style={{ left: `${clamp(elapsedPct, 1, 99)}%`, backgroundColor: 'var(--color-primary)' }}
          />
        )}
      </div>
      <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
        <span>{fmtShort(period.start_date)}</span>
        {!isFuture && !isPast && (
          <span className="font-medium" style={{ color: 'var(--color-primary)' }}>Hoy</span>
        )}
        <span>{fmtShort(period.end_date)}</span>
      </div>
    </div>
  );
}

// ─── Tarjeta de período ───────────────────────────────────────────────────────

function PeriodCard({ period, onEdit, onToggleClose, onDelete }) {
  const status = getPeriodStatus(period);
  const { label, color, Icon } = status;
  const [closing, setClosing] = useState(false);

  const handleToggle = async () => {
    setClosing(true);
    try { await onToggleClose(period); } finally { setClosing(false); }
  };

  return (
    <div
      className="card flex flex-col gap-0 overflow-hidden"
      style={{ borderTop: `3px solid ${BORDER_COLORS[color]}` }}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[color]}`}>
            <Icon size={11} />
            {label}
          </span>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(102,108,255,0.1)', color: 'var(--color-primary)' }}
          >
            {period.weight_percent}%
          </span>
        </div>

        <h3 className="mt-3 font-bold text-base leading-tight" style={{ color: 'var(--color-base)' }}>
          {period.name}
        </h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
          Período #{period.period_number}
        </p>
      </div>

      {/* Separador */}
      <div className="border-t mx-4" style={{ borderColor: 'var(--color-border)' }} />

      {/* Fechas */}
      <div className="p-4 space-y-3 flex-1">
        {/* Rango del período */}
        <div className="flex items-start gap-2">
          <CalendarDays size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-primary)' }} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
              Asistencia
            </p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-base)' }}>
              {period.start_date
                ? `${fmtShort(period.start_date)} — ${fmtShort(period.end_date)}`
                : <span style={{ color: 'var(--color-muted)' }}>Sin fechas configuradas</span>
              }
            </p>
          </div>
        </div>

        {/* Ventana de notas */}
        <div className="flex items-start gap-2">
          <BookOpen size={14} className="flex-shrink-0 mt-0.5 text-emerald-500" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
              Ventana de Notas
            </p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-base)' }}>
              {period.grades_open_from
                ? `${fmtShort(period.grades_open_from)} — ${fmtShort(period.grades_open_until)}`
                : <span style={{ color: 'var(--color-muted)' }}>Sin restricción de fechas</span>
              }
            </p>
          </div>
        </div>

        {/* Mini timeline */}
        <TimelineBar period={period} />
      </div>

      {/* Footer de acciones */}
      <div
        className="flex items-center justify-between px-4 py-3 border-t"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-body-bg)' }}
      >
        <button
          onClick={() => onEdit(period)}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors hover:bg-gray-100"
          style={{ color: 'var(--color-primary)' }}
        >
          <PenLine size={13} /> Configurar
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={handleToggle}
            disabled={closing}
            title={period.is_closed ? 'Reabrir período' : 'Cerrar período'}
            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors font-medium
              ${period.is_closed
                ? 'text-emerald-600 hover:bg-emerald-50'
                : 'text-orange-600 hover:bg-orange-50'
              }`}
          >
            {period.is_closed ? <Unlock size={13} /> : <Lock size={13} />}
            {period.is_closed ? 'Reabrir' : 'Cerrar'}
          </button>
          <button
            onClick={() => onDelete(period)}
            title="Eliminar período"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tarjeta para agregar nuevo período ──────────────────────────────────────

function AddPeriodCard({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 p-8
                 transition-colors hover:border-primary hover:bg-primary/5 min-h-[260px]"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: 'rgba(102,108,255,0.1)' }}
      >
        <Plus size={20} style={{ color: 'var(--color-primary)' }} />
      </div>
      <span className="text-sm font-medium" style={{ color: 'var(--color-muted)' }}>
        Agregar período
      </span>
    </button>
  );
}

// ─── Formulario de período (create / edit) ────────────────────────────────────

const EMPTY_FORM = {
  name: '', periodNumber: '', weightPercent: 25,
  startDate: '', endDate: '',
  gradesOpenFrom: '', gradesOpenUntil: '',
};

function PeriodForm({ initial, onSubmit, saving }) {
  const [form, setForm]   = useState(initial || EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const validate = () => {
    const e = {};
    if (!form.name.trim())               e.name          = 'Requerido';
    if (!form.periodNumber)              e.periodNumber   = 'Requerido';
    if (form.weightPercent === '' || form.weightPercent === null) e.weightPercent = 'Requerido';
    if (form.startDate && form.endDate && form.startDate > form.endDate)
      e.endDate = 'Debe ser posterior al inicio del período';
    if (form.gradesOpenFrom && form.gradesOpenUntil && form.gradesOpenFrom > form.gradesOpenUntil)
      e.gradesOpenUntil = 'Debe ser posterior a la apertura';
    if (form.startDate && form.gradesOpenFrom && form.gradesOpenFrom < form.startDate)
      e.gradesOpenFrom = 'No puede ser antes del inicio del período';
    if (form.endDate && form.gradesOpenUntil && form.gradesOpenUntil > form.endDate)
      e.gradesOpenUntil = (e.gradesOpenUntil ? e.gradesOpenUntil + ' y no' : 'No puede ser') + ' después del fin del período';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    onSubmit({
      name:            form.name.trim(),
      periodNumber:    Number(form.periodNumber),
      weightPercent:   Number(form.weightPercent),
      startDate:       form.startDate       || null,
      endDate:         form.endDate         || null,
      gradesOpenFrom:  form.gradesOpenFrom  || null,
      gradesOpenUntil: form.gradesOpenUntil || null,
    });
  };

  const Field = ({ label, error, hint, children }) => (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-base)' }}>
        {label}
      </label>
      {children}
      {hint  && !error && <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{hint}</p>}
      {error && <p className="text-xs mt-0.5 text-red-500">{error}</p>}
    </div>
  );

  return (
    <form id="period-form" onSubmit={handleSubmit} className="space-y-5">

      {/* Identificación */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-muted)' }}>
          Identificación
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label={<>Nombre <span className="text-red-500">*</span></>} error={errors.name}>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className={`input w-full ${errors.name ? 'border-red-400' : ''}`}
              placeholder="Ej: I Período"
            />
          </Field>
          <Field label={<>Número <span className="text-red-500">*</span></>} error={errors.periodNumber}>
            <input
              type="number" min="1" max="8"
              value={form.periodNumber}
              onChange={e => set('periodNumber', e.target.value)}
              className={`input w-full ${errors.periodNumber ? 'border-red-400' : ''}`}
              placeholder="1"
            />
          </Field>
          <Field
            label={<>Peso <span className="text-red-500">*</span></>}
            error={errors.weightPercent}
            hint="Los pesos deben sumar 100%"
          >
            <div className="relative">
              <input
                type="number" min="0" max="100" step="0.01"
                value={form.weightPercent}
                onChange={e => set('weightPercent', e.target.value)}
                className={`input w-full pr-7 ${errors.weightPercent ? 'border-red-400' : ''}`}
                placeholder="25"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
                    style={{ color: 'var(--color-muted)' }}>%</span>
            </div>
          </Field>
        </div>
      </div>

      {/* Fechas del período — controlan asistencia */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>
          Fechas del período
        </p>
        <p className="text-xs mb-3" style={{ color: 'var(--color-muted)' }}>
          Delimitan cuándo se puede registrar asistencia. La asistencia se bloqueará fuera de este rango.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Inicio" error={errors.startDate}>
            <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className="input w-full" />
          </Field>
          <Field label="Fin" error={errors.endDate}>
            <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)}
              min={form.startDate || undefined} className="input w-full" />
          </Field>
        </div>
      </div>

      {/* Ventana de notas */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>
          Ventana de ingreso de notas
        </p>
        <p className="text-xs mb-3" style={{ color: 'var(--color-muted)' }}>
          Rango en que los docentes pueden subir calificaciones. Si no se configura, solo aplica el cierre manual.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Apertura de notas" error={errors.gradesOpenFrom}>
            <input type="date" value={form.gradesOpenFrom} onChange={e => set('gradesOpenFrom', e.target.value)}
              min={form.startDate || undefined} max={form.endDate || undefined} className="input w-full" />
          </Field>
          <Field label="Cierre de notas" error={errors.gradesOpenUntil}>
            <input type="date" value={form.gradesOpenUntil} onChange={e => set('gradesOpenUntil', e.target.value)}
              min={form.gradesOpenFrom || form.startDate || undefined} max={form.endDate || undefined}
              className="input w-full" />
          </Field>
        </div>
      </div>
    </form>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function PeriodsPage() {
  const [years,         setYears]         = useState([]);
  const [selectedYear,  setSelectedYear]  = useState(null);
  const [periods,       setPeriods]       = useState([]);
  const [loadingYears,  setLoadingYears]  = useState(true);
  const [loadingPeriods,setLoadingPeriods]= useState(false);
  const [modal,         setModal]         = useState(null);  // null | 'create' | period obj
  const [saving,        setSaving]        = useState(false);

  const [toast, showToast, dismissToast] = useToast();

  // Carga años académicos al montar
  useEffect(() => {
    academicApi.getAcademicYears()
      .then(res => {
        const list = res.data.data || [];
        setYears(list);
        const active = list.find(y => y.is_active) || list[0] || null;
        setSelectedYear(active);
      })
      .catch(() => showToast('Error al cargar años académicos.', 'error'))
      .finally(() => setLoadingYears(false));
  }, []);

  // Carga períodos cuando cambia el año seleccionado
  const loadPeriods = useCallback(async (yearId) => {
    if (!yearId) return;
    setLoadingPeriods(true);
    try {
      const res = await academicApi.getPeriods(yearId);
      setPeriods(res.data.data || []);
    } catch {
      showToast('Error al cargar períodos.', 'error');
    } finally {
      setLoadingPeriods(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (selectedYear) loadPeriods(selectedYear.id);
  }, [selectedYear, loadPeriods]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSave = async (data) => {
    setSaving(true);
    try {
      const isEdit = modal && modal !== 'create';
      if (isEdit) {
        const res = await academicApi.updatePeriod(modal.id, data);
        setPeriods(prev => prev.map(p => p.id === modal.id ? res.data.data : p));
        showToast('Período actualizado.');
      } else {
        const res = await academicApi.createPeriod({ ...data, academicYearId: selectedYear.id });
        setPeriods(prev => [...prev, res.data.data].sort((a, b) => a.period_number - b.period_number));
        showToast('Período creado.');
      }
      setModal(null);
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al guardar el período.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleClose = async (period) => {
    try {
      const res = await academicApi.togglePeriodClose(period.id);
      const updated = res.data.data;
      setPeriods(prev => prev.map(p => p.id === period.id ? updated : p));
      showToast(updated.is_closed ? `"${period.name}" cerrado.` : `"${period.name}" reabierto.`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al cambiar estado del período.', 'error');
    }
  };

  const handleDelete = async (period) => {
    if (!confirm(`¿Eliminar "${period.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await academicApi.deletePeriod(period.id);
      setPeriods(prev => prev.filter(p => p.id !== period.id));
      showToast(`"${period.name}" eliminado.`);
    } catch (err) {
      showToast(err.response?.data?.error || 'No se puede eliminar: el período tiene datos asociados.', 'error');
    }
  };

  // Precarga del formulario al editar
  const buildEditInitial = (p) => ({
    name:            p.name,
    periodNumber:    String(p.period_number),
    weightPercent:   Number(p.weight_percent),
    startDate:       p.start_date  ? p.start_date.slice(0, 10)        : '',
    endDate:         p.end_date    ? p.end_date.slice(0, 10)           : '',
    gradesOpenFrom:  p.grades_open_from  ? p.grades_open_from.slice(0, 10)  : '',
    gradesOpenUntil: p.grades_open_until ? p.grades_open_until.slice(0, 10) : '',
  });

  const isEdit = modal && modal !== 'create';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl space-y-6">

      {/* Encabezado */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Calendario Académico</h1>
          <p className="page-subtitle">
            Define los períodos, fechas de asistencia y ventanas de ingreso de notas
          </p>
        </div>
        {/* Selector de año */}
        {!loadingYears && years.length > 0 && (
          <select
            value={selectedYear?.id || ''}
            onChange={e => setSelectedYear(years.find(y => y.id === e.target.value) || null)}
            className="input"
            style={{ minWidth: '150px' }}
          >
            {years.map(y => (
              <option key={y.id} value={y.id}>
                {y.name}{y.is_active ? ' (activo)' : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      <Toast toast={toast} onDismiss={dismissToast} />

      {/* Leyenda */}
      <div
        className="flex flex-wrap gap-4 text-xs p-3 rounded-xl border"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-body-bg)' }}
      >
        <span className="font-semibold" style={{ color: 'var(--color-muted)' }}>Leyenda:</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ backgroundColor: 'rgba(102,108,255,0.25)' }} />
          <span style={{ color: 'var(--color-muted)' }}>Tiempo transcurrido del período</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ backgroundColor: 'rgba(16,185,129,0.55)' }} />
          <span style={{ color: 'var(--color-muted)' }}>Ventana de ingreso de notas</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-0.5 h-3 rounded-sm" style={{ backgroundColor: 'var(--color-primary)' }} />
          <span style={{ color: 'var(--color-muted)' }}>Hoy</span>
        </span>
      </div>

      {/* Cuadrícula de períodos */}
      {loadingYears || loadingPeriods ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm" style={{ color: 'var(--color-muted)' }}>
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          Cargando…
        </div>
      ) : !selectedYear ? (
        <div className="card p-12 text-center">
          <p className="font-medium" style={{ color: 'var(--color-base)' }}>
            No hay años académicos configurados
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Crea un año académico en Estructura Académica primero.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {periods.map(p => (
            <PeriodCard
              key={p.id}
              period={p}
              onEdit={setModal}
              onToggleClose={handleToggleClose}
              onDelete={handleDelete}
            />
          ))}
          <AddPeriodCard onClick={() => setModal('create')} />
        </div>
      )}

      {/* Modal create / edit */}
      <Modal
        isOpen={modal === 'create' || !!isEdit}
        onClose={() => setModal(null)}
        title={isEdit ? `Editar — ${modal.name}` : 'Nuevo Período'}
        size="lg"
        footer={
          <>
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
            <button
              type="button"
              disabled={saving}
              className="btn-primary"
              onClick={() => {
                document.getElementById('period-form')
                  ?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
              }}
            >
              {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear período'}
            </button>
          </>
        }
      >
        {(modal === 'create' || !!isEdit) && (
          <PeriodForm
            initial={isEdit ? buildEditInitial(modal) : undefined}
            onSubmit={handleSave}
            saving={saving}
          />
        )}
      </Modal>
    </div>
  );
}
