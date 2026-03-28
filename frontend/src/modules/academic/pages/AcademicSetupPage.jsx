import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Pencil, Check, X, BookOpen, School, Layers, CheckCircle2, PlusCircle } from 'lucide-react';
import { academicApi } from '../api/academic.api';

const SHIFTS = ['mañana', 'tarde', 'noche', 'única', 'sabatina'];
const TABS   = ['Grados', 'Grupos', 'Materias'];

/**
 * Catálogo oficial colombiano de niveles y grados
 * Fuente: Ley 115/1994 y Decreto 1860/1994
 * Igual estructura que SIMAT / Master2000 / Academusoft
 */
const COLOMBIA_LEVELS = [
  {
    key:   'preescolar',
    label: 'Preescolar',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    active:'bg-amber-500 text-white border-amber-500',
    grades: [
      { name: 'Prejardín',  order: 0 },
      { name: 'Jardín',     order: 1 },
      { name: 'Transición', order: 2 },
    ],
  },
  {
    key:   'primaria',
    label: 'Básica Primaria',
    badge: 'bg-blue-100 text-blue-800 border-blue-300',
    active:'bg-blue-600 text-white border-blue-600',
    grades: [
      { name: 'Primero', order: 3 },
      { name: 'Segundo', order: 4 },
      { name: 'Tercero', order: 5 },
      { name: 'Cuarto',  order: 6 },
      { name: 'Quinto',  order: 7 },
    ],
  },
  {
    key:   'secundaria',
    label: 'Básica Secundaria',
    badge: 'bg-violet-100 text-violet-800 border-violet-300',
    active:'bg-violet-600 text-white border-violet-600',
    grades: [
      { name: 'Sexto',   order: 8  },
      { name: 'Séptimo', order: 9  },
      { name: 'Octavo',  order: 10 },
      { name: 'Noveno',  order: 11 },
    ],
  },
  {
    key:   'media',
    label: 'Media Vocacional',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    active:'bg-emerald-600 text-white border-emerald-600',
    grades: [
      { name: 'Décimo',   order: 12 },
      { name: 'Undécimo', order: 13 },
    ],
  },
];

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
  const [dbLevels, setDbLevels] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [pending,  setPending]  = useState(new Set()); // nombres en proceso (add/remove)

  const load = useCallback(async () => {
    try {
      const res = await academicApi.getGradeLevels();
      setDbLevels(res.data.data);
    } catch { toast('Error al cargar grados', 'error'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // Normaliza nombre para comparación (sin tildes, minúsculas)
  const normalize = (s) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Busca en DB el grado que corresponde a una entrada del catálogo
  const findInDb = (catalogName) =>
    dbLevels.find(d => normalize(d.name) === normalize(catalogName));

  // Activa un grado del catálogo (lo crea en DB)
  const handleActivate = async (grade) => {
    if (pending.has(grade.name)) return;
    setPending(p => new Set([...p, grade.name]));
    try {
      const res = await academicApi.createGradeLevel({ name: grade.name, sortOrder: grade.order });
      setDbLevels(l => [...l, res.data.data].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
      toast(`${grade.name} activado`);
    } catch (err) {
      toast(err.response?.data?.error || 'Error al activar grado', 'error');
    } finally {
      setPending(p => { const n = new Set(p); n.delete(grade.name); return n; });
    }
  };

  // Desactiva un grado (lo elimina de DB)
  const handleDeactivate = async (grade, dbRecord) => {
    if (pending.has(grade.name)) return;
    if (!confirm(`¿Desactivar "${grade.name}"? Se eliminarán también todos sus grupos y asignaciones asociadas.`)) return;
    setPending(p => new Set([...p, grade.name]));
    try {
      await academicApi.deleteGradeLevel(dbRecord.id);
      setDbLevels(l => l.filter(x => x.id !== dbRecord.id));
      toast(`${grade.name} desactivado`);
    } catch (err) {
      toast(err.response?.data?.error || 'Error al desactivar grado', 'error');
    } finally {
      setPending(p => { const n = new Set(p); n.delete(grade.name); return n; });
    }
  };

  // Grados en DB que NO están en el catálogo (creados manualmente antes)
  const allCatalogNames = new Set(
    COLOMBIA_LEVELS.flatMap(l => l.grades.map(g => normalize(g.name)))
  );
  const customLevels = dbLevels.filter(d => !allCatalogNames.has(normalize(d.name)));

  // Cuántos grados activos tiene el colegio
  const totalActive = dbLevels.length;

  if (loading) return <p className="text-sm text-gray-400 py-6 text-center">Cargando…</p>;

  return (
    <div className="space-y-6">
      {/* Contador de grados activos */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <CheckCircle2 size={16} className="text-primary-500" />
        <span><span className="font-medium text-gray-700">{totalActive}</span> grado{totalActive !== 1 ? 's' : ''} activo{totalActive !== 1 ? 's' : ''} en este colegio</span>
      </div>

      {/* Catálogo por nivel */}
      {COLOMBIA_LEVELS.map(level => {
        const activeCount = level.grades.filter(g => findInDb(g.name)).length;
        return (
          <div key={level.key}>
            {/* Encabezado del nivel */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${level.badge}`}>
                {level.label}
              </span>
              <span className="text-xs text-gray-400">
                {activeCount}/{level.grades.length} activos
              </span>
            </div>

            {/* Chips de grados */}
            <div className="flex flex-wrap gap-2">
              {level.grades.map(grade => {
                const dbRecord = findInDb(grade.name);
                const isActive = !!dbRecord;
                const isLoading = pending.has(grade.name);

                return (
                  <div key={grade.name} className="relative group">
                    {isActive ? (
                      /* Grado ACTIVO: chip coloreado con botón X para desactivar */
                      <div className={`flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full border text-sm font-medium transition-all ${level.active}`}>
                        <CheckCircle2 size={13} className="opacity-80" />
                        <span>{grade.name}</span>
                        <button
                          onClick={() => handleDeactivate(grade, dbRecord)}
                          disabled={isLoading}
                          title={`Desactivar ${grade.name}`}
                          className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 transition-colors disabled:opacity-50"
                        >
                          {isLoading ? (
                            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                            </svg>
                          ) : (
                            <X size={10} strokeWidth={3} />
                          )}
                        </button>
                      </div>
                    ) : (
                      /* Grado INACTIVO: chip gris punteado, clic para activar */
                      <button
                        onClick={() => handleActivate(grade)}
                        disabled={isLoading}
                        title={`Activar ${grade.name}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-sm text-gray-400 hover:border-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
                      >
                        {isLoading ? (
                          <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                          </svg>
                        ) : (
                          <PlusCircle size={13} />
                        )}
                        <span>{grade.name}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Grados personalizados (creados antes de este sistema) */}
      {customLevels.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full border bg-gray-100 text-gray-600 border-gray-300">
              Personalizados
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {customLevels.map(d => (
              <div key={d.id} className="flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full border text-sm font-medium bg-gray-700 text-white border-gray-700">
                <span>{d.name}</span>
                <button
                  onClick={async () => {
                    if (!confirm(`¿Eliminar "${d.name}"?`)) return;
                    try {
                      await academicApi.deleteGradeLevel(d.id);
                      setDbLevels(l => l.filter(x => x.id !== d.id));
                      toast(`${d.name} eliminado`);
                    } catch (err) {
                      toast(err.response?.data?.error || 'Error', 'error');
                    }
                  }}
                  className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 transition-colors"
                >
                  <X size={10} strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Grupos ─────────────────────────────────────────────────────────────
const EMPTY_FORM = { name: '', gradeLevelId: '', shift: '' };

function ClassroomsTab({ toast }) {
  const [classrooms,  setClassrooms]  = useState([]);
  const [levels,      setLevels]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filterShift, setFilterShift] = useState('');
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [formErr,     setFormErr]     = useState('');
  const [saving,      setSaving]      = useState(false);

  const load = useCallback(async () => {
    // Llamadas independientes: si classrooms falla (ej. migración pendiente), los grados
    // se cargan igual para que el formulario funcione.
    const [crResult, glResult] = await Promise.allSettled([
      academicApi.getClassrooms(),
      academicApi.getGradeLevels(),
    ]);
    if (crResult.status === 'fulfilled') {
      setClassrooms(crResult.value.data.data);
    } else {
      toast('Error al cargar grupos (¿migración pendiente?)', 'error');
    }
    if (glResult.status === 'fulfilled') {
      setLevels(glResult.value.data.data);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    // Validación explícita en cliente
    if (!form.gradeLevelId) { setFormErr('Selecciona el grado.'); return; }
    if (!form.shift)        { setFormErr('Selecciona la jornada.'); return; }
    if (!form.name.trim())  { setFormErr('Escribe el nombre del grupo.'); return; }
    setFormErr('');
    setSaving(true);
    try {
      const res = await academicApi.createClassroom({
        name:         form.name.trim(),
        gradeLevelId: form.gradeLevelId,
        shift:        form.shift,
      });
      setClassrooms(c => [...c, res.data.data]);
      setForm(EMPTY_FORM);
      toast('Grupo creado');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.details?.[0]?.message || 'Error al crear grupo';
      setFormErr(msg);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este grupo? Esta acción no se puede deshacer.')) return;
    try {
      await academicApi.deleteClassroom(id);
      setClassrooms(c => c.filter(x => x.id !== id));
      toast('Grupo eliminado');
    } catch (err) { toast(err.response?.data?.error || 'Error al eliminar', 'error'); }
  };

  // Agrupar por grado → jornada
  const displayed = filterShift ? classrooms.filter(c => c.shift === filterShift) : classrooms;
  const byGrade = displayed.reduce((acc, c) => {
    const key = c.grade_level_id;
    if (!acc[key]) acc[key] = { name: c.grade_level_name, rooms: [] };
    acc[key].rooms.push(c);
    return acc;
  }, {});

  const usedShifts = [...new Set(classrooms.map(c => c.shift))].sort();

  if (loading) return <p className="text-sm text-gray-400 py-6 text-center">Cargando…</p>;

  return (
    <div className="space-y-5">
      {/* Formulario controlado */}
      <form onSubmit={handleCreate} className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Nuevo grupo</p>
        <div className="flex flex-wrap gap-3 items-end">
          {/* Grado */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Grado <span className="text-red-400">*</span></label>
            <select
              value={form.gradeLevelId}
              onChange={e => { setForm(f => ({ ...f, gradeLevelId: e.target.value })); setFormErr(''); }}
              className="text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-40"
            >
              <option value="">Seleccionar grado…</option>
              {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          {/* Jornada */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Jornada <span className="text-red-400">*</span></label>
            <select
              value={form.shift}
              onChange={e => { setForm(f => ({ ...f, shift: e.target.value })); setFormErr(''); }}
              className="text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-36 capitalize"
            >
              <option value="">Seleccionar jornada…</option>
              {SHIFTS.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>

          {/* Nombre */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Nombre del grupo <span className="text-red-400">*</span></label>
            <input
              type="text"
              placeholder="Ej: A, B, 01…"
              value={form.name}
              onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFormErr(''); }}
              className="text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 w-28"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            <Plus size={14} />
            {saving ? 'Guardando…' : 'Crear grupo'}
          </button>
        </div>

        {/* Error inline */}
        {formErr && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <X size={12} /> {formErr}
          </p>
        )}

        {/* Ayuda: sin grados */}
        {levels.length === 0 && (
          <p className="text-xs text-amber-600">⚠ No hay grados creados. Ve a la pestaña «Grados» y activa los que necesitas primero.</p>
        )}
      </form>

      {/* Filtro por jornada */}
      {usedShifts.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterShift('')}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              !filterShift ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-500 hover:border-primary-400'
            }`}
          >Todas</button>
          {usedShifts.map(s => (
            <button
              key={s}
              onClick={() => setFilterShift(s === filterShift ? '' : s)}
              className={`text-xs px-3 py-1 rounded-full border capitalize transition-colors ${
                filterShift === s ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-500 hover:border-primary-400'
              }`}
            >{s}</button>
          ))}
        </div>
      )}

      {/* Lista agrupada por grado */}
      {Object.keys(byGrade).length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">Sin grupos registrados. Crea el primero arriba.</p>
      ) : (
        Object.entries(byGrade).map(([key, { name: gradeName, rooms }]) => (
          <div key={key}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{gradeName}</p>
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
              {rooms.map(c => (
                <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-gray-50">
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-gray-800">Grupo {c.name}</span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full capitalize">{c.shift}</span>
                  </div>
                  <button onClick={() => handleDelete(c.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors" title="Eliminar">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/**
 * Catálogo de materias — Ley 115/1994 Art. 23 (áreas obligatorias)
 * + Ley 1014/2006 (Emprendimiento) + Resolución 2343/1996
 * Aplicable a instituciones públicas y privadas de Colombia.
 */
const COLOMBIA_SUBJECTS = [
  {
    area:   'Matemáticas',
    badge:  'bg-blue-100 text-blue-800 border-blue-300',
    active: 'bg-blue-600 text-white border-blue-600',
    subjects: ['Matemáticas', 'Álgebra', 'Geometría', 'Estadística', 'Cálculo', 'Trigonometría'],
  },
  {
    area:   'Humanidades',
    badge:  'bg-violet-100 text-violet-800 border-violet-300',
    active: 'bg-violet-600 text-white border-violet-600',
    subjects: ['Lengua Castellana', 'Literatura', 'Inglés', 'Francés', 'Comprensión Lectora'],
  },
  {
    area:   'Ciencias Naturales',
    badge:  'bg-emerald-100 text-emerald-800 border-emerald-300',
    active: 'bg-emerald-600 text-white border-emerald-600',
    subjects: ['Ciencias Naturales', 'Biología', 'Física', 'Química', 'Ciencias Ambientales'],
  },
  {
    area:   'Ciencias Sociales',
    badge:  'bg-amber-100 text-amber-800 border-amber-300',
    active: 'bg-amber-500 text-white border-amber-500',
    subjects: ['Ciencias Sociales', 'Historia', 'Geografía', 'Constitución Política', 'Economía'],
  },
  {
    area:   'Educación Artística',
    badge:  'bg-pink-100 text-pink-800 border-pink-300',
    active: 'bg-pink-600 text-white border-pink-600',
    subjects: ['Educación Artística', 'Música', 'Artes Plásticas', 'Teatro', 'Danza'],
  },
  {
    area:   'Educación Física',
    badge:  'bg-orange-100 text-orange-800 border-orange-300',
    active: 'bg-orange-500 text-white border-orange-500',
    subjects: ['Educación Física', 'Recreación', 'Deportes'],
  },
  {
    area:   'Tecnología e Informática',
    badge:  'bg-cyan-100 text-cyan-800 border-cyan-300',
    active: 'bg-cyan-600 text-white border-cyan-600',
    subjects: ['Tecnología e Informática', 'Informática', 'Sistemas'],
  },
  {
    area:   'Ética y Valores',
    badge:  'bg-rose-100 text-rose-800 border-rose-300',
    active: 'bg-rose-600 text-white border-rose-600',
    subjects: ['Ética y Valores', 'Educación Religiosa', 'Filosofía', 'Emprendimiento'],
  },
];

// ─── Tab: Materias ────────────────────────────────────────────────────────────
function SubjectsTab({ toast }) {
  const [subjects,  setSubjects]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [pending,   setPending]   = useState(new Set()); // nombres en proceso
  const [editing,   setEditing]   = useState(null);
  const [editVals,  setEditVals]  = useState({});
  // Formulario materia personalizada
  const [custom,    setCustom]    = useState({ name: '', area: '' });
  const [customErr, setCustomErr] = useState('');
  const [savingCustom, setSavingCustom] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await academicApi.getSubjects();
      setSubjects(res.data.data);
    } catch { toast('Error al cargar materias', 'error'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const normalize = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const findInDb = (name) =>
    subjects.find(d => normalize(d.name) === normalize(name));

  // Activa materia del catálogo
  const handleActivate = async (name, area) => {
    if (pending.has(name)) return;
    setPending(p => new Set([...p, name]));
    try {
      const res = await academicApi.createSubject({ name, area });
      setSubjects(s => [...s, res.data.data].sort((a, b) =>
        (a.area || '').localeCompare(b.area || '') || a.name.localeCompare(b.name)
      ));
      toast(`${name} añadida`);
    } catch (err) {
      toast(err.response?.data?.error || 'Error al añadir materia', 'error');
    } finally {
      setPending(p => { const n = new Set(p); n.delete(name); return n; });
    }
  };

  // Desactiva materia del catálogo
  const handleDeactivate = async (name, id) => {
    if (pending.has(name)) return;
    if (!confirm(`¿Eliminar "${name}"? Las notas ya registradas no se borran.`)) return;
    setPending(p => new Set([...p, name]));
    try {
      await academicApi.deleteSubject(id);
      setSubjects(s => s.filter(x => x.id !== id));
      toast(`${name} eliminada`);
    } catch (err) {
      toast(err.response?.data?.error || 'Error al eliminar', 'error');
    } finally {
      setPending(p => { const n = new Set(p); n.delete(name); return n; });
    }
  };

  // Crea materia personalizada
  const handleCustomCreate = async (e) => {
    e.preventDefault();
    if (!custom.name.trim()) { setCustomErr('El nombre es requerido.'); return; }
    setCustomErr('');
    setSavingCustom(true);
    try {
      const res = await academicApi.createSubject({ name: custom.name.trim(), area: custom.area.trim() || null });
      setSubjects(s => [...s, res.data.data].sort((a, b) =>
        (a.area || '').localeCompare(b.area || '') || a.name.localeCompare(b.name)
      ));
      setCustom({ name: '', area: '' });
      toast('Materia creada');
    } catch (err) {
      setCustomErr(err.response?.data?.error || 'Error al crear materia');
    } finally { setSavingCustom(false); }
  };

  // Editar nombre inline
  const handleUpdate = async (id) => {
    if (!editVals.name?.trim()) return;
    try {
      const res = await academicApi.updateSubject(id, editVals);
      setSubjects(s => s.map(x => x.id === id ? res.data.data : x));
      setEditing(null);
      toast('Materia actualizada');
    } catch (err) { toast(err.response?.data?.error || 'Error', 'error'); }
  };

  // Materias en DB que NO están en el catálogo
  const allCatalogNames = new Set(
    COLOMBIA_SUBJECTS.flatMap(a => a.subjects.map(n => normalize(n)))
  );
  const customSubjects = subjects.filter(s => !allCatalogNames.has(normalize(s.name)));

  if (loading) return <p className="text-sm text-gray-400 py-6 text-center">Cargando…</p>;

  const totalActive = subjects.length;

  return (
    <div className="space-y-6">
      {/* Contador */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <CheckCircle2 size={16} className="text-primary-500" />
        <span><span className="font-medium text-gray-700">{totalActive}</span> materia{totalActive !== 1 ? 's' : ''} activa{totalActive !== 1 ? 's' : ''}</span>
      </div>

      {/* Catálogo por área */}
      {COLOMBIA_SUBJECTS.map(areaGroup => {
        const activeCount = areaGroup.subjects.filter(n => findInDb(n)).length;
        return (
          <div key={areaGroup.area}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${areaGroup.badge}`}>
                {areaGroup.area}
              </span>
              <span className="text-xs text-gray-400">{activeCount}/{areaGroup.subjects.length} activas</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {areaGroup.subjects.map(name => {
                const dbRecord  = findInDb(name);
                const isActive  = !!dbRecord;
                const isLoading = pending.has(name);

                return (
                  <div key={name} className="relative">
                    {isActive ? (
                      /* Activa */
                      editing === dbRecord.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            value={editVals.name}
                            onChange={e => setEditVals(v => ({ ...v, name: e.target.value }))}
                            className="text-xs border border-primary-400 rounded-full px-3 py-1.5 focus:outline-none w-36"
                          />
                          <button onClick={() => handleUpdate(dbRecord.id)} className="p-1 text-green-600"><Check size={13} /></button>
                          <button onClick={() => setEditing(null)} className="p-1 text-gray-400"><X size={13} /></button>
                        </div>
                      ) : (
                        <div className={`flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full border text-xs font-medium group ${areaGroup.active}`}>
                          <CheckCircle2 size={12} className="opacity-80 flex-shrink-0" />
                          <span>{dbRecord.name}</span>
                          <button
                            onClick={() => { setEditing(dbRecord.id); setEditVals({ name: dbRecord.name, area: dbRecord.area }); }}
                            className="w-4 h-4 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 transition-colors ml-0.5"
                            title="Renombrar"
                          >
                            <Pencil size={8} />
                          </button>
                          <button
                            onClick={() => handleDeactivate(name, dbRecord.id)}
                            disabled={isLoading}
                            className="w-4 h-4 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 transition-colors disabled:opacity-50"
                            title="Eliminar"
                          >
                            {isLoading ? <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> : <X size={9} strokeWidth={3} />}
                          </button>
                        </div>
                      )
                    ) : (
                      /* Inactiva */
                      <button
                        onClick={() => handleActivate(name, areaGroup.area)}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-xs text-gray-400 hover:border-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
                      >
                        {isLoading ? <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> : <PlusCircle size={12} />}
                        {name}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Materias personalizadas existentes */}
      {customSubjects.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full border bg-gray-100 text-gray-600 border-gray-300">Personalizadas</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {customSubjects.map(s => (
              editing === s.id ? (
                <div key={s.id} className="flex items-center gap-1">
                  <input autoFocus value={editVals.name}
                    onChange={e => setEditVals(v => ({ ...v, name: e.target.value }))}
                    className="text-xs border border-primary-400 rounded-full px-3 py-1.5 focus:outline-none w-36"
                  />
                  <button onClick={() => handleUpdate(s.id)} className="p-1 text-green-600"><Check size={13} /></button>
                  <button onClick={() => setEditing(null)} className="p-1 text-gray-400"><X size={13} /></button>
                </div>
              ) : (
                <div key={s.id} className="flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full border text-xs font-medium bg-gray-700 text-white border-gray-700">
                  {s.area && <span className="opacity-60 text-xs">[{s.area}]</span>}
                  <span>{s.name}</span>
                  <button onClick={() => { setEditing(s.id); setEditVals({ name: s.name, area: s.area }); }}
                    className="w-4 h-4 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40"><Pencil size={8} /></button>
                  <button onClick={() => handleDeactivate(s.name, s.id)}
                    className="w-4 h-4 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40"><X size={9} strokeWidth={3} /></button>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Formulario materia personalizada */}
      <div className="border-t border-gray-100 pt-4">
        <button
          onClick={() => setShowCustomForm(v => !v)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 transition-colors"
        >
          <PlusCircle size={15} />
          {showCustomForm ? 'Ocultar formulario' : 'Agregar materia personalizada'}
        </button>

        {showCustomForm && (
          <form onSubmit={handleCustomCreate} className="mt-3 flex flex-wrap gap-3 items-end p-3 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Nombre <span className="text-red-400">*</span></label>
              <input
                type="text"
                placeholder="Ej: Emprendimiento"
                value={custom.name}
                onChange={e => { setCustom(c => ({ ...c, name: e.target.value })); setCustomErr(''); }}
                className="text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-44"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Área (opcional)</label>
              <input
                type="text"
                placeholder="Ej: Ciencias Sociales"
                value={custom.area}
                onChange={e => setCustom(c => ({ ...c, area: e.target.value }))}
                className="text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-44"
              />
            </div>
            <button
              type="submit"
              disabled={savingCustom}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              <Plus size={14} />
              {savingCustom ? 'Guardando…' : 'Crear'}
            </button>
            {customErr && <p className="w-full text-xs text-red-600">{customErr}</p>}
          </form>
        )}
      </div>
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
