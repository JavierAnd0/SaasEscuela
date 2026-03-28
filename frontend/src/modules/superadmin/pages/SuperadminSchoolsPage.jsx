import { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap, Plus, Search, Users, BookOpen,
  ChevronDown, ChevronUp, CheckCircle2, AlertCircle,
  Loader2, Building2, ShieldCheck, Clock, Ban, Save,
} from 'lucide-react';
import { superadminApi } from '../api/superadmin.api';
import Modal from '../../../shared/components/Modal';
import { useToast, Toast } from '../../../shared/hooks/useToast';

// ─── Constantes ───────────────────────────────────────────────────────────────

const SUBSCRIPTION_STATUSES = [
  { value: 'trial',     label: 'Trial',     Icon: Clock,       colors: 'bg-blue-100   text-blue-700   border-blue-200'   },
  { value: 'active',    label: 'Activo',    Icon: CheckCircle2,colors: 'bg-emerald-100 text-emerald-700 border-emerald-200'},
  { value: 'suspended', label: 'Suspendido',Icon: AlertCircle, colors: 'bg-amber-100  text-amber-700  border-amber-200'  },
  { value: 'cancelled', label: 'Cancelado', Icon: Ban,         colors: 'bg-red-100    text-red-700    border-red-200'    },
];

const PLANS = ['free', 'basic', 'pro', 'enterprise'];

const STATUS_MAP = Object.fromEntries(SUBSCRIPTION_STATUSES.map(s => [s.value, s]));

