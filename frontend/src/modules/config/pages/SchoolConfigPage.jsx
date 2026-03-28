import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Award, CalendarDays, Save, Plus, Trash2,
  Lock, LockOpen, CheckCircle2, AlertCircle, ChevronRight,
  Loader2, ToggleLeft, ToggleRight, Mail, Eye, EyeOff,
} from 'lucide-react';
import { configApi } from '../api/config.api';

// ─── Constantes ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'profile', label: 'Perfil del Colegio',        Icon: Building2    },
  { id: 'siee',    label: 'Escala de Calificación',     Icon: Award        },
  { id: 'year',    label: 'Año Académico',              Icon: CalendarDays },
  { id: 'email',   label: 'Correo Saliente',            Icon: Mail         },
];

const SIEE_LEVELS = [
  { key: 'superior', label: 'Superior', color: 'emerald', nameField: 'level_superior_name', minField: 'level_superior_min' },
  { key: 'alto',     label: 'Alto',     color: 'blue',    nameField: 'level_alto_name',     minField: 'level_alto_min'     },
  { key: 'basico',   label: 'Básico',   color: 'amber',   nameField: 'level_basico_name',   minField: 'level_basico_min'   },
  { key: 'bajo',     label: 'Bajo',     color: 'red',     nameField: 'level_bajo_name',     minField: 'level_bajo_min'     },
];

