import { useState, useEffect, useCallback } from 'react';
import {
  Users, BookOpen, UserCheck, UserPlus, RefreshCw,
  CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp,
  KeyRound,
} from 'lucide-react';
import apiClient    from '../../../shared/api/client';
import { usersApi } from '../api/users.api';
import DataTable    from '../../../shared/components/DataTable';
import Modal        from '../../../shared/components/Modal';
import { useToast, Toast } from '../../../shared/hooks/useToast';

// ─── Constantes ───────────────────────────────────────────────────────────────

const ROLE_LABELS = {
  school_admin: { label: 'Rector / Admin',      cls: 'bg-purple-100 text-purple-800' },
  coordinator:  { label: 'Coordinador',         cls: 'bg-blue-100   text-blue-800'   },
  teacher:      { label: 'Docente',             cls: 'bg-green-100  text-green-800'  },
  parent:       { label: 'Padre / Acudiente',   cls: 'bg-emerald-100 text-emerald-800' },
};

const TABS = [
  { id: 'staff',   label: 'Personal del colegio' },
  { id: 'parents', label: 'Padres / Acudientes'  },
];

const EMPTY_FORM = {
  firstName: '', lastName: '', documentNumber: '',
  email: '', role: 'teacher', phoneWhatsapp: '',
  assignments: [],
};

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ small = false }) {
  const s = small ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <svg className={`animate-spin ${s}`} viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-muted)' }}>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function RoleBadge({ role }) {
  const r = ROLE_LABELS[role];
  if (!r) return null;
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${r.cls}`}>{r.label}</span>;
}

function StatusBadge({ active }) {
  return active
    ? <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Activo</span>
    : <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Inactivo</span>;
}

// ─── Formulario de usuario (Staff) ────────────────────────────────────────────

function UserForm({ user, classrooms, subjects, onSaved, onClose, showToast }) {
  const isEdit = !!user?.id;
  const [form,   setForm]   = useState(isEdit ? {
    firstName:      user.first_name,
    lastName:       user.last_name,
    documentNumber: user.document_number || '',
    email:          user.email,
    role:           user.role,
    phoneWhatsapp:  user.phone_whatsapp || '',
    assignments:    user.assignments || [],
  } : EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState({});

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));
  const addAssignment    = () => setForm((p) => ({ ...p, assignments: [...p.assignments, { classroomId: '', subjectId: '' }] }));
  const removeAssignment = (i) => setForm((p) => ({ ...p, assignments: p.assignments.filter((_, j) => j !== i) }));
  const updateAssignment = (i, key, val) => setForm((p) => {
    const next = [...p.assignments]; next[i] = { ...next[i], [key]: val }; return { ...p, assignments: next };
  });

  const validate = () => {
    const e = {};
    if (!form.firstName.trim())      e.firstName      = 'Requerido';
    if (!form.lastName.trim())       e.lastName       = 'Requerido';
    if (!form.documentNumber.trim()) e.documentNumber = 'Requerido';
    if (!form.email.trim())          e.email          = 'Requerido';
    if (!/\S+@\S+\.\S+/.test(form.email)) e.email    = 'Email inválido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const validAssignments = form.assignments.filter((a) => a.classroomId && a.subjectId);
    setSaving(true);
    try {
      if (isEdit) {
        await usersApi.update(user.id, {
          firstName: form.firstName, lastName: form.lastName,
          phoneWhatsapp: form.phoneWhatsapp || null, role: form.role,
          assignments: validAssignments,
        });
        showToast('Usuario actualizado correctamente.');
      } else {
        const res = await usersApi.create({
          firstName: form.firstName, lastName: form.lastName,
          documentNumber: form.documentNumber, email: form.email,
          role: form.role, phoneWhatsapp: form.phoneWhatsapp || null,
          assignments: validAssignments,
        });
        showToast(`Usuario creado. Contraseña temporal: ${res.data?.defaultPassword}`);
      }
      onSaved();
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al guardar usuario.', 'error');
    } finally { setSaving(false); }
  };

  return (
    <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-muted)' }}>Nombres *</label>
          <input value={form.firstName} onChange={(e) => set('firstName', e.target.value)}
            className={`input w-full ${errors.firstName ? 'border-red-400' : ''}`} placeholder="Juan"/>
          {errors.firstName && <p className="text-xs text-red-500 mt-0.5">{errors.firstName}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-muted)' }}>Apellidos *</label>
          <input value={form.lastName} onChange={(e) => set('lastName', e.target.value)}
            className={`input w-full ${errors.lastName ? 'border-red-400' : ''}`} placeholder="García"/>
          {errors.lastName && <p className="text-xs text-red-500 mt-0.5">{errors.lastName}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-muted)' }}>Cédula (CC) *</label>
          <input value={form.documentNumber} onChange={(e) => set('documentNumber', e.target.value)}
            disabled={isEdit}
            className={`input w-full ${errors.documentNumber ? 'border-red-400' : ''} ${isEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
            placeholder="12345678"/>
          {errors.documentNumber && <p className="text-xs text-red-500 mt-0.5">{errors.documentNumber}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-muted)' }}>WhatsApp</label>
          <input value={form.phoneWhatsapp} onChange={(e) => set('phoneWhatsapp', e.target.value)}
            className="input w-full" placeholder="+57 300 000 0000"/>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-muted)' }}>Email institucional *</label>
        <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
          disabled={isEdit}
          className={`input w-full ${errors.email ? 'border-red-400' : ''} ${isEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
          placeholder="docente@colegio.edu.co"/>
        {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-muted)' }}>Rol *</label>
        <select value={form.role} onChange={(e) => set('role', e.target.value)} className="input w-full bg-white">
          <option value="teacher">Docente</option>
          <option value="coordinator">Coordinador</option>
          <option value="school_admin">Rector / Admin</option>
        </select>
      </div>

      {form.role === 'teacher' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Materias y grupos asignados</label>
            <button type="button" onClick={addAssignment}
              className="text-xs font-medium flex items-center gap-1"
              style={{ color: 'var(--color-primary)' }}
            >
              <UserPlus size={13} /> Agregar materia
            </button>
          </div>
          {form.assignments.length === 0 ? (
            <p className="text-xs text-center py-3 rounded-lg border border-dashed"
              style={{ color: 'var(--color-muted)', borderColor: 'var(--color-border)', backgroundColor: 'var(--color-body-bg)' }}>
              Sin asignaciones. Use "Agregar materia" para asignar grupos.
            </p>
          ) : (
            <div className="space-y-2">
              {form.assignments.map((a, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select value={a.subjectId} onChange={(e) => updateAssignment(idx, 'subjectId', e.target.value)}
                    className="input flex-1 bg-white">
                    <option value="">Materia…</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select value={a.classroomId} onChange={(e) => updateAssignment(idx, 'classroomId', e.target.value)}
                    className="input flex-1 bg-white">
                    <option value="">Grupo…</option>
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.id}>{c.grade_level_name} {c.name}{c.shift ? ` — ${c.shift}` : ''}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => removeAssignment(idx)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1">
                    <XCircle size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hidden submit — triggered by footer button */}
      <button type="submit" className="hidden" disabled={saving} />
    </form>
  );
}

// ─── Modal resultado de creación masiva de padres ─────────────────────────────

function BulkCreateResultModal({ result, onClose }) {
  const [showErrors, setShowErrors] = useState(false);
  const hasErrors = result?.errors?.length > 0;

  return (
    <Modal
      isOpen={!!result}
      onClose={onClose}
      title="Resultado — Cuentas de padres"
      size="md"
      footer={<button onClick={onClose} className="btn-primary">Cerrar</button>}
    >
      {result && (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-3 text-center">
            {[
              { label: 'Elegibles',  value: result.eligible, color: 'text-gray-700',    bg: 'bg-gray-50'    },
              { label: 'Creadas',    value: result.created,  color: 'text-emerald-700', bg: 'bg-emerald-50' },
              { label: 'Vinculadas', value: result.linked,   color: 'text-blue-700',    bg: 'bg-blue-50'    },
              { label: 'Omitidas',   value: result.skipped,  color: 'text-amber-700',   bg: 'bg-amber-50'   },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`p-3 rounded-xl ${bg}`}>
                <p className={`text-2xl font-extrabold tabular-nums ${color}`}>{value}</p>
                <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Leyenda */}
          <div className="space-y-1 text-xs" style={{ color: 'var(--color-muted)' }}>
            <p><span className="font-semibold text-emerald-700">Creadas:</span> Nueva cuenta Firebase + registro en DB + vinculación.</p>
            <p><span className="font-semibold text-blue-700">Vinculadas:</span> El padre ya existía; solo se creó el vínculo.</p>
            <p><span className="font-semibold text-amber-700">Omitidas:</span> El padre ya estaba vinculado al estudiante.</p>
          </div>

          {/* Errores */}
          {hasErrors && (
            <div>
              <button onClick={() => setShowErrors((v) => !v)}
                className="flex items-center gap-1.5 text-sm text-red-600 font-medium">
                <AlertTriangle size={14} />
                {result.errors.length} error{result.errors.length !== 1 ? 'es' : ''}
                {showErrors ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showErrors && (
                <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-red-50 border border-red-100 text-xs">
                      <AlertTriangle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium text-red-700">{e.email}</span>
                        {e.student && <span className="text-red-500"> ({e.student})</span>}
                        <span className="text-red-600">: {e.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {result.created === 0 && result.linked === 0 && !hasErrors && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 text-gray-600 text-sm">
              <CheckCircle2 size={16} className="text-gray-400" />
              Todas las cuentas ya estaban creadas y vinculadas.
            </div>
          )}

          {(result.created > 0 || result.linked > 0) && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm">
              <CheckCircle2 size={16} />
              Los padres pueden ingresar al portal con su email y su número de cédula como contraseña.
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ─── Tab: Personal del colegio ────────────────────────────────────────────────

function StaffTab({ showToast }) {
  const [users,      setUsers]      = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [subjects,   setSubjects]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(null);   // null | 'create' | user object
  const [actionId,   setActionId]   = useState(null);
  const [saving,     setSaving]     = useState(false);

  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      usersApi.getAll(),
      apiClient.get('/classrooms'),
      apiClient.get('/subjects'),
    ])
      .then(([usersRes, clsRes, subRes]) => {
        setUsers(usersRes.data?.data   || []);
        setClassrooms(clsRes.data?.data || []);
        setSubjects(subRes.data?.data   || []);
      })
      .catch(() => showToast('Error al cargar usuarios.', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleResetPassword = async (user) => {
    if (!window.confirm(`¿Restablecer contraseña de ${user.first_name} ${user.last_name}?`)) return;
    setActionId(user.id);
    try {
      const res = await usersApi.resetPassword(user.id);
      showToast(res.data?.message || 'Contraseña restablecida.');
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al restablecer contraseña.', 'error');
    } finally { setActionId(null); }
  };

  const handleToggleActive = async (user) => {
    if (!window.confirm(`¿${user.is_active ? 'Desactivar' : 'Reactivar'} a ${user.first_name} ${user.last_name}?`)) return;
    setActionId(user.id);
    try {
      const res = await usersApi.toggleActive(user.id);
      showToast(res.data?.message || 'Estado actualizado.');
      loadAll();
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al actualizar estado.', 'error');
    } finally { setActionId(null); }
  };

  const isEdit = modal && modal !== 'create';

  const columns = [
    {
      key:   'first_name',
      label: 'Usuario',
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: 'rgba(102,108,255,0.12)', color: 'var(--color-primary)' }}>
            {row.first_name?.charAt(0)}{row.last_name?.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-sm" style={{ color: 'var(--color-base)' }}>
              {row.last_name}, {row.first_name}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key:   'role',
      label: 'Rol',
      render: (val) => <RoleBadge role={val} />,
    },
    {
      key:   'assignments',
      label: 'Asignaciones',
      render: (val, row) => row.role === 'teacher' && val?.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {val.slice(0, 3).map((a, i) => (
            <span key={i} className="text-xs px-1.5 py-0.5 rounded"
              style={{ backgroundColor: 'var(--color-body-bg)', color: 'var(--color-muted)' }}>
              {a.subject_name} · {a.classroom_name}
            </span>
          ))}
          {val.length > 3 && (
            <span className="text-xs" style={{ color: 'var(--color-muted)' }}>+{val.length - 3} más</span>
          )}
        </div>
      ) : null,
    },
    {
      key:   'is_active',
      label: 'Estado',
      width: '90px',
      render: (val) => <StatusBadge active={val} />,
    },
    {
      key:   '_actions',
      label: 'Acciones',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button className="btn-action-edit" onClick={() => setModal(row)}>Editar</button>
          <button
            className="btn-action border-amber-200 text-amber-600 hover:bg-amber-50"
            onClick={() => handleResetPassword(row)}
            disabled={actionId === row.id || !row.is_active}
            title="Restablecer contraseña"
          >
            {actionId === row.id ? <Spinner small /> : <KeyRound size={12} />}
            Reset pwd
          </button>
          <button
            className={row.is_active ? 'btn-action-danger' : 'btn-action-success'}
            onClick={() => handleToggleActive(row)}
            disabled={actionId === row.id}
          >
            {row.is_active ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total',    value: users.length,                               Icon: Users,     color: 'var(--color-primary)' },
          { label: 'Docentes', value: users.filter(u => u.role === 'teacher').length, Icon: BookOpen, color: '#3b82f6' },
          { label: 'Activos',  value: users.filter(u => u.is_active).length,      Icon: UserCheck, color: '#10b981' },
        ].map((k) => (
          <div key={k.label} className="kpi-card">
            <div className="kpi-icon" style={{ backgroundColor: k.color + '20' }}>
              <k.Icon size={20} style={{ color: k.color }} />
            </div>
            <div>
              <p className="kpi-value">{k.value}</p>
              <p className="kpi-label">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        searchPlaceholder="Buscar por nombre o email…"
        emptyMessage="No hay usuarios registrados"
        emptySubMessage="Crea el primero con el botón Nuevo usuario."
        rowClassName={(row) => !row.is_active ? 'opacity-50' : ''}
        toolbar={
          <button onClick={() => setModal('create')} className="btn-primary text-sm">
            <UserPlus size={14} /> Nuevo usuario
          </button>
        }
      />

      {/* Nota contraseña */}
      <div className="text-xs rounded-lg px-4 py-3 border"
        style={{ backgroundColor: 'var(--color-body-bg)', borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
        <span className="font-semibold" style={{ color: 'var(--color-base)' }}>Contraseña por defecto:</span>{' '}
        Los usuarios nuevos ingresan con <code className="bg-white px-1 py-0.5 rounded border font-mono"
          style={{ borderColor: 'var(--color-border)' }}>Colombia2026*</code>.
        Se recomienda que cada docente la cambie en su primer ingreso.
      </div>

      {/* Modal Crear / Editar */}
      <Modal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        title={isEdit ? 'Editar usuario' : 'Nuevo usuario'}
        size="lg"
        footer={
          <>
            <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
            <button
              onClick={() => document.getElementById('user-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? <><Spinner small /> Guardando…</> : isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </>
        }
      >
        {modal !== null && (
          <UserForm
            user={isEdit ? modal : null}
            classrooms={classrooms}
            subjects={subjects}
            onSaved={() => { setModal(null); loadAll(); }}
            onClose={() => setModal(null)}
            showToast={showToast}
          />
        )}
      </Modal>
    </>
  );
}

// ─── Tab: Padres / Acudientes ─────────────────────────────────────────────────

function ParentsTab({ showToast }) {
  const [parents,  setParents]  = useState([]);
  const [pending,  setPending]  = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [creating, setCreating] = useState(false);
  const [result,   setResult]   = useState(null);
  const [actionId, setActionId] = useState(null);

  const loadParents = useCallback(() => {
    setLoading(true);
    apiClient.get('/users/parents')
      .then((res) => {
        setParents(res.data?.data    || []);
        setPending(res.data?.pending ?? 0);
      })
      .catch(() => showToast('Error al cargar padres.', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => { loadParents(); }, [loadParents]);

  const handleBulkCreate = async () => {
    if (!window.confirm(
      `Se crearán cuentas para los acudientes con email y CC configurados.\n\n` +
      `• Email de login: el correo del acudiente en el registro del estudiante\n` +
      `• Contraseña inicial: el número de CC del acudiente\n\n¿Continuar?`
    )) return;
    setCreating(true);
    try {
      const res = await apiClient.post('/users/parents/bulk-create');
      setResult(res.data?.data || null);
      loadParents();
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al crear cuentas.', 'error');
    } finally { setCreating(false); }
  };

  const handleToggleActive = async (parent) => {
    if (!window.confirm(`¿${parent.is_active ? 'Desactivar' : 'Reactivar'} a ${parent.first_name} ${parent.last_name}?`)) return;
    setActionId(parent.id);
    try {
      await apiClient.delete(`/users/parents/${parent.id}`);
      showToast('Estado actualizado.');
      loadParents();
    } catch (err) {
      showToast(err.response?.data?.error || 'Error.', 'error');
    } finally { setActionId(null); }
  };

  const handleResetPassword = async (parent) => {
    if (!window.confirm(`¿Restablecer contraseña de ${parent.first_name} ${parent.last_name} a su número de cédula?`)) return;
    setActionId(parent.id);
    try {
      const res = await apiClient.post(`/users/parents/${parent.id}/reset-password`);
      showToast(res.data?.message || 'Contraseña restablecida.');
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al restablecer contraseña.', 'error');
    } finally { setActionId(null); }
  };

  const columns = [
    {
      key:   'first_name',
      label: 'Padre / Acudiente',
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: '#d1fae5', color: '#059669' }}>
            {row.first_name?.charAt(0)}{row.last_name?.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-sm" style={{ color: 'var(--color-base)' }}>
              {row.last_name}, {row.first_name}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key:   'children',
      label: 'Hijos vinculados',
      render: (val) => val?.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {val.map((c) => (
            <span key={c.id} className="text-xs px-2 py-0.5 rounded-full border"
              style={{ backgroundColor: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}>
              {c.first_name} {c.last_name}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-xs" style={{ color: 'var(--color-muted)' }}>Sin hijos vinculados</span>
      ),
    },
    {
      key:   'is_active',
      label: 'Estado',
      width: '90px',
      render: (val) => <StatusBadge active={val} />,
    },
    {
      key:   '_actions',
      label: 'Acciones',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            className="btn-action border-amber-200 text-amber-600 hover:bg-amber-50"
            onClick={() => handleResetPassword(row)}
            disabled={actionId === row.id || !row.is_active}
            title="Restablecer contraseña al CC"
          >
            {actionId === row.id ? <Spinner small /> : <KeyRound size={12} />}
            Reset pwd
          </button>
          <button
            className={row.is_active ? 'btn-action-danger' : 'btn-action-success'}
            onClick={() => handleToggleActive(row)}
            disabled={actionId === row.id}
          >
            {row.is_active ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      {/* Banner pendientes */}
      {pending > 0 && (
        <div className="mb-4 p-4 rounded-xl border flex items-center justify-between gap-4"
          style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="flex-shrink-0" style={{ color: '#d97706' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#92400e' }}>
                {pending} estudiante{pending !== 1 ? 's' : ''} sin cuenta de portal vinculada
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#b45309' }}>
                Tienen email y CC de acudiente configurados. Haz clic en "Crear cuentas" para activarlos.
              </p>
            </div>
          </div>
          <button
            onClick={handleBulkCreate}
            disabled={creating}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#d97706' }}
            onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#b45309'; }}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#d97706'}
          >
            {creating ? <Spinner small /> : <UserPlus size={15} />}
            {creating ? 'Creando…' : 'Crear cuentas'}
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Padres registrados', value: parents.length,                         Icon: Users,         color: '#059669' },
          { label: 'Activos',            value: parents.filter(p => p.is_active).length, Icon: UserCheck,    color: '#3b82f6' },
          { label: 'Pendientes',         value: pending,                                 Icon: AlertTriangle, color: '#d97706' },
        ].map((k) => (
          <div key={k.label} className="kpi-card">
            <div className="kpi-icon" style={{ backgroundColor: k.color + '20' }}>
              <k.Icon size={20} style={{ color: k.color }} />
            </div>
            <div>
              <p className="kpi-value">{k.value}</p>
              <p className="kpi-label">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={parents}
        loading={loading}
        searchPlaceholder="Buscar por nombre o email…"
        emptyIcon={<Users size={40} />}
        emptyMessage="Aún no hay cuentas de padres"
        emptySubMessage={pending > 0 ? 'Haz clic en "Crear cuentas" para generarlas en lote.' : undefined}
        rowClassName={(row) => !row.is_active ? 'opacity-50' : ''}
        toolbar={
          <button onClick={loadParents} className="btn-secondary text-sm" title="Actualizar">
            <RefreshCw size={14} />
          </button>
        }
      />

      {/* Nota portal */}
      <div className="text-xs rounded-lg px-4 py-3 border"
        style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46' }}>
        <span className="font-semibold">Contraseña inicial:</span>{' '}
        El número de cédula del acudiente (registrado en el perfil del estudiante).
        El padre puede cambiarla desde el portal usando "¿Olvidó su contraseña?".
      </div>

      <BulkCreateResultModal result={result} onClose={() => setResult(null)} />
    </>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState('staff');
  const [toast, showToast, dismissToast] = useToast();

  return (
    <div className="max-w-6xl space-y-6">

      {/* Encabezado */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Usuarios</h1>
          <p className="page-subtitle">Personal del colegio y portales familiares</p>
        </div>
      </div>

      {/* Toast */}
      <Toast toast={toast} onDismiss={dismissToast} />

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="px-5 py-2.5 text-sm font-medium border-b-2 transition-colors"
              style={{
                borderColor: activeTab === id ? 'var(--color-primary)' : 'transparent',
                color:       activeTab === id ? 'var(--color-primary)' : 'var(--color-muted)',
              }}
              onMouseEnter={e => { if (activeTab !== id) e.currentTarget.style.color = 'var(--color-base)'; }}
              onMouseLeave={e => { if (activeTab !== id) e.currentTarget.style.color = 'var(--color-muted)'; }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'staff'   && <StaffTab   showToast={showToast} />}
      {activeTab === 'parents' && <ParentsTab showToast={showToast} />}
    </div>
  );
}
