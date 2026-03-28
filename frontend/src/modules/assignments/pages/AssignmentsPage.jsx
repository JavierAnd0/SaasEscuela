import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, UserCog, ChevronDown, ChevronUp } from 'lucide-react';
import { assignmentsApi } from '../api/assignments.api';
import { academicApi }    from '../../academic/api/academic.api';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  }, []);
  return [toast, show];
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-48 text-gray-400 text-sm gap-2">
      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      Cargando…
    </div>
  );
}

// ─── Tarjeta por docente ─────────────────────────────────────────────────────
function TeacherCard({ teacher, assignments, classrooms, subjects, onAdd, onDelete }) {
  const [open,   setOpen]   = useState(true);
  const [form,   setForm]   = useState({ classroomId: '', subjectId: '' });
  const [err,    setErr]    = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.classroomId) { setErr('Selecciona el grupo.');   return; }
    if (!form.subjectId)   { setErr('Selecciona la materia.'); return; }
    setErr('');
    setSaving(true);
    try {
      await onAdd({ teacherId: teacher.id, classroomId: form.classroomId, subjectId: form.subjectId });
      setForm({ classroomId: '', subjectId: '' });
    } catch (msg) {
      setErr(msg);
    } finally { setSaving(false); }
  };

  return (
    <div className="card overflow-hidden">
      {/* Cabecera del docente */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
          {teacher.first_name?.[0]}{teacher.last_name?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">{teacher.last_name}, {teacher.first_name}</p>
          <p className="text-xs text-gray-400">{teacher.email}</p>
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0">
          {assignments.length} asignación{assignments.length !== 1 ? 'es' : ''}
        </span>
        {open ? <ChevronUp size={15} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={15} className="text-gray-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-gray-100">
          {/* Tabla de asignaciones del docente */}
          {assignments.length > 0 && (
            <div className="divide-y divide-gray-50">
              {assignments.map(a => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-800">{a.subject_name}</span>
                    {a.subject_area && <span className="text-xs text-gray-400 ml-1.5">({a.subject_area})</span>}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <span className="font-medium text-gray-700">{a.grade_level_name} {a.classroom_name}</span>
                    <span className="text-gray-300">·</span>
                    <span className="capitalize">{a.shift}</span>
                  </div>
                  <button
                    onClick={() => onDelete(a.id)}
                    className="p-1.5 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                    title="Eliminar asignación"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Mini formulario para añadir asignación a este docente */}
          <form onSubmit={handleAdd} className="flex flex-wrap gap-2 items-end px-4 py-3 bg-gray-50 border-t border-gray-100">
            <select
              value={form.classroomId}
              onChange={e => { setForm(f => ({ ...f, classroomId: e.target.value })); setErr(''); }}
              className="text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-44"
            >
              <option value="">Grupo…</option>
              {classrooms.map(c => (
                <option key={c.id} value={c.id}>
                  {c.grade_level_name} {c.name} — {c.shift}
                </option>
              ))}
            </select>

            <select
              value={form.subjectId}
              onChange={e => { setForm(f => ({ ...f, subjectId: e.target.value })); setErr(''); }}
              className="text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-44"
            >
              <option value="">Materia…</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.area ? ` (${s.area})` : ''}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white text-xs rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              <Plus size={13} />
              {saving ? 'Guardando…' : 'Añadir'}
            </button>

            {err && <p className="w-full text-xs text-red-600">{err}</p>}
          </form>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [teachers,    setTeachers]    = useState([]);
  const [classrooms,  setClassrooms]  = useState([]);
  const [subjects,    setSubjects]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [toast, showToast] = useToast();

  // Filtros globales
  const [filterTeacher,   setFilterTeacher]   = useState('');
  const [filterClassroom, setFilterClassroom] = useState('');

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
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al cargar datos.', 'error');
    } finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  // Añadir asignación — retorna Promise que resuelve o rechaza con string de error
  const handleAdd = useCallback(async ({ teacherId, classroomId, subjectId }) => {
    const res = await assignmentsApi.create({ teacherId, classroomId, subjectId })
      .catch(err => {
        const msg = err.response?.data?.error || err.response?.data?.details?.[0]?.message || 'Error al crear asignación.';
        throw msg;
      });
    setAssignments(a => [...a, res.data.data]);
    showToast('Asignación creada.');
  }, [showToast]);

  const handleDelete = useCallback(async (id) => {
    if (!confirm('¿Eliminar esta asignación?')) return;
    try {
      await assignmentsApi.remove(id);
      setAssignments(a => a.filter(x => x.id !== id));
      showToast('Asignación eliminada.');
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al eliminar.', 'error');
    }
  }, [showToast]);

  if (loading) return <Spinner />;

  // Filtrar asignaciones según filtros globales
  const filtered = assignments.filter(a => {
    if (filterTeacher   && a.teacher_id   !== filterTeacher)   return false;
    if (filterClassroom && a.classroom_id !== filterClassroom) return false;
    return true;
  });

  // Docentes que tienen asignaciones (o todos si no hay filtro)
  const relevantTeacherIds = filterTeacher
    ? [filterTeacher]
    : [...new Set(assignments.map(a => a.teacher_id))];

  // Docentes sin ninguna asignación todavía (siempre visibles cuando no hay filtro activo)
  const teachersWithAnyAssignment = new Set(assignments.map(a => a.teacher_id));
  const teachersWithoutAssignment = filterTeacher
    ? []
    : teachers.filter(t => !teachersWithAnyAssignment.has(t.id));

  const totalFiltered = filtered.length;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Asignaciones Docentes</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Un docente puede dictar varias materias y en varios grupos al mismo tiempo.
        </p>
      </div>

      {toast && (
        <div className={`p-3 rounded-lg text-sm border ${
          toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'
        }`}>{toast.msg}</div>
      )}

      {/* Filtros globales */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filterTeacher}
          onChange={e => setFilterTeacher(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Todos los docentes</option>
          {teachers.map(t => (
            <option key={t.id} value={t.id}>{t.last_name}, {t.first_name}</option>
          ))}
        </select>

        <select
          value={filterClassroom}
          onChange={e => setFilterClassroom(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Todos los grupos</option>
          {classrooms.map(c => (
            <option key={c.id} value={c.id}>{c.grade_level_name} {c.name} — {c.shift}</option>
          ))}
        </select>

        <span className="text-xs text-gray-400 ml-auto">
          {totalFiltered} asignación{totalFiltered !== 1 ? 'es' : ''}
          {' · '}{teachers.length} docente{teachers.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Estado vacío total */}
      {teachers.length === 0 && (
        <div className="card p-10 text-center">
          <UserCog size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-600">Sin docentes registrados</p>
          <p className="text-sm text-gray-400 mt-1">
            Crea docentes en "Usuarios" antes de configurar asignaciones.
          </p>
        </div>
      )}

      {/* Docentes con asignaciones (agrupado por docente) */}
      {relevantTeacherIds.map(teacherId => {
        const teacher = teachers.find(t => t.id === teacherId);
        if (!teacher) return null;
        const teacherAssignments = filtered.filter(a => a.teacher_id === teacherId);
        return (
          <TeacherCard
            key={teacherId}
            teacher={teacher}
            assignments={teacherAssignments}
            classrooms={classrooms}
            subjects={subjects}
            onAdd={handleAdd}
            onDelete={handleDelete}
          />
        );
      })}

      {/* Docentes sin asignaciones */}
      {teachersWithoutAssignment.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Sin asignaciones ({teachersWithoutAssignment.length})
          </p>
          {teachersWithoutAssignment.map(teacher => (
            <TeacherCard
              key={teacher.id}
              teacher={teacher}
              assignments={[]}
              classrooms={classrooms}
              subjects={subjects}
              onAdd={handleAdd}
              onDelete={handleDelete}
            />
          ))}
        </>
      )}
    </div>
  );
}
