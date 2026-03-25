import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, UserCog } from 'lucide-react';
import { assignmentsApi } from '../api/assignments.api';
import { academicApi }    from '../../academic/api/academic.api';
import apiClient          from '../../../shared/api/client';

export default function AssignmentsPage() {
  const [assignments,  setAssignments]  = useState([]);
  const [teachers,     setTeachers]     = useState([]);
  const [classrooms,   setClassrooms]   = useState([]);
  const [subjects,     setSubjects]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [toast,        setToast]        = useState(null);

  // Filtros
  const [filterClassroom, setFilterClassroom] = useState('');
  const [filterShift,     setFilterShift]     = useState('');

  // Formulario
  const [form, setForm] = useState({ teacherId: '', classroomId: '', subjectId: '' });
  const [saving, setSaving] = useState(false);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const load = useCallback(async () => {
    try {
      const [asgRes, teachRes, crRes, subRes] = await Promise.all([
        assignmentsApi.getAll(),
        assignmentsApi.getTeachers(),
        academicApi.getClassrooms(),
        academicApi.getSubjects(),
      ]);
      setAssignments(asgRes.data.data);
      setTeachers(teachRes.data.data);
      setClassrooms(crRes.data.data);
      setSubjects(subRes.data.data);
    } catch { showToast('Error al cargar datos.', 'error'); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.teacherId || !form.classroomId || !form.subjectId) {
      return showToast('Completa todos los campos.', 'error');
    }
    setSaving(true);
    try {
      const res = await assignmentsApi.create(form);
      setAssignments(a => [...a, res.data.data]);
      setForm({ teacherId: '', classroomId: '', subjectId: '' });
      showToast('Asignación creada.');
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al crear asignación.', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta asignación?')) return;
    try {
      await assignmentsApi.remove(id);
      setAssignments(a => a.filter(x => x.id !== id));
      showToast('Asignación eliminada.');
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al eliminar.', 'error');
    }
  };

  // Calcular jornadas disponibles
  const availableShifts = [...new Set(classrooms.map(c => c.shift))].sort();

  // Filtrar asignaciones
  const displayed = assignments.filter(a => {
    if (filterClassroom && a.classroom_id !== filterClassroom) return false;
    if (filterShift     && a.shift !== filterShift)             return false;
    return true;
  });

  // Agrupar por grupo
  const byClassroom = displayed.reduce((acc, a) => {
    const key = `${a.shift}||${a.classroom_id}`;
    if (!acc[key]) acc[key] = { shift: a.shift, name: a.classroom_name, grade: a.grade_level_name, items: [] };
    acc[key].items.push(a);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm gap-2">
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        Cargando asignaciones…
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Asignaciones Docentes</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Asigna qué docente dicta cada materia en cada grupo.
        </p>
      </div>

      {toast && (
        <div className={`p-3 rounded-lg text-sm border ${
          toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'
        }`}>{toast.msg}</div>
      )}

      {/* Formulario nueva asignación */}
      <div className="card p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Nueva asignación</p>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Docente</label>
            <select
              value={form.teacherId}
              onChange={e => setForm(f => ({ ...f, teacherId: e.target.value }))}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-44"
              required
            >
              <option value="">Seleccionar docente…</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.last_name}, {t.first_name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Grupo</label>
            <select
              value={form.classroomId}
              onChange={e => setForm(f => ({ ...f, classroomId: e.target.value }))}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-44"
              required
            >
              <option value="">Seleccionar grupo…</option>
              {classrooms.map(c => (
                <option key={c.id} value={c.id}>
                  {c.grade_level_name} {c.name} — {c.shift}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Materia</label>
            <select
              value={form.subjectId}
              onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-44"
              required
            >
              <option value="">Seleccionar materia…</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}{s.area ? ` (${s.area})` : ''}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            <Plus size={15} />
            {saving ? 'Guardando…' : 'Asignar'}
          </button>
        </form>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filterClassroom}
          onChange={e => setFilterClassroom(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none"
        >
          <option value="">Todos los grupos</option>
          {classrooms.map(c => (
            <option key={c.id} value={c.id}>{c.grade_level_name} {c.name} — {c.shift}</option>
          ))}
        </select>

        <div className="flex gap-2">
          {['', ...availableShifts].map(s => (
            <button
              key={s || 'todas'}
              onClick={() => setFilterShift(s)}
              className={`text-xs px-3 py-1 rounded-full border capitalize transition-colors ${
                filterShift === s
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'border-gray-300 text-gray-500 hover:border-primary-400'
              }`}
            >{s || 'Todas las jornadas'}</button>
          ))}
        </div>

        <span className="text-xs text-gray-400 ml-auto">{displayed.length} asignaciones</span>
      </div>

      {/* Lista agrupada por grupo */}
      {Object.keys(byClassroom).length === 0 && (
        <div className="card p-10 text-center">
          <UserCog size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-600">Sin asignaciones</p>
          <p className="text-sm text-gray-400 mt-1">
            Crea grados, grupos y materias en "Estructura Académica" y luego asigna docentes aquí.
          </p>
        </div>
      )}

      {Object.entries(byClassroom).map(([key, group]) => (
        <div key={key} className="card overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
            <span className="font-semibold text-sm text-gray-800">{group.grade} {group.name}</span>
            <span className="text-xs text-gray-400 capitalize">· jornada {group.shift}</span>
            <span className="ml-auto text-xs text-gray-400">{group.items.length} materia{group.items.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-gray-100">
            {group.items.map(a => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-800">{a.subject_name}</span>
                  {a.subject_area && <span className="text-xs text-gray-400 ml-2">{a.subject_area}</span>}
                </div>
                <div className="text-sm text-gray-600 min-w-0">
                  {a.teacher_last_name}, {a.teacher_first_name}
                </div>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="p-1.5 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                  title="Eliminar asignación"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