const EMPTY_SCHOOL_FORM = {
  name: '', slug: '', nit: '', daneCode: '', city: '', department: '', phone: '', primaryColor: '#666cff',
};
const EMPTY_ADMIN_FORM = {
  firstName: '', lastName: '', email: '', password: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Spinner({ size = 16 }) {
  return <Loader2 size={size} className="animate-spin text-indigo-500" />;
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.trial;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.colors}`}>
      <s.Icon size={11} />
      {s.label}
    </span>
  );
}

function KpiCard({ label, value, sub, Icon, color }) {
  const colors = {
    indigo:  'bg-indigo-100  text-indigo-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber:   'bg-amber-100   text-amber-600',
    red:     'bg-red-100     text-red-600',
  };
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon size={21} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Modal: Crear colegio + admin ─────────────────────────────────────────────

function CreateSchoolModal({ isOpen, onClose, onCreated, showToast }) {
  const [schoolForm, setSchoolForm] = useState(EMPTY_SCHOOL_FORM);
  const [adminForm,  setAdminForm]  = useState(EMPTY_ADMIN_FORM);
  const [step,    setStep]    = useState(1); // 1: datos colegio, 2: cuenta admin
  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState({});

  const setS = (k, v) => { setSchoolForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };
  const setA = (k, v) => { setAdminForm(f => ({ ...f, [k]: v }));  setErrors(e => ({ ...e, [k]: '' })); };

  // Auto-generar slug a partir del nombre
  const handleNameChange = (val) => {
    setS('name', val);
    if (!schoolForm.slug || schoolForm.slug === toSlug(schoolForm.name)) {
      setS('slug', toSlug(val));
    }
  };

  const toSlug = (str) =>
    str.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60);

  const validateStep1 = () => {
    const e = {};
    if (!schoolForm.name.trim())  e.name = 'Requerido';
    if (!schoolForm.slug.trim())  e.slug = 'Requerido';
    if (!/^[a-z0-9-]+$/.test(schoolForm.slug)) e.slug = 'Solo letras minúsculas, números y guiones';
    return e;
  };

  const validateStep2 = () => {
    const e = {};
    if (!adminForm.firstName.trim()) e.firstName = 'Requerido';
    if (!adminForm.lastName.trim())  e.lastName  = 'Requerido';
    if (!adminForm.email.trim())     e.email     = 'Requerido';
    if (!adminForm.password || adminForm.password.length < 8) e.password = 'Mínimo 8 caracteres';
    return e;
  };

  const handleNext = () => {
    const e = validateStep1();
    if (Object.keys(e).length) { setErrors(e); return; }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const e2 = validateStep2();
    if (Object.keys(e2).length) { setErrors(e2); return; }
    setSaving(true);
    try {
      // 1. Crear el colegio
      const schoolRes = await superadminApi.createSchool({
        name:         schoolForm.name,
        slug:         schoolForm.slug,
        nit:          schoolForm.nit         || undefined,
        daneCode:     schoolForm.daneCode    || undefined,
        city:         schoolForm.city        || undefined,
        department:   schoolForm.department  || undefined,
        phone:        schoolForm.phone       || undefined,
        primaryColor: schoolForm.primaryColor,
      });
      const school = schoolRes.data.data;

      // 2. Crear el usuario administrador para ese colegio
      await superadminApi.createAdmin({
        firstName: adminForm.firstName,
        lastName:  adminForm.lastName,
        email:     adminForm.email,
        password:  adminForm.password,
        role:      'school_admin',
        schoolId:  school.id,
      });

      showToast(`Colegio "${school.name}" creado con su administrador.`);
      onCreated({ ...school, user_count: 1, student_count: 0 });
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al crear el colegio.';
      showToast(msg, 'error');
    } finally { setSaving(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo Colegio" size="lg" noPadding>
      {/* Step indicator */}
      <div className="px-7 pt-5 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
          Crea el tenant y la cuenta del rector/administrador.
        </p>
        <div className="flex items-center gap-3">
          {[{ n: 1, label: 'Datos del colegio' }, { n: 2, label: 'Cuenta administrador' }].map(({ n, label }) => (
            <div key={n} className={`flex items-center gap-2 text-sm font-medium transition-colors ${
              step === n ? 'text-indigo-600' : step > n ? 'text-emerald-600' : 'text-gray-400'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                step === n ? 'border-indigo-500 text-indigo-600 bg-indigo-50'
                : step > n ? 'border-emerald-500 text-white bg-emerald-500'
                : 'border-gray-200 text-gray-400'
              }`}>
                {step > n ? '✓' : n}
              </div>
              {label}
              {n < 2 && <span className="text-gray-200 ml-2">›</span>}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
          {/* Paso 1: Datos del colegio */}
          {step === 1 && (
            <div className="px-7 py-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Colegio <span className="text-red-500">*</span></label>
                  <input value={schoolForm.name} onChange={e => handleNameChange(e.target.value)}
                    className={`input ${errors.name ? 'border-red-400' : ''}`} placeholder="Institución Educativa San Marcos" />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slug <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-400 font-normal ml-1">(subdominio único)</span>
                  </label>
                  <div className="flex items-center gap-0">
                    <span className="px-3 py-2 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-xs text-gray-400 whitespace-nowrap">app/</span>
                    <input value={schoolForm.slug} onChange={e => setS('slug', e.target.value)}
                      className={`input rounded-l-none flex-1 font-mono ${errors.slug ? 'border-red-400' : ''}`}
                      placeholder="san-marcos" />
                  </div>
                  {errors.slug && <p className="text-xs text-red-500 mt-1">{errors.slug}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NIT</label>
                  <input value={schoolForm.nit} onChange={e => setS('nit', e.target.value)} className="input" placeholder="900123456" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código DANE</label>
                  <input value={schoolForm.daneCode} onChange={e => setS('daneCode', e.target.value)} className="input" placeholder="05001000001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Municipio</label>
                  <input value={schoolForm.city} onChange={e => setS('city', e.target.value)} className="input" placeholder="Medellín" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
                  <input value={schoolForm.department} onChange={e => setS('department', e.target.value)} className="input" placeholder="Antioquia" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input value={schoolForm.phone} onChange={e => setS('phone', e.target.value)} className="input" placeholder="+57 4 123 4567" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color Principal</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={schoolForm.primaryColor} onChange={e => setS('primaryColor', e.target.value)}
                      className="h-9 w-12 rounded-lg border border-gray-200 cursor-pointer p-0.5 flex-shrink-0" />
                    <input value={schoolForm.primaryColor} onChange={e => setS('primaryColor', e.target.value)}
                      className="input flex-1 font-mono" placeholder="#666cff" maxLength={7} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="button" onClick={handleNext} className="btn-primary">
                  Siguiente: Cuenta Admin <ChevronDown size={14} className="-rotate-90" />
                </button>
              </div>
            </div>
          )}

          {/* Paso 2: Cuenta administrador */}
          {step === 2 && (
            <div className="px-7 py-6 space-y-5">
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center gap-3">
                <ShieldCheck size={18} className="text-indigo-500 flex-shrink-0" />
                <p className="text-sm text-indigo-700">
                  Se creará una cuenta de <strong>Rector / Administrador</strong> para <em>{schoolForm.name}</em>.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombres <span className="text-red-500">*</span></label>
                  <input value={adminForm.firstName} onChange={e => setA('firstName', e.target.value)}
                    className={`input ${errors.firstName ? 'border-red-400' : ''}`} placeholder="Carlos" />
                  {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos <span className="text-red-500">*</span></label>
                  <input value={adminForm.lastName} onChange={e => setA('lastName', e.target.value)}
                    className={`input ${errors.lastName ? 'border-red-400' : ''}`} placeholder="García" />
                  {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico <span className="text-red-500">*</span></label>
                  <input type="email" value={adminForm.email} onChange={e => setA('email', e.target.value)}
                    className={`input ${errors.email ? 'border-red-400' : ''}`} placeholder="rector@colegio.edu.co" />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña Inicial <span className="text-red-500">*</span></label>
                  <input type="password" value={adminForm.password} onChange={e => setA('password', e.target.value)}
                    className={`input ${errors.password ? 'border-red-400' : ''}`} placeholder="Mínimo 8 caracteres" />
                  {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                  <p className="text-xs text-gray-400 mt-1">El administrador puede cambiarla en su primer inicio de sesión.</p>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary">
                  ← Volver
                </button>
                <button type="submit" disabled={saving} className="btn-primary gap-2">
                  {saving ? <Spinner size={15} /> : <CheckCircle2 size={15} />}
                  {saving ? 'Creando colegio…' : 'Crear Colegio'}
                </button>
              </div>
            </div>
          )}
      </form>
    </Modal>
  );
}

// ─── Fila expandible de la tabla ─────────────────────────────────────────────

function SchoolRow({ school, onSubscriptionUpdate, showToast }) {
  const [expanded,  setExpanded]  = useState(false);
  const [subStatus, setSubStatus] = useState(school.subscription_status || 'trial');
  const [subPlan,   setSubPlan]   = useState(school.subscription_plan   || 'free');
  const [saving,    setSaving]    = useState(false);
  const [dirty,     setDirty]     = useState(false);

  const handleSaveSubscription = async () => {
    setSaving(true);
    try {
      const res = await superadminApi.updateSubscription(school.id, {
        subscriptionStatus: subStatus,
        subscriptionPlan:   subPlan,
      });
      onSubscriptionUpdate(school.id, res.data.data);
      setDirty(false);
      showToast('Suscripción actualizada.');
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al actualizar.', 'error');
    } finally { setSaving(false); }
  };

  const trialEnds = school.trial_ends_at
    ? new Date(school.trial_ends_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const createdAt = school.created_at
    ? new Date(school.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  return (
    <>
      <tr
        className={`group cursor-pointer transition-colors ${expanded ? 'bg-indigo-50/40' : 'hover:bg-gray-50/70'}`}
        onClick={() => setExpanded(v => !v)}
      >
        {/* Nombre + slug */}
        <td className="px-5 py-4">
          <div className="flex items-center gap-3">
            {/* Avatar color */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm"
              style={{ backgroundColor: school.primary_color || '#666cff' }}
            >
              {school.name[0]}
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">{school.name}</p>
              <p className="text-xs text-gray-400 font-mono">{school.slug}</p>
            </div>
          </div>
        </td>
        {/* Ubicación */}
        <td className="px-4 py-4 hidden lg:table-cell">
          <p className="text-sm text-gray-600">{school.city || '—'}</p>
          <p className="text-xs text-gray-400">{school.department || ''}</p>
        </td>
        {/* Suscripción */}
        <td className="px-4 py-4">
          <StatusBadge status={school.subscription_status} />
          {trialEnds && (
            <p className="text-xs text-gray-400 mt-1">Hasta {trialEnds}</p>
          )}
        </td>
        {/* Stats */}
        <td className="px-4 py-4 hidden md:table-cell">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Users size={12} className="text-gray-400" />{school.user_count ?? 0}</span>
            <span className="flex items-center gap-1"><BookOpen size={12} className="text-gray-400" />{school.student_count ?? 0}</span>
          </div>
        </td>
        {/* Fecha */}
        <td className="px-4 py-4 hidden xl:table-cell text-xs text-gray-400">{createdAt}</td>
        {/* Chevron */}
        <td className="px-4 py-4 text-right">
          {expanded
            ? <ChevronUp size={15} className="text-indigo-400 inline" />
            : <ChevronDown size={15} className="text-gray-300 group-hover:text-gray-500 inline transition-colors" />
          }
        </td>
      </tr>

      {/* Fila de detalle expandida */}
      {expanded && (
        <tr className="bg-indigo-50/30">
          <td colSpan={6} className="px-5 pb-5 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-indigo-100/60">

              {/* Columna izquierda: info */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Información</h4>
                <dl className="space-y-1.5">
                  {[
                    ['NIT',          school.nit       || '—'],
                    ['Código DANE',  school.dane_code || '—'],
                    ['Teléfono',     school.phone     || '—'],
                    ['Dirección',    school.address   || '—'],
                    ['Usuarios activos', school.user_count    ?? 0],
                    ['Estudiantes activos', school.student_count ?? 0],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between text-sm">
                      <dt className="text-gray-500">{label}</dt>
                      <dd className="text-gray-800 font-medium text-right">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Columna derecha: gestión de suscripción */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Suscripción</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Plan</label>
                    <select
                      value={subPlan}
                      onChange={e => { setSubPlan(e.target.value); setDirty(true); }}
                      className="input text-sm capitalize"
                      onClick={e => e.stopPropagation()}
                    >
                      {PLANS.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
                    <div className="grid grid-cols-2 gap-2" onClick={e => e.stopPropagation()}>
                      {SUBSCRIPTION_STATUSES.map(({ value, label, Icon: SIcon, colors }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => { setSubStatus(value); setDirty(true); }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                            subStatus === value
                              ? colors + ' shadow-sm scale-[1.02]'
                              : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                          }`}
                        >
                          <SIcon size={12} /> {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {dirty && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSaveSubscription(); }}
                      disabled={saving}
                      className="btn-primary w-full justify-center text-sm"
                    >
                      {saving ? <Spinner size={14} /> : <Save size={14} />}
                      {saving ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function SuperadminSchoolsPage() {
  const [schools,   setSchools]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [showModal, setShowModal] = useState(false);
  const [toast, showToast, dismissToast] = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await superadminApi.getSchools();
      setSchools(res.data.data || []);
    } catch {
      showToast('Error al cargar los colegios.', 'error');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreated = (school) => {
    setSchools(prev => [school, ...prev]);
    setShowModal(false);
  };

  const handleSubscriptionUpdate = (schoolId, updated) => {
    setSchools(prev => prev.map(s => s.id === schoolId ? { ...s, ...updated } : s));
  };

  // KPIs
  const total     = schools.length;
  const active    = schools.filter(s => s.subscription_status === 'active').length;
  const trial     = schools.filter(s => s.subscription_status === 'trial').length;
  const suspended = schools.filter(s => s.subscription_status === 'suspended').length;

  // Filtro local
  const filtered = schools.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.slug?.toLowerCase().includes(q)  ||
      s.city?.toLowerCase().includes(q)  ||
      s.nit?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-6xl space-y-6">

      {/* Encabezado */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Panel Superadmin</h1>
          <p className="page-subtitle">Gestión de todos los colegios del SaaS</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex-shrink-0">
          <Plus size={15} /> Nuevo Colegio
        </button>
      </div>

      {/* Toast */}
      <Toast toast={toast} onDismiss={dismissToast} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Colegios totales"  value={total}     Icon={Building2}    color="indigo"  />
        <KpiCard label="Activos"           value={active}    Icon={CheckCircle2} color="emerald" />
        <KpiCard label="En período trial"  value={trial}     Icon={Clock}        color="amber"   />
        <KpiCard label="Suspendidos"       value={suspended} Icon={AlertCircle}  color="red"     />
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">

        {/* Header bar: search + counter */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="relative flex-1" style={{ maxWidth: '360px' }}>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-muted)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, slug, ciudad o NIT…"
              className="input pl-9 text-sm w-full"
              style={{ height: '36px' }}
            />
          </div>
          <div className="flex-1" />
          <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
            {filtered.length} colegio{filtered.length !== 1 ? 's' : ''}
            {search && ` · ${total} en total`}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm" style={{ color: 'var(--color-muted)' }}>
            <Spinner size={20} /> Cargando colegios…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <GraduationCap size={40} className="mx-auto mb-3" style={{ color: '#d1d5db' }} />
            <p className="font-medium" style={{ color: 'var(--color-base)' }}>
              {search ? 'Sin resultados para esa búsqueda' : 'No hay colegios registrados'}
            </p>
            {!search && (
              <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
                Haz clic en "Nuevo Colegio" para registrar el primero.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-body-bg)', borderBottom: '1px solid var(--color-border)' }}>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Colegio</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide hidden lg:table-cell" style={{ color: 'var(--color-muted)' }}>Ubicación</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Suscripción</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide hidden md:table-cell" style={{ color: 'var(--color-muted)' }}>Usuarios / Alumnos</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide hidden xl:table-cell" style={{ color: 'var(--color-muted)' }}>Creado</th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(school => (
                  <SchoolRow
                    key={school.id}
                    school={school}
                    onSubscriptionUpdate={handleSubscriptionUpdate}
                    showToast={showToast}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal crear colegio */}
      <CreateSchoolModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreated={handleCreated}
        showToast={showToast}
      />
    </div>
  );
}
