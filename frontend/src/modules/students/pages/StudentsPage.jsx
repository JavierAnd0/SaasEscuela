import { useState, useEffect, useCallback, useRef } from 'react';
import { Users, UserPlus, Search, GraduationCap, BookOpen, Upload, Download, CheckCircle2, AlertTriangle } from 'lucide-react';
import { studentsApi } from '../api/students.api';
import { academicApi } from '../../academic/api/academic.api';
import apiClient from '../../../shared/api/client';

// ─── Constantes ──────────────────────────────────────────────────────────────

const DOC_TYPES  = ['TI', 'CC', 'RC', 'CE', 'PA', 'PEP'];
const GENDERS    = [{ value: 'M', label: 'Masculino' }, { value: 'F', label: 'Femenino' }, { value: 'O', label: 'Otro' }];
const EMPTY_FORM = {
  firstName: '', lastName: '', documentType: 'TI', documentNumber: '',
  dateOfBirth: '', gender: '', parentName: '', parentEmail: '', parentPhone: '',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Spinner({ small = false }) {
  const s = small ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <svg className={`animate-spin ${s} text-gray-400`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );
}

function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  }, []);
  return [toast, show];
}

// ─── Modal Crear / Editar estudiante ─────────────────────────────────────────

function StudentModal({ student, onClose, onSaved, showToast }) {
  const isEdit = !!student?.id;
  const [form, setForm] = useState(isEdit ? {
    firstName:    student.first_name,
    lastName:     student.last_name,
    documentType: student.document_type  || 'TI',
    documentNumber: student.document_number || '',
    dateOfBirth:  student.date_of_birth  ? student.date_of_birth.slice(0, 10) : '',
    gender:       student.gender         || '',
    parentName:   student.parent_name    || '',
    parentEmail:  student.parent_email   || '',
    parentPhone:  student.parent_phone   || '',
  } : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const validate = () => {
    const e = {};
    if (!form.firstName.trim())    e.firstName    = 'Requerido';
    if (!form.lastName.trim())     e.lastName     = 'Requerido';
    if (!form.documentNumber.trim()) e.documentNumber = 'Requerido';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setErrors(e2); return; }
    setSaving(true);
    try {
      let result;
      if (isEdit) {
        result = await studentsApi.update(student.id, form);
      } else {
        result = await studentsApi.create(form);
      }
      showToast(isEdit ? 'Estudiante actualizado.' : 'Estudiante creado.');
      onSaved(result.data.data);
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al guardar.';
      showToast(msg, 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEdit ? 'Editar Estudiante' : 'Nuevo Estudiante'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Datos personales */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Datos Personales</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombres <span className="text-red-500">*</span></label>
                <input value={form.firstName} onChange={e => set('firstName', e.target.value)}
                  className={`input w-full ${errors.firstName ? 'border-red-400' : ''}`} placeholder="Ej: Carlos Andrés" />
                {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos <span className="text-red-500">*</span></label>
                <input value={form.lastName} onChange={e => set('lastName', e.target.value)}
                  className={`input w-full ${errors.lastName ? 'border-red-400' : ''}`} placeholder="Ej: García Pérez" />
                {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Documento</label>
                <select value={form.documentType} onChange={e => set('documentType', e.target.value)} className="input w-full">
                  {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">N° Documento <span className="text-red-500">*</span></label>
                <input value={form.documentNumber} onChange={e => set('documentNumber', e.target.value)}
                  className={`input w-full ${errors.documentNumber ? 'border-red-400' : ''}`} placeholder="Ej: 1001234567" />
                {errors.documentNumber && <p className="text-xs text-red-500 mt-1">{errors.documentNumber}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
                <input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} className="input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Género</label>
                <select value={form.gender} onChange={e => set('gender', e.target.value)} className="input w-full">
                  <option value="">Sin especificar</option>
                  {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Datos del acudiente */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contacto Acudiente</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Acudiente</label>
                <input value={form.parentName} onChange={e => set('parentName', e.target.value)}
                  className="input w-full" placeholder="Ej: María Torres" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
                <input type="email" value={form.parentEmail} onChange={e => set('parentEmail', e.target.value)}
                  className="input w-full" placeholder="padre@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (WhatsApp)</label>
                <input value={form.parentPhone} onChange={e => set('parentPhone', e.target.value)}
                  className="input w-full" placeholder="+573001234567" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Spinner small /> : null}
              {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear Estudiante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal de Matrícula ───────────────────────────────────────────────────────

function EnrollModal({ student, onClose, onSaved, showToast }) {
  const [classrooms,    setClassrooms]   = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [form, setForm]   = useState({ classroomId: '', academicYearId: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      academicApi.getClassrooms(),
      apiClient.get('/academic-years'),
    ]).then(([crRes, ayRes]) => {
      setClassrooms(crRes.data.data || []);
      setAcademicYears(ayRes.data.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.classroomId || !form.academicYearId) {
      showToast('Selecciona grupo y año académico.', 'error');
      return;
    }
    setSaving(true);
    try {
      await studentsApi.enroll(student.id, form);
      showToast(`${student.first_name} matriculado exitosamente.`);
      onSaved();
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al matricular.', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Matricular Estudiante</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Asignar a <strong>{student.first_name} {student.last_name}</strong> a un grupo.
          </p>
          {loading ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Año Académico</label>
                <select value={form.academicYearId} onChange={e => setForm(f => ({ ...f, academicYearId: e.target.value }))} className="input w-full">
                  <option value="">Seleccionar…</option>
                  {academicYears.map(y => (
                    <option key={y.id} value={y.id}>{y.name}{y.is_active ? ' (activo)' : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grupo</label>
                <select value={form.classroomId} onChange={e => setForm(f => ({ ...f, classroomId: e.target.value }))} className="input w-full">
                  <option value="">Seleccionar…</option>
                  {classrooms.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.grade_level_name} {c.name} — {c.shift}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving || loading} className="btn-primary flex items-center gap-2">
              {saving ? <Spinner small /> : null}
              {saving ? 'Matriculando…' : 'Matricular'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── CSV Template ─────────────────────────────────────────────────────────────

const CSV_TEMPLATE_HEADERS = 'firstName,lastName,documentType,documentNumber,dateOfBirth,gender,parentName,parentEmail,parentPhone';
const CSV_TEMPLATE_EXAMPLE = 'Juan,Pérez,TI,100023456,2010-05-14,M,María Pérez,m.perez@gmail.com,3001234567';

function downloadTemplate() {
  const content  = `${CSV_TEMPLATE_HEADERS}\n${CSV_TEMPLATE_EXAMPLE}\n`;
  const blob     = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url      = URL.createObjectURL(blob);
  const link     = document.createElement('a');
  link.href      = url;
  link.download  = 'plantilla_estudiantes.csv';
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Modal Resultado de Importación ──────────────────────────────────────────

function CsvResultModal({ result, onClose }) {
  if (!result) return null;
  const hasErrors = result.errors?.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Resultado de la importación</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-emerald-50">
              <p className="text-2xl font-extrabold text-emerald-700 tabular-nums">{result.imported}</p>
              <p className="text-xs text-emerald-600 font-medium mt-0.5">Importados</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50">
              <p className="text-2xl font-extrabold text-amber-700 tabular-nums">{result.skipped}</p>
              <p className="text-xs text-amber-600 font-medium mt-0.5">Omitidos</p>
            </div>
            <div className="p-3 rounded-xl bg-red-50">
              <p className="text-2xl font-extrabold text-red-700 tabular-nums">{result.errors?.length ?? 0}</p>
              <p className="text-xs text-red-600 font-medium mt-0.5">Errores</p>
            </div>
          </div>

          {/* Detalle de errores */}
          {hasErrors && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filas con error</p>
              {result.errors.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-red-50 border border-red-100">
                  <AlertTriangle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="text-red-700">
                    <span className="font-medium">Fila {e.row}:</span> {e.reason}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!hasErrors && result.imported > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm">
              <CheckCircle2 size={16} />
              <span>Todos los registros fueron procesados correctamente.</span>
            </div>
          )}

          {result.skipped > 0 && (
            <p className="text-xs text-gray-400">
              Los registros omitidos ya existían en el sistema (mismo número de documento).
            </p>
          )}
        </div>

        <div className="px-6 pb-5 flex justify-end">
          <button onClick={onClose} className="btn-primary">Aceptar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function StudentsPage() {
  const [students,    setStudents]    = useState([]);
  const [classrooms,  setClassrooms]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [filterClassroom, setFilterClassroom] = useState('');
  const [showInactive,    setShowInactive]    = useState(false);
  const [modal,        setModal]        = useState(null); // null | 'create' | {student} | 'enroll:{student}'
  const [enrollTarget, setEnrollTarget] = useState(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult,    setCsvResult]    = useState(null);
  const csvInputRef = useRef(null);
  const [toast, showToast] = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterClassroom) params.classroomId = filterClassroom;
      if (showInactive)    params.includeInactive = '1';

      const [stuRes, crRes] = await Promise.all([
        studentsApi.getAll(params),
        academicApi.getClassrooms(),
      ]);
      setStudents(stuRes.data.data || []);
      setClassrooms(crRes.data.data || []);
    } catch (err) {
      showToast('Error al cargar estudiantes.', 'error');
    } finally { setLoading(false); }
  }, [filterClassroom, showInactive]);

  useEffect(() => { load(); }, [load]);

  const handleToggleActive = async (student) => {
    const action = student.is_active ? 'desactivar' : 'activar';
    if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} a ${student.first_name} ${student.last_name}?`)) return;
    try {
      const res = await studentsApi.toggleActive(student.id);
      setStudents(prev => prev.map(s => s.id === student.id ? res.data.data : s));
      showToast(`Estudiante ${res.data.data.is_active ? 'activado' : 'desactivado'}.`);
    } catch {
      showToast('Error al cambiar estado.', 'error');
    }
  };

  const handleSaved = (savedStudent) => {
    setStudents(prev => {
      const idx = prev.findIndex(s => s.id === savedStudent.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedStudent;
        return next;
      }
      return [savedStudent, ...prev];
    });
    setModal(null);
  };

  const handleCsvFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected after fixing errors
    e.target.value = '';

    const text = await file.text();
    setCsvImporting(true);
    try {
      const res = await studentsApi.importCsv(text);
      setCsvResult(res.data?.data || null);
      if ((res.data?.data?.imported ?? 0) > 0) load(); // refrescar lista
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al importar el CSV.', 'error');
    } finally {
      setCsvImporting(false);
    }
  };

  // Filtro local por búsqueda
  const filtered = students.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.first_name?.toLowerCase().includes(q) ||
      s.last_name?.toLowerCase().includes(q)  ||
      s.document_number?.toLowerCase().includes(q)
    );
  });

  const total   = students.length;
  const active  = students.filter(s => s.is_active).length;

  return (
    <div className="max-w-6xl space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estudiantes</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gestión del padrón estudiantil y matrícula</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Descargar plantilla CSV */}
          <button
            onClick={downloadTemplate}
            className="btn-secondary flex items-center gap-1.5 text-sm"
            title="Descargar plantilla CSV"
          >
            <Download size={14} />
            Plantilla CSV
          </button>

          {/* Importar CSV */}
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleCsvFile}
          />
          <button
            onClick={() => csvInputRef.current?.click()}
            disabled={csvImporting}
            className="btn-secondary flex items-center gap-1.5 text-sm"
            title="Importar estudiantes desde CSV"
          >
            {csvImporting
              ? <Spinner small />
              : <Upload size={14} />}
            {csvImporting ? 'Importando…' : 'Importar CSV'}
          </button>

          {/* Nuevo estudiante */}
          <button onClick={() => setModal('create')} className="btn-primary flex items-center gap-2">
            <UserPlus size={16} />
            Nuevo Estudiante
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`p-3 rounded-lg text-sm border ${
          toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'
        }`}>{toast.msg}</div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Users size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{total}</p>
            <p className="text-xs text-gray-500">Total estudiantes</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <GraduationCap size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{active}</p>
            <p className="text-xs text-gray-500">Activos</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <BookOpen size={20} className="text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{classrooms.length}</p>
            <p className="text-xs text-gray-500">Grupos activos</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o documento…"
            className="input w-full pl-9"
          />
        </div>
        <select
          value={filterClassroom}
          onChange={e => setFilterClassroom(e.target.value)}
          className="input min-w-44"
        >
          <option value="">Todos los grupos</option>
          {classrooms.map(c => (
            <option key={c.id} value={c.id}>{c.grade_level_name} {c.name} — {c.shift}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={e => setShowInactive(e.target.checked)}
            className="rounded border-gray-300"
          />
          Ver inactivos
        </label>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-400 text-sm">
            <Spinner /> Cargando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <GraduationCap size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-600">
              {search ? 'Sin resultados para esa búsqueda' : 'No hay estudiantes registrados'}
            </p>
            {!search && (
              <p className="text-sm mt-1">Haz clic en "Nuevo Estudiante" para agregar el primero.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estudiante</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Documento</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acudiente</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(student => (
                  <tr key={student.id} className={`hover:bg-gray-50 transition-colors ${!student.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {student.first_name?.[0]}{student.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{student.last_name}, {student.first_name}</p>
                          {student.date_of_birth && (
                            <p className="text-xs text-gray-400">
                              Nac. {new Date(student.date_of_birth).toLocaleDateString('es-CO')}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="text-xs bg-gray-100 rounded px-1.5 py-0.5 mr-1">{student.document_type}</span>
                      {student.document_number}
                    </td>
                    <td className="px-4 py-3">
                      {student.parent_name ? (
                        <div>
                          <p className="text-gray-700 text-xs">{student.parent_name}</p>
                          {student.parent_phone && <p className="text-gray-400 text-xs">{student.parent_phone}</p>}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {student.is_active
                        ? <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Activo</span>
                        : <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Inactivo</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setEnrollTarget(student); }}
                          className="text-xs px-2 py-1 rounded border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Matricular en grupo"
                        >
                          Matricular
                        </button>
                        <button
                          onClick={() => setModal(student)}
                          className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleActive(student)}
                          className={`text-xs px-2 py-1 rounded border transition-colors ${
                            student.is_active
                              ? 'border-red-200 text-red-500 hover:bg-red-50'
                              : 'border-green-200 text-green-600 hover:bg-green-50'
                          }`}
                        >
                          {student.is_active ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-gray-50 text-xs text-gray-400">
              {filtered.length} estudiante{filtered.length !== 1 ? 's' : ''} mostrado{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>

      {/* Modal crear / editar */}
      {(modal === 'create' || (modal && modal.id)) && (
        <StudentModal
          student={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
          showToast={showToast}
        />
      )}

      {/* Modal matricular */}
      {enrollTarget && (
        <EnrollModal
          student={enrollTarget}
          onClose={() => setEnrollTarget(null)}
          onSaved={() => { setEnrollTarget(null); showToast('Matrícula guardada.'); }}
          showToast={showToast}
        />
      )}

      {/* Modal resultado importación CSV */}
      {csvResult && (
        <CsvResultModal result={csvResult} onClose={() => setCsvResult(null)} />
      )}
    </div>
  );
}