const LEVEL_COLORS = {
  emerald: { bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-800', border: 'border-emerald-200' },
  blue:    { bar: 'bg-blue-500',    badge: 'bg-blue-100 text-blue-800',       border: 'border-blue-200'    },
  amber:   { bar: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-800',     border: 'border-amber-200'   },
  red:     { bar: 'bg-red-400',     badge: 'bg-red-100 text-red-800',         border: 'border-red-200'     },
};

// ─── Componentes de utilidad ──────────────────────────────────────────────────

function Spinner({ size = 16 }) {
  return <Loader2 size={size} className="animate-spin text-indigo-500" />;
}

function SectionHeader({ title, description }) {
  return (
    <div className="mb-5">
      <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
    </div>
  );
}

function FieldGroup({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {hint && <span className="text-xs text-gray-400 font-normal ml-1.5">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function SaveBar({ saving, saved, error, onSave, children }) {
  return (
    <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
      <div className="text-sm">
        {saving && <span className="flex items-center gap-1.5 text-gray-400"><Spinner size={14} /> Guardando…</span>}
        {saved  && !saving && <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 size={14} /> Cambios guardados</span>}
        {error  && !saving && <span className="flex items-center gap-1.5 text-red-600"><AlertCircle size={14} /> {error}</span>}
        {children}
      </div>
      <button onClick={onSave} disabled={saving} className="btn-primary">
        {saving ? <Spinner size={14} /> : <Save size={14} />}
        {saving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </div>
  );
}

// ─── Tab 1: Perfil del Colegio ────────────────────────────────────────────────

function ProfileTab({ school, onSchoolUpdate }) {
  const [form, setForm]   = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (!school) return;
    setForm({
      name:          school.name          || '',
      nit:           school.nit           || '',
      dane_code:     school.dane_code     || '',
      city:          school.city          || '',
      department:    school.department    || '',
      phone:         school.phone         || '',
      address:       school.address       || '',
      logo_url:      school.logo_url      || '',
      primary_color: school.primary_color || '#666cff',
    });
  }, [school]);

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setSaved(false);
    setError('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await configApi.updateProfile(form);
      onSchoolUpdate(res.data.data);
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar.');
    } finally { setSaving(false); }
  };

  if (!form) return <div className="flex justify-center py-12"><Spinner size={24} /></div>;

  return (
    <div className="space-y-8">
      {/* Datos institucionales */}
      <div className="card p-6">
        <SectionHeader
          title="Datos Institucionales"
          description="Información oficial del establecimiento educativo."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <FieldGroup label="Nombre del Colegio">
              <input value={form.name} onChange={e => set('name', e.target.value)} className="input" placeholder="Institución Educativa…" />
            </FieldGroup>
          </div>
          <FieldGroup label="NIT" hint="Sin dígito de verificación">
            <input value={form.nit} onChange={e => set('nit', e.target.value)} className="input" placeholder="900123456" />
          </FieldGroup>
          <FieldGroup label="Código DANE" hint="11 dígitos">
            <input value={form.dane_code} onChange={e => set('dane_code', e.target.value)} className="input" placeholder="05001000001" />
          </FieldGroup>
          <FieldGroup label="Municipio">
            <input value={form.city} onChange={e => set('city', e.target.value)} className="input" placeholder="Medellín" />
          </FieldGroup>
          <FieldGroup label="Departamento">
            <input value={form.department} onChange={e => set('department', e.target.value)} className="input" placeholder="Antioquia" />
          </FieldGroup>
          <FieldGroup label="Teléfono">
            <input value={form.phone} onChange={e => set('phone', e.target.value)} className="input" placeholder="+57 4 123 4567" />
          </FieldGroup>
          <div className="sm:col-span-2">
            <FieldGroup label="Dirección">
              <input value={form.address} onChange={e => set('address', e.target.value)} className="input" placeholder="Calle 50 # 40-20, Barrio…" />
            </FieldGroup>
          </div>
        </div>
      </div>

      {/* Identidad visual */}
      <div className="card p-6">
        <SectionHeader
          title="Identidad Visual"
          description="Logo y color principal que aparecen en los boletines generados."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <FieldGroup label="URL del Logo" hint="imagen pública accesible por HTTPS">
              <input
                value={form.logo_url}
                onChange={e => set('logo_url', e.target.value)}
                className="input"
                placeholder="https://mi-colegio.edu.co/logo.png"
              />
            </FieldGroup>
            {form.logo_url && (
              <div className="mt-3 flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <img
                  src={form.logo_url}
                  alt="Logo preview"
                  className="h-12 w-auto object-contain rounded"
                  onError={e => { e.target.style.display = 'none'; }}
                />
                <p className="text-xs text-gray-400">Vista previa del logo</p>
              </div>
            )}
          </div>
          <FieldGroup label="Color Principal" hint="HEX, ej: #666cff">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.primary_color}
                onChange={e => set('primary_color', e.target.value)}
                className="h-9 w-12 rounded-lg border border-gray-200 cursor-pointer p-0.5"
              />
              <input
                value={form.primary_color}
                onChange={e => set('primary_color', e.target.value)}
                className="input flex-1 font-mono"
                placeholder="#666cff"
                maxLength={7}
              />
              <div
                className="w-9 h-9 rounded-lg border border-gray-200 flex-shrink-0"
                style={{ backgroundColor: form.primary_color }}
              />
            </div>
          </FieldGroup>
        </div>
      </div>

      <SaveBar saving={saving} saved={saved} error={error} onSave={handleSave} />
    </div>
  );
}

// ─── Tab 2: Escala de Calificación (SIEE) ────────────────────────────────────

function SieeTab({ siee, onSieeUpdate }) {
  const [form,   setForm]   = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (!siee) return;
    setForm({
      level_superior_name: siee.level_superior_name || 'Superior',
      level_superior_min:  Number(siee.level_superior_min)  || 4.6,
      level_alto_name:     siee.level_alto_name     || 'Alto',
      level_alto_min:      Number(siee.level_alto_min)      || 3.8,
      level_basico_name:   siee.level_basico_name   || 'Básico',
      level_basico_min:    Number(siee.level_basico_min)    || 3.0,
      level_bajo_name:     siee.level_bajo_name     || 'Bajo',
      level_bajo_min:      Number(siee.level_bajo_min)      || 1.0,
      min_passing_grade:   Number(siee.min_passing_grade)   || 3.0,
    });
  }, [siee]);

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setSaved(false);
    setError('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await configApi.updateSiee(form);
      onSieeUpdate(res.data.data);
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar.');
    } finally { setSaving(false); }
  };

  if (!form) return <div className="flex justify-center py-12"><Spinner size={24} /></div>;

  // Escala visual: barra de 1.0 a 5.0
  const scale = [
    { name: form.level_bajo_name,     min: form.level_bajo_min,     max: form.level_basico_min, color: LEVEL_COLORS.red     },
    { name: form.level_basico_name,   min: form.level_basico_min,   max: form.level_alto_min,   color: LEVEL_COLORS.amber   },
    { name: form.level_alto_name,     min: form.level_alto_min,     max: form.level_superior_min, color: LEVEL_COLORS.blue  },
    { name: form.level_superior_name, min: form.level_superior_min, max: 5.0,                   color: LEVEL_COLORS.emerald },
  ];

  return (
    <div className="space-y-8">
      {/* Niveles */}
      <div className="card p-6">
        <SectionHeader
          title="Niveles de Desempeño"
          description="Según el Decreto 1290. Cada colegio puede personalizar los nombres y rangos."
        />
        <div className="space-y-4">
          {SIEE_LEVELS.map(({ key, label, color, nameField, minField }) => {
            const c = LEVEL_COLORS[color];
            return (
              <div
                key={key}
                className={`flex flex-wrap sm:flex-nowrap items-center gap-4 p-4 rounded-xl border-2 ${c.border} bg-white`}
              >
                {/* Indicador de color */}
                <div className={`w-2 self-stretch rounded-full flex-shrink-0 ${c.bar}`} />

                {/* Nombre del nivel */}
                <div className="flex-1 min-w-40">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nombre del nivel</label>
                  <input
                    value={form[nameField]}
                    onChange={e => set(nameField, e.target.value)}
                    className="input text-sm font-semibold"
                  />
                </div>

                {/* Nota mínima */}
                <div className="w-36 flex-shrink-0">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nota mínima</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1.0" max="5.0" step="0.1"
                      value={form[minField]}
                      onChange={e => set(minField, parseFloat(e.target.value) || 0)}
                      className="input text-sm pr-10 font-mono"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">/ 5.0</span>
                  </div>
                </div>

                {/* Badge de preview */}
                <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 ${c.badge}`}>
                  {form[nameField] || label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Nota mínima aprobatoria + escala visual */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="card p-6">
          <SectionHeader
            title="Nota Mínima Aprobatoria"
            description="Nota por debajo de la cual un estudiante se considera en riesgo."
          />
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                type="number" min="1.0" max="5.0" step="0.1"
                value={form.min_passing_grade}
                onChange={e => { set('min_passing_grade', parseFloat(e.target.value) || 0); setSaved(false); }}
                className="input font-mono text-lg font-bold text-center"
              />
            </div>
            <div className="text-center">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl ${
                form.min_passing_grade >= 3.0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                {Number(form.min_passing_grade).toFixed(1)}
              </div>
              <p className="text-xs text-gray-400 mt-1">de 5.0</p>
            </div>
          </div>
        </div>

        {/* Vista previa de escala */}
        <div className="card p-6">
          <SectionHeader title="Vista Previa de Escala" />
          <div className="space-y-2">
            {scale.map((s, i) => {
              const width = Math.max(((s.max - s.min) / 4) * 100, 8);
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-20 text-right font-mono flex-shrink-0">
                    {Number(s.min).toFixed(1)} – {Number(s.max).toFixed(1)}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.color.bar} flex items-center justify-end pr-2`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${s.color.badge}`}>
                    {s.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <SaveBar saving={saving} saved={saved} error={error} onSave={handleSave} />
    </div>
  );
}

// ─── Tab 3: Año Académico ────────────────────────────────────────────────────

function PeriodRow({ period, onUpdate, onDelete, onClose }) {
  const [form, setForm]     = useState({
    name:          period.name,
    start_date:    period.start_date ? period.start_date.slice(0, 10) : '',
    end_date:      period.end_date   ? period.end_date.slice(0, 10)   : '',
    weight_percent: period.weight_percent,
  });
  const [saving, setSaving] = useState(false);
  const [dirty,  setDirty]  = useState(false);

  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); setDirty(true); };

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(period.id, {
      name:          form.name,
      startDate:     form.start_date || null,
      endDate:       form.end_date   || null,
      weightPercent: Number(form.weight_percent),
    });
    setSaving(false);
    setDirty(false);
  };

  return (
    <tr className={`group transition-colors ${period.is_closed ? 'bg-gray-50/60' : 'hover:bg-indigo-50/20'}`}>
      {/* Número */}
      <td className="px-4 py-3 w-10">
        <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 font-bold text-xs flex items-center justify-center">
          {period.period_number}
        </span>
      </td>
      {/* Nombre */}
      <td className="px-2 py-3">
        <input
          value={form.name}
          onChange={e => set('name', e.target.value)}
          disabled={period.is_closed}
          className="input text-sm py-1.5 disabled:bg-transparent disabled:border-transparent disabled:text-gray-600 disabled:cursor-default"
        />
      </td>
      {/* Fechas */}
      <td className="px-2 py-3 hidden md:table-cell">
        <div className="flex gap-1.5 items-center">
          <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
            disabled={period.is_closed}
            className="input text-xs py-1.5 disabled:bg-transparent disabled:border-transparent disabled:text-gray-500 disabled:cursor-default w-36" />
          <span className="text-gray-300 text-xs">—</span>
          <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)}
            disabled={period.is_closed}
            className="input text-xs py-1.5 disabled:bg-transparent disabled:border-transparent disabled:text-gray-500 disabled:cursor-default w-36" />
        </div>
      </td>
      {/* Peso % */}
      <td className="px-2 py-3 w-28">
        <div className="relative">
          <input
            type="number" min="0" max="100" step="1"
            value={form.weight_percent}
            onChange={e => set('weight_percent', e.target.value)}
            disabled={period.is_closed}
            className="input text-sm py-1.5 pr-7 font-mono disabled:bg-transparent disabled:border-transparent disabled:text-gray-600 disabled:cursor-default"
          />
          {!period.is_closed && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>}
        </div>
      </td>
      {/* Estado + acciones */}
      <td className="px-2 py-3 w-44">
        <div className="flex items-center gap-1.5 justify-end">
          {/* Cerrar / Abrir */}
          <button
            onClick={() => onClose(period.id)}
            title={period.is_closed ? 'Abrir periodo' : 'Cerrar periodo'}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${
              period.is_closed
                ? 'border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                : 'border-amber-200 text-amber-600 bg-amber-50 hover:bg-amber-100'
            }`}
          >
            {period.is_closed ? <LockOpen size={11} /> : <Lock size={11} />}
            {period.is_closed ? 'Abrir' : 'Cerrar'}
          </button>
          {/* Guardar (si hay cambios) */}
          {dirty && !period.is_closed && (
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors">
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
              Guardar
            </button>
          )}
          {/* Eliminar */}
          {!period.is_closed && (
            <button onClick={() => onDelete(period.id)}
              className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded"
              title="Eliminar periodo">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function AddPeriodForm({ yearId, existingCount, onCreated }) {
  const [open,   setOpen]   = useState(false);
  const [form,   setForm]   = useState({ name: '', start_date: '', end_date: '', weight_percent: '' });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || form.weight_percent === '') { setError('Nombre y peso son requeridos.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await configApi.createPeriod({
        academicYearId: yearId,
        periodNumber:   existingCount + 1,
        name:           form.name,
        startDate:      form.start_date || null,
        endDate:        form.end_date   || null,
        weightPercent:  Number(form.weight_percent),
      });
      onCreated(res.data.data);
      setForm({ name: '', start_date: '', end_date: '', weight_percent: '' });
      setOpen(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear.');
    } finally { setSaving(false); }
  };

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors mt-3 ml-4"
    >
      <Plus size={15} />
      Agregar periodo
    </button>
  );

  return (
    <form onSubmit={handleSubmit} className="mt-3 mx-4 p-4 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/40">
      <p className="text-xs font-semibold text-indigo-700 mb-3">Periodo {existingCount + 1}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="col-span-2 md:col-span-1">
          <label className="block text-xs text-gray-500 mb-1">Nombre</label>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            className="input text-sm py-1.5" placeholder="Período 1" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Inicio</label>
          <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
            className="input text-xs py-1.5" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Fin</label>
          <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)}
            className="input text-xs py-1.5" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Peso %</label>
          <input type="number" min="0" max="100" step="1" value={form.weight_percent}
            onChange={e => set('weight_percent', e.target.value)}
            className="input text-sm py-1.5 font-mono" placeholder="25" />
        </div>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      <div className="flex gap-2 mt-3">
        <button type="submit" disabled={saving} className="btn-primary py-1.5 text-xs">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          {saving ? 'Creando…' : 'Crear periodo'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary py-1.5 text-xs">Cancelar</button>
      </div>
    </form>
  );
}

function WeightIndicator({ periods }) {
  const total = periods.reduce((sum, p) => sum + Number(p.weight_percent || 0), 0);
  const ok    = Math.abs(total - 100) < 0.01;
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-t ${
      ok ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-amber-700 bg-amber-50 border-amber-100'
    }`}>
      {ok
        ? <><CheckCircle2 size={15} /> Los pesos suman 100% — correcto</>
        : <><AlertCircle size={15} /> Los pesos suman <strong className="mx-1">{total}%</strong> — deben sumar exactamente 100%</>
      }
    </div>
  );
}

function CreateYearForm({ onCreate, onCancel }) {
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState({
    name:      String(currentYear + 1),
    startDate: `${currentYear + 1}-01-15`,
    endDate:   `${currentYear + 1}-11-30`,
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.startDate || !form.endDate) { setError('Todos los campos son requeridos.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await configApi.createAcademicYear(form);
      onCreate(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 bg-indigo-50/40 border-2 border-dashed border-indigo-200 rounded-xl">
      <p className="text-sm font-semibold text-indigo-700 mb-4">Nuevo año académico</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FieldGroup label="Nombre (ej: 2026)">
          <input value={form.name} onChange={e => set('name', e.target.value)} className="input" placeholder="2026" />
        </FieldGroup>
        <FieldGroup label="Fecha de inicio">
          <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className="input" />
        </FieldGroup>
        <FieldGroup label="Fecha de fin">
          <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} className="input" />
        </FieldGroup>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      <div className="flex gap-2 mt-4">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {saving ? 'Creando…' : 'Crear año'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
      </div>
    </form>
  );
}

function AcademicYearTab() {
  const [years,          setYears]          = useState([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [periods,        setPeriods]        = useState([]);
  const [loadingYears,   setLoadingYears]   = useState(true);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [showNewYear,    setShowNewYear]    = useState(false);
  const [toast,          setToast]          = useState(null);

  const showMsg = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Cargar años
  useEffect(() => {
    configApi.getAcademicYears()
      .then(res => {
        const data = res.data.data || [];
        setYears(data);
        const active = data.find(y => y.is_active);
        setSelectedYearId(active?.id || data[0]?.id || '');
      })
      .finally(() => setLoadingYears(false));
  }, []);

  // Cargar periodos cuando cambia el año seleccionado
  useEffect(() => {
    if (!selectedYearId) return;
    setLoadingPeriods(true);
    configApi.getPeriods(selectedYearId)
      .then(res => setPeriods(res.data.data || []))
      .catch(() => showMsg('Error al cargar periodos.', 'error'))
      .finally(() => setLoadingPeriods(false));
  }, [selectedYearId]);

  const selectedYear = years.find(y => y.id === selectedYearId);

  const handleActivateYear = async () => {
    if (!confirm(`¿Activar el año "${selectedYear?.name}"? El año activo actual quedará inactivo.`)) return;
    try {
      const res = await configApi.activateAcademicYear(selectedYearId);
      setYears(prev => prev.map(y => ({ ...y, is_active: y.id === selectedYearId })));
      showMsg(`Año ${res.data.data.name} activado.`);
    } catch (err) {
      showMsg(err.response?.data?.error || 'Error al activar.', 'error');
    }
  };

  const handleYearCreated = (year) => {
    setYears(prev => [...prev, year]);
    setSelectedYearId(year.id);
    setShowNewYear(false);
    setPeriods([]);
    showMsg(`Año ${year.name} creado.`);
  };

  const handlePeriodUpdate = async (id, data) => {
    try {
      const res = await configApi.updatePeriod(id, data);
      setPeriods(prev => prev.map(p => p.id === id ? res.data.data : p));
      showMsg('Periodo actualizado.');
    } catch (err) {
      showMsg(err.response?.data?.error || 'Error al actualizar.', 'error');
      throw err;
    }
  };

  const handlePeriodDelete = async (id) => {
    if (!confirm('¿Eliminar este periodo?')) return;
    try {
      await configApi.deletePeriod(id);
      setPeriods(prev => prev.filter(p => p.id !== id));
      showMsg('Periodo eliminado.');
    } catch (err) {
      showMsg(err.response?.data?.error || 'Error al eliminar.', 'error');
    }
  };

  const handlePeriodClose = async (id) => {
    try {
      const res = await configApi.closePeriod(id);
      setPeriods(prev => prev.map(p => p.id === id ? res.data.data : p));
      const isClosed = res.data.data.is_closed;
      showMsg(`Periodo ${isClosed ? 'cerrado' : 'abierto'}.`);
    } catch (err) {
      showMsg(err.response?.data?.error || 'Error.', 'error');
    }
  };

  const handlePeriodCreated = (period) => {
    setPeriods(prev => [...prev, period].sort((a, b) => a.period_number - b.period_number));
    showMsg('Periodo creado.');
  };

  if (loadingYears) return <div className="flex justify-center py-12"><Spinner size={24} /></div>;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`p-3 rounded-lg text-sm border flex items-center gap-2 ${
          toast.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Selector de año */}
      <div className="card p-6">
        <div className="flex flex-wrap items-end gap-4 justify-between">
          <div className="flex-1 min-w-52">
            <label className="block text-sm font-medium text-gray-700 mb-1">Año Académico</label>
            <select
              value={selectedYearId}
              onChange={e => setSelectedYearId(e.target.value)}
              className="input"
            >
              {years.length === 0 && <option value="">Sin años creados</option>}
              {years.map(y => (
                <option key={y.id} value={y.id}>
                  {y.name}{y.is_active ? ' — Activo' : ''}
                </option>
              ))}
            </select>
          </div>
          {!showNewYear && (
            <button onClick={() => setShowNewYear(true)} className="btn-secondary flex items-center gap-2">
              <Plus size={15} /> Nuevo año
            </button>
          )}
        </div>

        {/* Form nuevo año */}
        {showNewYear && (
          <div className="mt-5">
            <CreateYearForm onCreate={handleYearCreated} onCancel={() => setShowNewYear(false)} />
          </div>
        )}

        {/* Detalle del año seleccionado */}
        {selectedYear && !showNewYear && (
          <div className="mt-5 flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-gray-800 text-base">{selectedYear.name}</span>
                {selectedYear.is_active
                  ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700"><CheckCircle2 size={11} /> Activo</span>
                  : <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Inactivo</span>
                }
              </div>
              {selectedYear.start_date && (
                <p className="text-xs text-gray-500">
                  {new Date(selectedYear.start_date).toLocaleDateString('es-CO', { day:'numeric', month:'long', year:'numeric' })}
                  {' — '}
                  {new Date(selectedYear.end_date).toLocaleDateString('es-CO', { day:'numeric', month:'long', year:'numeric' })}
                </p>
              )}
            </div>
            {!selectedYear.is_active && (
              <button onClick={handleActivateYear} className="btn-primary py-2 text-xs gap-1.5">
                <ToggleRight size={14} /> Activar este año
              </button>
            )}
          </div>
        )}
      </div>

      {/* Periodos */}
      {selectedYearId && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Periodos Académicos</h3>
            <p className="text-sm text-gray-500 mt-0.5">Los pesos deben sumar 100% para calcular promedios anuales.</p>
          </div>

          {loadingPeriods ? (
            <div className="flex justify-center py-10"><Spinner size={20} /></div>
          ) : periods.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <CalendarDays size={32} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm font-medium text-gray-500">Sin periodos configurados</p>
              <p className="text-xs mt-1">Agrega los periodos del año académico.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
                    <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                    <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Fechas</th>
                    <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Peso</th>
                    <th className="px-2 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-44">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {periods.map(p => (
                    <PeriodRow
                      key={p.id}
                      period={p}
                      onUpdate={handlePeriodUpdate}
                      onDelete={handlePeriodDelete}
                      onClose={handlePeriodClose}
                    />
                  ))}
                </tbody>
              </table>
              <WeightIndicator periods={periods} />
            </div>
          )}

          <AddPeriodForm
            yearId={selectedYearId}
            existingCount={periods.length}
            onCreated={handlePeriodCreated}
          />
          <div className="h-4" />
        </div>
      )}
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

// ─── Tab 4: Correo Saliente (SMTP) ───────────────────────────────────────────

function EmailTab() {
  const EMPTY = {
    smtp_host: '', smtp_port: 587, smtp_secure: false,
    smtp_user: '', smtp_pass: '',
    smtp_from_name: '', smtp_from_email: '',
    is_active: false,
  };

  const [form,        setForm]        = useState(EMPTY);
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [error,       setError]       = useState('');

  useEffect(() => {
    configApi.getSmtp()
      .then(r => {
        const d = r.data?.data || {};
        setForm(f => ({ ...f, ...d, smtp_pass: '' })); // nunca pre-rellenar contraseña
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setSaved(false);
    setError('');
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const payload = { ...form };
      if (!payload.smtp_pass) delete payload.smtp_pass; // vacío = no cambiar
      await configApi.updateSmtp(payload);
      setSaved(true);
      setForm(f => ({ ...f, smtp_pass: '' })); // limpiar campo tras guardar
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  const fieldCls = 'w-full text-sm rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500';

  if (loading) {
    return (
      <div className="card p-10 flex items-center justify-center">
        <Spinner size={24} />
      </div>
    );
  }

  return (
    <div className="card p-6 space-y-6">
      {/* Estado del servicio */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
        <div>
          <p className="font-medium text-gray-800 text-sm">Usar SMTP propio del colegio</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Si está desactivado, el sistema usa el correo global de la plataforma.
          </p>
        </div>
        <button
          onClick={() => set('is_active', !form.is_active)}
          className="flex-shrink-0"
          aria-label="Activar SMTP propio"
        >
          {form.is_active
            ? <ToggleRight size={36} className="text-indigo-500" />
            : <ToggleLeft  size={36} className="text-gray-400"  />}
        </button>
      </div>

      {/* Servidor */}
      <SectionHeader
        title="Servidor SMTP"
        description="Datos de conexión al servidor de correo saliente."
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <FieldGroup label="Host / Servidor">
            <input
              type="text"
              value={form.smtp_host}
              onChange={e => set('smtp_host', e.target.value)}
              placeholder="smtp.gmail.com"
              className={fieldCls}
              disabled={!form.is_active}
            />
          </FieldGroup>
        </div>
        <FieldGroup label="Puerto">
          <input
            type="number"
            value={form.smtp_port}
            onChange={e => set('smtp_port', parseInt(e.target.value, 10))}
            placeholder="587"
            className={fieldCls}
            disabled={!form.is_active}
          />
        </FieldGroup>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => set('smtp_secure', !form.smtp_secure)}
          disabled={!form.is_active}
          className="flex-shrink-0"
          aria-label="TLS/SSL"
        >
          {form.smtp_secure
            ? <ToggleRight size={28} className="text-indigo-500" />
            : <ToggleLeft  size={28} className="text-gray-400"  />}
        </button>
        <div>
          <p className="text-sm font-medium text-gray-700">Usar TLS/SSL (puerto 465)</p>
          <p className="text-xs text-gray-400">Desactivado = STARTTLS (puerto 587 — recomendado)</p>
        </div>
      </div>

      {/* Credenciales */}
      <SectionHeader
        title="Credenciales"
        description="Usuario y contraseña de autenticación SMTP."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldGroup label="Usuario / Email SMTP">
          <input
            type="email"
            value={form.smtp_user}
            onChange={e => set('smtp_user', e.target.value)}
            placeholder="notificaciones@colegio.edu.co"
            className={fieldCls}
            disabled={!form.is_active}
          />
        </FieldGroup>
        <FieldGroup label="Contraseña" hint="Dejar vacío para mantener la actual">
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={form.smtp_pass}
              onChange={e => set('smtp_pass', e.target.value)}
              placeholder="••••••••••"
              className={`${fieldCls} pr-10`}
              disabled={!form.is_active}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPass(s => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </FieldGroup>
      </div>

      {/* Remitente */}
      <SectionHeader
        title="Remitente"
        description="Nombre y dirección que verán los destinatarios."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldGroup label="Nombre del remitente">
          <input
            type="text"
            value={form.smtp_from_name}
            onChange={e => set('smtp_from_name', e.target.value)}
            placeholder="Colegio San Martín"
            className={fieldCls}
            disabled={!form.is_active}
          />
        </FieldGroup>
        <FieldGroup label="Email del remitente">
          <input
            type="email"
            value={form.smtp_from_email}
            onChange={e => set('smtp_from_email', e.target.value)}
            placeholder="noreply@colegio.edu.co"
            className={fieldCls}
            disabled={!form.is_active}
          />
        </FieldGroup>
      </div>

      <SaveBar saving={saving} saved={saved} error={error} onSave={handleSave} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SchoolConfigPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [school,    setSchool]    = useState(null);
  const [siee,      setSiee]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  useEffect(() => {
    configApi.getSchool()
      .then(res => {
        setSchool(res.data.data);
        setSiee(res.data.data.siee || null);
      })
      .catch(() => setError('No se pudo cargar la configuración del colegio.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={28} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle size={32} className="mx-auto mb-3 text-red-400" />
        <p className="text-gray-700 font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración del Colegio</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {school?.name} · Slug: <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{school?.slug}</code>
        </p>
      </div>

      {/* Tab bar */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2.5 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === id
                  ? 'border-indigo-500 text-indigo-600 bg-indigo-50/40'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={15} />
              {label}
              {activeTab === id && <ChevronRight size={12} className="text-indigo-400" />}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido de cada tab */}
      {activeTab === 'profile' && (
        <ProfileTab school={school} onSchoolUpdate={setSchool} />
      )}
      {activeTab === 'siee' && (
        <SieeTab siee={siee} onSieeUpdate={setSiee} />
      )}
      {activeTab === 'year' && (
        <AcademicYearTab />
      )}
      {activeTab === 'email' && (
        <EmailTab />
      )}
    </div>
  );
}
