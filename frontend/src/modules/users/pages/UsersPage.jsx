import { useState, useEffect, useCallback } from 'react';
import { Users, BookOpen, UserCheck } from 'lucide-react';
import apiClient    from '../../../shared/api/client';
import { usersApi } from '../api/users.api';

// ─── Constantes ──────────────────────────────────────────────────────────────

const ROLE_LABELS = {
  school_admin: { label: 'Rector / Admin',  cls: 'bg-purple-100 text-purple-800' },
  coordinator:  { label: 'Coordinador',     cls: 'bg-blue-100   text-blue-800'   },
  teacher:      { label: 'Docente',         cls: 'bg-green-100  text-green-800'  },
};

const EMPTY_FORM = {
  firstName: '', lastName: '', documentNumber: '',
  email: '', role: 'teacher', phoneWhatsapp: '',
  assignments: [],
};

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function Spinner({ small = false }) {
  const s = small ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <svg className={`animate-spin ${s} text-gray-400`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );
}

function RoleBadge({ role }) {
  const r = ROLE_LABELS[role];
  if (!r) return null;
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${r.cls}`}>{r.label}</span>;
}

function StatusBadge({ active }) {
  return active
    ? <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Activo</span>
    : <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100  text-gray-500">Inactivo</span>;
}

// ─── Modal de creación / edición ─────────────────────────────────────────────

function UserModal({ user, classrooms, subjects, onClose, onSaved, showToast }) {
  const isEdit = !!user?.id;
  const [form,    setForm]    = useState(isEdit ? {
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

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // Agrega una fila vacía de asignación
  const addAssignment = () => {
    setForm(prev => ({
      ...prev,
      assignments: [...prev.assignments, { classroomId: '', subjectId: '' }],
    }));
  };

  const removeAssignment = (idx) => {
    setForm(prev => ({
      ...prev,
      assignments: prev.assignments.filter((_, i) => i !== idx),
    }));
  };

  const updateAssignment = (idx, key, val) => {
    setForm(prev => {
      const next = [...prev.assignments];
      next[idx] = { ...next[idx], [key]: val };
      return { ...prev, assignments: next };
    });
  };

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

    const validAssignments = form.assignments.filter(a => a.classroomId && a.subjectId);

    setSaving(true);
    try {
      if (isEdit) {
        await usersApi.update(user.id, {
          firstName:     form.firstName,
          lastName:      form.lastName,
          phoneWhatsapp: form.phoneWhatsapp || null,
          role:          form.role,
          assignments:   validAssignments,
        });
        showToast('Usuario actualizado correctamente.');
      } else {
        const res = await usersApi.create({
          firstName:      form.firstName,
          lastName:       form.lastName,
          documentNumber: form.documentNumber,
          email:          form.email,
          role:           form.role,
          phoneWhatsapp:  form.phoneWhatsapp || null,
          assignments:    validAssignments,
        });
        const pwd = res.data?.defaultPassword;
        showToast(`Usuario creado. Contraseña temporal: ${pwd}`);
      }
      onSaved();
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al guardar usuario.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = (key) =>
    `w-full text-sm rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500
     ${errors[key] ? 'border-red-400 bg-red-50' : 'border-gray-300'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4 my-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-lg">
            {isEdit ? 'Editar usuario' : 'Nuevo usuario'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Nombres */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombres *</label>
              <input value={form.firstName} onChange={e => set('firstName', e.target.value)}
                className={inputCls('firstName')} placeholder="Juan"/>
              {errors.firstName && <p className="text-xs text-red-500 mt-0.5">{errors.firstName}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Apellidos *</label>
              <input value={form.lastName} onChange={e => set('lastName', e.target.value)}
                className={inputCls('lastName')} placeholder="García"/>
              {errors.lastName && <p className="text-xs text-red-500 mt-0.5">{errors.lastName}</p>}
            </div>
          </div>

          {/* CC + Teléfono */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cédula (CC) *</label>
              <input value={form.documentNumber} onChange={e => set('documentNumber', e.target.value)}
                disabled={isEdit}
                className={`${inputCls('documentNumber')} ${isEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                placeholder="12345678"/>
              {errors.documentNumber && <p className="text-xs text-red-500 mt-0.5">{errors.documentNumber}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">WhatsApp</label>
              <input value={form.phoneWhatsapp} onChange={e => set('phoneWhatsapp', e.target.value)}
                className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="+57 300 000 0000"/>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email institucional *</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              disabled={isEdit}
              className={`${inputCls('email')} ${isEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              placeholder="docente@colegio.edu.co"/>
            {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email}</p>}
          </div>

          {/* Rol */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Rol *</label>
            <select value={form.role} onChange={e => set('role', e.target.value)}
              className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
              <option value="teacher">Docente</option>
              <option value="coordinator">Coordinador</option>
              <option value="school_admin">Rector / Admin</option>
            </select>
          </div>

          {/* Asignaciones — solo para docentes */}
          {form.role === 'teacher' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-600">
                  Materias y grupos asignados
                </label>
                <button type="button" onClick={addAssignment}
                  className="text-xs text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                  </svg>
                  Agregar materia
                </button>
              </div>

              {form.assignments.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  Sin asignaciones. Use "Agregar materia" para asignar grupos.
                </p>
              ) : (
                <div className="space-y-2">
                  {form.assignments.map((a, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <select value={a.subjectId} onChange={e => updateAssignment(idx, 'subjectId', e.target.value)}
                        className="flex-1 text-sm rounded-lg border border-gray-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
                        <option value="">Materia…</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <select value={a.classroomId} onChange={e => updateAssignment(idx, 'classroomId', e.target.value)}
                        className="flex-1 text-sm rounded-lg border border-gray-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
                        <option value="">Grupo…</option>
                        {classrooms.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.grade_level_name} {c.name}{c.shift ? ` — ${c.shift}` : ''}
                          </option>
                        ))}
                      </select>
                      <button type="button" onClick={() => removeAssignment(idx)}
                        className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!isEdit && (
                <p className="text-xs text-gray-400 mt-2">
                  La contraseña por defecto se mostrará al crear el usuario.
                </p>
              )}
            </div>
          )}

          {/* Acciones */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <><Spinner small/> Guardando…</> : isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users,      setUsers]      = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [subjects,   setSubjects]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(null);   // null | 'create' | userObject
  const [toast,      setToast]      = useState(null);
  const [search,     setSearch]     = useState('');
  const [actionId,   setActionId]   = useState(null);   // id del usuario con acción en curso

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      usersApi.getAll(),
      apiClient.get('/classrooms'),
      apiClient.get('/subjects'),
    ])
      .then(([usersRes, clsRes, subRes]) => {
        setUsers(usersRes.data?.data      || []);
        setClassrooms(clsRes.data?.data   || []);
        setSubjects(subRes.data?.data     || []);
      })
      .catch(() => showToast('Error al cargar usuarios.', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleResetPassword = async (user) => {
    if (!window.confirm(`¿Restablecer contraseña de ${user.first_name} ${user.last_name} a la contraseña por defecto?`)) return;
    setActionId(user.id);
    try {
      const res = await usersApi.resetPassword(user.id);
      showToast(res.data?.message || 'Contraseña restablecida.');
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al restablecer contraseña.', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleToggleActive = async (user) => {
    const action = user.is_active ? 'desactivar' : 'reactivar';
    if (!window.confirm(`¿Desea ${action} a ${user.first_name} ${user.last_name}?`)) return;
    setActionId(user.id);
    try {
      const res = await usersApi.toggleActive(user.id);
      showToast(res.data?.message || 'Estado actualizado.');
      loadAll();
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al actualizar estado.', 'error');
    } finally {
      setActionId(null);
    }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (
      u.first_name?.toLowerCase().includes(q) ||
      u.last_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  // Estadísticas rápidas
  const total       = users.length;
  const teachers    = users.filter(u => u.role === 'teacher').length;
  const active      = users.filter(u => u.is_active).length;

  return (
    <div className="max-w-6xl space-y-6">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Docentes, coordinadores y administradores del colegio
          </p>
        </div>
        <button onClick={() => setModal('create')} className="btn-primary self-start">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          Nuevo usuario
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`p-3 rounded-lg text-sm border ${
          toast.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total usuarios', value: total,    Icon: Users,     color: 'text-primary-600' },
          { label: 'Docentes',       value: teachers, Icon: BookOpen,  color: 'text-blue-600'    },
          { label: 'Activos',        value: active,   Icon: UserCheck, color: 'text-emerald-600' },
        ].map(k => (
          <div key={k.label} className="card p-4 flex items-center gap-3">
            <k.Icon size={24} className={k.color} />
            <div>
              <p className="text-2xl font-bold text-gray-900">{k.value}</p>
              <p className="text-xs text-gray-500">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">

        {/* Barra de búsqueda */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
          <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email…"
            className="flex-1 text-sm bg-transparent focus:outline-none text-gray-700 placeholder-gray-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
            <Spinner/> Cargando usuarios…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            {search ? 'No se encontraron usuarios con ese criterio.' : 'No hay usuarios registrados. Cree el primero.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Rol</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Asignaciones</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(user => (
                  <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${!user.is_active ? 'opacity-50' : ''}`}>

                    {/* Nombre + email */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.last_name}, {user.first_name}
                          </p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Rol */}
                    <td className="px-4 py-3.5">
                      <RoleBadge role={user.role}/>
                    </td>

                    {/* Asignaciones */}
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      {user.role === 'teacher' && user.assignments?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {user.assignments.slice(0, 3).map((a, i) => (
                            <span key={i} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                              {a.subject_name} · {a.classroom_name}
                            </span>
                          ))}
                          {user.assignments.length > 3 && (
                            <span className="text-xs text-gray-400">+{user.assignments.length - 3} más</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3.5 text-center">
                      <StatusBadge active={user.is_active}/>
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">

                        {/* Editar */}
                        <button
                          onClick={() => setModal(user)}
                          title="Editar usuario"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>

                        {/* Resetear contraseña */}
                        <button
                          onClick={() => handleResetPassword(user)}
                          disabled={actionId === user.id || !user.is_active}
                          title="Restablecer contraseña"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-30"
                        >
                          {actionId === user.id ? <Spinner small/> : (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                            </svg>
                          )}
                        </button>

                        {/* Activar / Desactivar */}
                        <button
                          onClick={() => handleToggleActive(user)}
                          disabled={actionId === user.id}
                          title={user.is_active ? 'Desactivar usuario' : 'Reactivar usuario'}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-30
                            ${user.is_active
                              ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                              : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                            }`}
                        >
                          {user.is_active ? (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info de contraseña por defecto */}
      <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
        <span className="font-semibold text-gray-500">Contraseña por defecto:</span>{' '}
        Los usuarios nuevos ingresan con <code className="bg-white px-1 py-0.5 rounded border border-gray-200 font-mono">Colombia2026*</code>.
        Se recomienda que cada docente la cambie en su primer ingreso.
      </div>

      {/* Modal */}
      {modal && (
        <UserModal
          user={modal === 'create' ? null : modal}
          classrooms={classrooms}
          subjects={subjects}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); loadAll(); }}
          showToast={showToast}
        />
      )}
    </div>
  );
}
