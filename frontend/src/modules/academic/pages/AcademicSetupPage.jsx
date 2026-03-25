import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Pencil, Check, X, BookOpen, School, Layers } from 'lucide-react';
import { academicApi } from '../api/academic.api';

const SHIFTS = ['mañana', 'tarde', 'noche', 'única', 'sabatina'];
const TABS   = ['Grados', 'Grupos', 'Materias'];

// ─── Componente genérico de fila editable ────────────────────────────────────
function InlineForm({ fields, onSave, onCancel, saveLabel = 'Agregar' }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map(f => [f.name, f.default ?? '']))
  );

  return (
    <form
      onSubmit={e => { e.preventDefault(); onSave(values); }}
      className="flex flex-wrap gap-2 items-end p-3 bg-gray-50 rounded-lg border border-dashed border-gray-300"
    >
      {fields.map(f => (
        <div key={f.name} className="flex flex-col gap-1 min-w-0">
          <label className="text-xs text-gray-500">{f.label}</label>
          {f.type === 'select' ? (
            <select
              value={values[f.name]}
              onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))}
              className="text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
              required={f.required}
            >
              <option value="">Seleccionar…</option>
              {f.options.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ) : (
            <input
              type={f.type || 'text'}
              value={values[f.name]}
              onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))}
              placeholder={f.placeholder}
              className="text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 w-40"
              required={f.required}
            />
          )}
        </div>
      ))}
      <div className="flex gap-2 pb-0.5">
        <button
          type="submit"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 transition-colors"
        >
          <Plus size={14} /> {saveLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="p-1.5 text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        )}
      </div>
    </form>
  );
}

// ─── Tab: Grados ─────────────────────────────────────────────────────────────
function GradeLevelsTab({ toast }) {
  const [levels,   setLevels]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState(null); // id del que se edita inline
  const [editVal,  setEditVal]  = useState('');

  const load = useCallback(async () => {
    try {
      const res = await academicApi.getGradeLevels();
      setLevels(res.data.data);
    } catch { toast('Error al cargar grados', 'error'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async ({ name, sortOrder }) => {
    try {
      const res = await academicApi.createGradeLevel({ name, sortOrder: parseInt(sortOrder) || 0 });
      setLevels(l => [...l, res.data.data].sort((a, b) => a.sort_order - b.sort_order));
      toast('Grado creado');
    } catch (err) { toast(err.response?.data?.error || 'Error al crear grado', 'error'); }
  };

  const handleUpdate = async (id) => {
    try {
      const res = await academicApi.updateGradeLevel(id, { name: editVal });
      setLevels(l => l.map(x => x.id === id ? res.data.data : x));
      setEditing(null);
      toast('Grado actualizado');
    } catch (err) { toast(err.response?.data?.error || 'Error', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este grado? Se eliminarán también todos sus grupos.')) return;
    try {
      await academicApi.deleteGradeLevel(id);
      setLevels(l => l.filter(x => x.id !== id));
      toast('Grado eliminado');
    } catch (err) { toast(err.response?.data?.error || 'Error al eliminar', 'error'); }
  };

  if (loading) return <p className="text-sm text-gray-400 py-6 text-center">Cargando…</p>;

  return (
    <div className="space-y-4">
      <InlineForm
        fields={[
          { name: 'name', label: 'Nombre del grado', placeholder: 'Ej: Grado 6°', required: true },
          { name: 'sortOrder', label: 'Orden', placeholder: '1', type: 'number' },
        ]}
        onSave={handleCreate}
      />

      <div className="divide-y divide-gray-100">
        {levels.length === 0 && (
          <p className="text-sm text-gray-400 py-8 text-center">Sin grados registrados. Crea el primero.</p>
        )}
        {levels.map(l => (
          <div key={l.id} className="flex items-center gap-3 py-2.5">
            <span className="w-8 text-center text-xs text-gray-400 font-mono">{l.sort_order}</span>
            {editing === l.id ? (
              <>
                <input
                  autoFocus
                  value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  className="flex-1 text-sm border border-primary-400 rounded px-2 py-1 focus:outline-none"
                />
                <button onClick={() => handleUpdate(l.id)} className="p-1 text-green-600 hover:text-green-700"><Check size={15} /></button>
                <button onClick={() => setEditing(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={15} /></button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm font-medium text-gray-800">{l.name}</span>
                <button onClick={() => { setEditing(l.id); setEditVal(l.name); }} className="p-1 text-gray-400 hover:text-primary-600"><Pencil size={14} /></button>
                <button onClick={() => handleDelete(l.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Grupos ─────────────────────────────────────────────────────────────
function ClassroomsTab({ toast }) {
  const [classrooms, setClassrooms] = useState([]);
  const [levels,     setLevels]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filterShift, setFilterShift] = useState('');

  const load = useCallback(async () => {
    try {
      const [cr, gl] = await Promise.all([academicApi.getClassrooms(), academicApi.getGradeLevels()]);
      setClassrooms(cr.data.data);
      setLevels(gl.data.data);
    } catch { toast('Error al cargar grupos', 'error'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async ({ name, gradeLevelId, shift }) => {
    try {
      const res = await academicApi.createClassroom({ name, gradeLevelId, shift: shift || 'única' });
      setClassrooms(c => [...c, res.data.data]);
      toast('Grupo creado');
    } catch (err) { toast(err.response?.data?.error || 'Error al crear grupo', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este grupo? Esta acción no se puede deshacer.')) return;
    try {
      await academicApi.deleteClassroom(id);
      setClassrooms(c => c.filter(x => x.id !== id));
      toast('Grupo eliminado');
    } catch (err) { toast(err.response?.data?.error || 'Error al eliminar', 'error'); }
  };

  const displayed = filterShift ? classrooms.filter(c => c.shift === filterShift) : classrooms;

  // Agrupar por jornada para mostrar organizado
  const byShift = displayed.reduce((acc, c) => {
    if (!acc[c.shift]) acc[c.shift] = [];
    acc[c.shift].push(c);
    return acc;
  }, {});

  if (loading) return <p className="text-sm text-gray-400 py-6 text-center">Cargando…</p>;

  return (
    <div className="space-y-4">
      <InlineForm
        fields={[
          { name: 'gradeLevelId', label: 'Grado', type: 'select', required: true,
            options: levels.map(l => ({ value: l.id, label: l.name })) },
          { name: 'shift', label: 'Jornada', type: 'select', required: true,
            options: SHIFTS.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })) },
          { name: 'name', label: 'Nombre del grupo', placeholder: 'Ej: 9A', required: true },
        ]}
        onSave={handleCreate}
      />

      {/* Filtro por jornada */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterShift('')}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            !filterShift ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-500 hover:border-primary-400'
          }`}
        >Todas</button>
        {SHIFTS.map(s => (
          <button
            key={s}
            onClick={() => setFilterShift(s === filterShift ? '' : s)}
            className={`text-xs px-3 py-1 rounded-full border capitalize transition-colors ${
              filterShift === s ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-500 hover:border-primary-400'
            }`}
          >{s}</button>
        ))}
      </div>

      {Object.keys(byShift).length === 0 && (
        <p className="text-sm text-gray-400 py-8 text-center">Sin grupos registrados. Crea el primero.</p>
      )}

      {Object.entries(byShift).map(([shift, rooms]) => (
        <div key={shift}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 capitalize">
            Jornada {shift}
          </p>
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
            {rooms.map(c => (
              <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-800">{c.name}</span>
                  <span className="text-xs text-gray-400 ml-2">{c.grade_level_name}</span>
                </div>
                <button onClick={() => handleDelete(c.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
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

// ─── Tab: Materias ────────────────────────────────────────────────────────────
function SubjectsTab({ toast }) {
  const [subjects, setSubjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState(null);
  const [editVals, setEditVals] = useState({});

  const load = useCallback(async () => {
    try {
      const res = await academicApi.getSubjects();
      setSubjects(res.data.data);
    } catch { toast('Error al cargar materias', 'error'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async ({ name, area, code }) => {
    try {
      const res = await academicApi.createSubject({ name, area: area || null, code: code || null });
      setSubjects(s => [...s, res.data.data].sort((a, b) => a.name.localeCompare(b.name)));
      toast('Materia creada');
    } catch (err) { toast(err.response?.data?.error || 'Error al crear materia', 'error'); }
  };

  const handleUpdate = async (id) => {
    try {
      const res = await academicApi.updateSubject(id, editVals);
      setSubjects(s => s.map(x => x.id === id ? res.data.data : x));
      setEditing(null);
      toast('Materia actualizada');
    } catch (err) { toast(err.response?.data?.error || 'Error', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta materia?')) return;
    try {
      await academicApi.deleteSubject(id);
      setSubjects(s => s.filter(x => x.id !== id));
      toast('Materia eliminada');
    } catch (err) { toast(err.response?.data?.error || 'Error al eliminar', 'error'); }
  };

  // Agrupar por área
  const byArea = subjects.reduce((acc, s) => {
    const area = s.area || 'Sin área';
    if (!acc[area]) acc[area] = [];
    acc[area].push(s);
    return acc;
  }, {});

  if (loading) return <p className="text-sm text-gray-400 py-6 text-center">Cargando…</p>;

  return (
    <div className="space-y-4">
      <InlineForm
        fields={[
          { name: 'name', label: 'Nombre', placeholder: 'Ej: Matemáticas', required: true },
          { name: 'area', label: 'Área', placeholder: 'Ej: Ciencias Exactas' },
          { name: 'code', label: 'Código', placeholder: 'MAT' },
        ]}
        onSave={handleCreate}
      />

      {Object.entries(byArea).map(([area, subs]) => (
        <div key={area}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{area}</p>
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
            {subs.map(s => (
              <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-gray-50">
                {editing === s.id ? (
                  <>
                    <input autoFocus value={editVals.name} onChange={e => setEditVals(v => ({ ...v, name: e.target.value }))}
                      className="flex-1 text-sm border border-primary-400 rounded px-2 py-1 focus:outline-none" />
                    <input value={editVals.area || ''} onChange={e => setEditVals(v => ({ ...v, area: e.target.value }))}
                      placeholder="Área" className="w-32 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none" />
                    <button onClick={() => handleUpdate(s.id)} className="p-1 text-green-600"><Check size={15} /></button>
                    <button onClick={() => setEditing(null)} className="p-1 text-gray-400"><X size={15} /></button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium text-gray-800">{s.name}</span>
                    {s.code && <span className="text-xs text-gray-400 font-mono">{s.code}</span>}
                    <button onClick={() => { setEditing(s.id); setEditVals({ name: s.name, area: s.area, code: s.code }); }}
                      className="p-1 text-gray-400 hover:text-primary-600"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(s.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {subjects.length === 0 && (
        <p className="text-sm text-gray-400 py-8 text-center">Sin materias registradas. Crea la primera.</p>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
const TAB_ICONS = [<Layers size={16} />, <School size={16} />, <BookOpen size={16} />];

export default function AcademicSetupPage() {
  const [tab,   setTab]   = useState(0);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Estructura Académica</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Gestiona los grados, grupos (con jornada) y materias del colegio.
        </p>
      </div>

      {toast && (
        <div className={`p-3 rounded-lg text-sm border ${
          toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'
        }`}>{toast.msg}</div>
      )}

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-gray-200">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                tab === i
                  ? 'border-b-2 border-primary-600 text-primary-700 bg-primary-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {TAB_ICONS[i]} {t}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 0 && <GradeLevelsTab toast={showToast} />}
          {tab === 1 && <ClassroomsTab  toast={showToast} />}
          {tab === 2 && <SubjectsTab    toast={showToast} />}
        </div>
      </div>
    </div>
  );
}
