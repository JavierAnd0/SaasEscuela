import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, UserPlus, GraduationCap, BookOpen,
  Upload, Download, CheckCircle2, AlertTriangle, FileDown,
  ArrowLeft, ChevronRight,
} from 'lucide-react';
import { studentsApi } from '../api/students.api';
import { academicApi } from '../../academic/api/academic.api';
import apiClient from '../../../shared/api/client';
import DataTable from '../../../shared/components/DataTable';
import Modal    from '../../../shared/components/Modal';
import { useToast, Toast } from '../../../shared/hooks/useToast';
import { downloadExcel } from '../../../shared/utils/exportBlob';

// ─── Constantes ───────────────────────────────────────────────────────────────

const DOC_TYPES = ['TI', 'CC', 'RC', 'CE', 'PA', 'PEP'];
const GENDERS   = [{ value: 'M', label: 'Masculino' }, { value: 'F', label: 'Femenino' }, { value: 'O', label: 'Otro' }];
const PAGE_SIZE = 50;

const EMPTY_FORM = {
  firstName: '', lastName: '', documentType: 'TI', documentNumber: '',
  dateOfBirth: '', gender: '', parentName: '', parentEmail: '',
  parentPhone: '', parentDocumentNumber: '',
};

// ─── Spinner (local) ──────────────────────────────────────────────────────────

function Spinner({ small = false }) {
  const s = small ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <svg className={`animate-spin ${s}`} viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-muted)' }}>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );
}

// ─── Columnas del DataTable ───────────────────────────────────────────────────

function buildColumns({ setModal, setEnrollTarget, handleToggleActive }) {
  return [
    {
      key:   'first_name',
      label: 'Estudiante',
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: 'rgba(102,108,255,0.12)', color: 'var(--color-primary)' }}
          >
            {row.first_name?.[0]}{row.last_name?.[0]}
          </div>
          <div>
            <p className="font-medium text-sm" style={{ color: 'var(--color-base)' }}>
              {row.last_name}, {row.first_name}
            </p>
            {row.date_of_birth && (
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                Nac. {new Date(row.date_of_birth).toLocaleDateString('es-CO')}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key:   'document_number',
      label: 'Documento',
      sortable: true,
      render: (val, row) => (
        <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
          <span className="text-xs px-1.5 py-0.5 rounded mr-1" style={{ backgroundColor: 'var(--color-body-bg)' }}>
            {row.document_type}
          </span>
          {val}
        </span>
      ),
    },
    {
      key:   'parent_name',
      label: 'Acudiente',
      render: (val, row) => val ? (
        <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
          <p className="font-medium" style={{ color: 'var(--color-base)' }}>{val}</p>
          {row.parent_document_number && <p>CC: {row.parent_document_number}</p>}
          {row.parent_phone && <p>{row.parent_phone}</p>}
        </div>
      ) : null,
    },
    {
      key:   'is_active',
      label: 'Estado',
      width: '100px',
      render: (val) => val
        ? <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Activo</span>
        : <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Inactivo</span>,
    },
    {
      key:   '_actions',
      label: 'Acciones',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button className="btn-action-primary" onClick={() => setEnrollTarget(row)}>Matricular</button>
          <button className="btn-action-edit"    onClick={() => setModal(row)}>Editar</button>
          <button
            className={row.is_active ? 'btn-action-danger' : 'btn-action-success'}
            onClick={() => handleToggleActive(row)}
          >
            {row.is_active ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      ),
    },
  ];
}

// ─── Modal Crear / Editar ─────────────────────────────────────────────────────

function StudentModal({ student, onClose, onSaved, showToast }) {
  const isEdit = !!student?.id;
  const [form, setForm] = useState(isEdit ? {
    firstName:            student.first_name,
    lastName:             student.last_name,
    documentType:         student.document_type         || 'TI',
    documentNumber:       student.document_number       || '',
    dateOfBirth:          student.date_of_birth ? student.date_of_birth.slice(0, 10) : '',
    gender:               student.gender                || '',
    parentName:           student.parent_name           || '',
    parentEmail:          student.parent_email          || '',
    parentPhone:          student.parent_phone          || '',
    parentDocumentNumber: student.parent_document_number || '',
  } : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const validate = () => {
    const e = {};
    if (!form.firstName.trim())      e.firstName      = 'Requerido';
    if (!form.lastName.trim())       e.lastName       = 'Requerido';
    if (!form.documentNumber.trim()) e.documentNumber = 'Requerido';
    if (form.parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.parentEmail)) {
      e.parentEmail = 'Email inválido';
    }
    if (
      form.parentDocumentNumber?.trim() &&
      form.documentNumber?.trim() &&
      form.parentDocumentNumber.trim() === form.documentNumber.trim()
    ) {
      e.parentDocumentNumber = 'No puede ser igual al documento del estudiante';
    }
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = {
        firstName:            form.firstName.trim(),
        lastName:             form.lastName.trim(),
        documentType:         form.documentType,
        documentNumber:       form.documentNumber.trim(),
        dateOfBirth:          form.dateOfBirth  || null,
        gender:               form.gender       || null,
        parentName:           form.parentName   || null,
        parentEmail:          form.parentEmail  || null,
        parentPhone:          form.parentPhone  || null,
        parentDocumentNumber: form.parentDocumentNumber || null,
      };
      const result = isEdit
        ? await studentsApi.update(student.id, payload)
        : await studentsApi.create(payload);
      showToast(isEdit ? 'Estudiante actualizado.' : 'Estudiante creado.');
      onSaved(result.data.data);
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al guardar.', 'error');
    } finally { setSaving(false); }
  };

  const Field = ({ label, error, children }) => (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-base)' }}>
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );

  return (
    <form id="student-form" onSubmit={handleSubmit} className="space-y-6">
      {/* Datos personales */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-muted)' }}>
          Datos Personales
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={<>Nombres <span className="text-red-500">*</span></>} error={errors.firstName}>
            <input value={form.firstName} onChange={(e) => set('firstName', e.target.value)}
              className={`input w-full ${errors.firstName ? 'border-red-400' : ''}`} placeholder="Ej: Carlos Andrés" />
          </Field>
          <Field label={<>Apellidos <span className="text-red-500">*</span></>} error={errors.lastName}>
            <input value={form.lastName} onChange={(e) => set('lastName', e.target.value)}
              className={`input w-full ${errors.lastName ? 'border-red-400' : ''}`} placeholder="Ej: García Pérez" />
          </Field>
          <Field label="Tipo Documento">
            <select value={form.documentType} onChange={(e) => set('documentType', e.target.value)} className="input w-full">
              {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label={<>N° Documento <span className="text-red-500">*</span></>} error={errors.documentNumber}>
            <input value={form.documentNumber} onChange={(e) => set('documentNumber', e.target.value)}
              className={`input w-full ${errors.documentNumber ? 'border-red-400' : ''}`} placeholder="Ej: 1001234567" />
          </Field>
          <Field label="Fecha de Nacimiento">
            <input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} className="input w-full" />
          </Field>
          <Field label="Género">
            <select value={form.gender} onChange={(e) => set('gender', e.target.value)} className="input w-full">
              <option value="">Sin especificar</option>
              {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </Field>
        </div>
      </div>

      {/* Acudiente */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-muted)' }}>
          Contacto Acudiente
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre del Acudiente">
            <input value={form.parentName} onChange={(e) => set('parentName', e.target.value)}
              className="input w-full" placeholder="Ej: María Torres" />
          </Field>
          <Field label={<>CC del Acudiente <span className="text-xs font-normal" style={{ color: 'var(--color-muted)' }}>(para portal)</span></>}>
            <input value={form.parentDocumentNumber} onChange={(e) => set('parentDocumentNumber', e.target.value)}
              className="input w-full" placeholder="Ej: 43567890" />
          </Field>
          <Field label="Correo" error={errors.parentEmail}>
            <input type="email" value={form.parentEmail} onChange={(e) => set('parentEmail', e.target.value)}
              className={`input w-full ${errors.parentEmail ? 'border-red-400' : ''}`} placeholder="padre@email.com" />
          </Field>
          <Field label="Teléfono (WhatsApp)">
            <input value={form.parentPhone} onChange={(e) => set('parentPhone', e.target.value)}
              className="input w-full" placeholder="+573001234567" />
          </Field>
        </div>
      </div>
    </form>
  );
}

// ─── Modal de Matrícula ───────────────────────────────────────────────────────

function EnrollModal({ student, onClose, onSaved, showToast }) {
  const [classrooms,    setClassrooms]    = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [form,    setForm]    = useState({ classroomId: '', academicYearId: '' });
  const [saving,  setSaving]  = useState(false);
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
    <form id="enroll-form" onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
        Asignar a <strong style={{ color: 'var(--color-base)' }}>{student.first_name} {student.last_name}</strong> a un grupo.
      </p>
      {loading ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-base)' }}>Año Académico</label>
            <select value={form.academicYearId} onChange={(e) => setForm((f) => ({ ...f, academicYearId: e.target.value }))} className="input w-full">
              <option value="">Seleccionar…</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>{y.name}{y.is_active ? ' (activo)' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-base)' }}>Grupo</label>
            <select value={form.classroomId} onChange={(e) => setForm((f) => ({ ...f, classroomId: e.target.value }))} className="input w-full">
              <option value="">Seleccionar…</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.grade_level_name} {c.name} — {c.shift}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
    </form>
  );
}

// ─── CSV Template ─────────────────────────────────────────────────────────────

const CSV_HEADERS = 'firstName,lastName,documentType,documentNumber,dateOfBirth,gender,parentName,parentDocumentNumber,parentEmail,parentPhone';
const CSV_EXAMPLE = 'Juan,Pérez,TI,100023456,2010-05-14,M,María Pérez,43567890,m.perez@gmail.com,3001234567';

function downloadTemplate() {
  const blob = new Blob([`${CSV_HEADERS}\n${CSV_EXAMPLE}\n`], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = 'plantilla_estudiantes.csv'; link.click();
  URL.revokeObjectURL(url);
}

// ─── Modal Resultado CSV ──────────────────────────────────────────────────────

function CsvResultModal({ result, onClose }) {
  if (!result) return null;
  const hasErrors = result.errors?.length > 0;

  return (
    <Modal isOpen={!!result} onClose={onClose} title="Resultado de la importación" size="sm"
      footer={<button onClick={onClose} className="btn-primary">Aceptar</button>}
    >
      <div className="space-y-4">
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

        {hasErrors && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
              Filas con error
            </p>
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
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            Los registros omitidos ya existían en el sistema (mismo tipo y número de documento).
          </p>
        )}
      </div>
    </Modal>
  );
}

// ─── Tarjeta de Grupo ─────────────────────────────────────────────────────────

const SHIFT_LABELS = { morning: 'Mañana', afternoon: 'Tarde', evening: 'Noche' };

function ClassroomCard({ classroom, onSelect }) {
  return (
    <button
      onClick={() => onSelect(classroom)}
      className="card p-5 text-left w-full hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgba(102,108,255,0.12)' }}
          >
            <BookOpen size={20} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--color-base)' }}>
              {classroom.grade_level_name} {classroom.name}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
              {SHIFT_LABELS[classroom.shift] || classroom.shift}
              {classroom.max_students ? ` · Cupo: ${classroom.max_students}` : ''}
            </p>
          </div>
        </div>
        <ChevronRight
          size={18}
          className="flex-shrink-0 mt-0.5 opacity-40 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--color-primary)' }}
        />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: 'rgba(102,108,255,0.1)', color: 'var(--color-primary)' }}
        >
          Ver estudiantes
        </span>
      </div>
    </button>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function StudentsPage() {
  // Vista overview
  const [classrooms,        setClassrooms]        = useState([]);
  const [classroomsLoading, setClassroomsLoading] = useState(true);
  const [selectedClassroom, setSelectedClassroom] = useState(null); // null = overview

  // Vista detalle (por grupo)
  const [students,          setStudents]          = useState([]);
  const [meta,              setMeta]              = useState(null);
  const [loading,           setLoading]           = useState(false);
  const [search,            setSearch]            = useState('');
  const [debouncedSearch,   setDebouncedSearch]   = useState('');
  const [showInactive,      setShowInactive]      = useState(false);
  const [page,              setPage]              = useState(1);

  // Modales y acciones
  const [modal,          setModal]          = useState(null);   // null | 'create' | student object
  const [enrollTarget,   setEnrollTarget]   = useState(null);
  const [savingForm,     setSavingForm]     = useState(false);
  const [csvImporting,   setCsvImporting]   = useState(false);
  const [csvResult,      setCsvResult]      = useState(null);
  const [exporting,      setExporting]      = useState(false);
  const csvInputRef  = useRef(null);
  const searchTimer  = useRef(null);
  const [toast, showToast, dismissToast] = useToast();

  // ── Carga grupos al montar ─────────────────────────────────────────────────
  useEffect(() => {
    academicApi.getClassrooms()
      .then((res) => setClassrooms(res.data.data || []))
      .catch(() => showToast('Error al cargar grupos.', 'error'))
      .finally(() => setClassroomsLoading(false));
  }, []);

  // ── Carga estudiantes cuando se selecciona un grupo ────────────────────────
  const load = useCallback(async () => {
    if (!selectedClassroom) return;
    setLoading(true);
    try {
      const params = { page, limit: PAGE_SIZE, classroomId: selectedClassroom.id };
      if (showInactive)    params.includeInactive = '1';
      if (debouncedSearch) params.search          = debouncedSearch;
      const res = await studentsApi.getAll(params);
      setStudents(res.data.data || []);
      setMeta(res.data.meta    || null);
    } catch {
      showToast('Error al cargar estudiantes.', 'error');
    } finally { setLoading(false); }
  }, [selectedClassroom, page, showInactive, debouncedSearch]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [showInactive]);

  // ── Navegación entre vistas ────────────────────────────────────────────────
  const handleSelectClassroom = (classroom) => {
    setSelectedClassroom(classroom);
    setStudents([]);
    setMeta(null);
    setPage(1);
    setSearch('');
    setDebouncedSearch('');
    setShowInactive(false);
  };

  const handleBack = () => {
    setSelectedClassroom(null);
    setStudents([]);
    setMeta(null);
  };

  // ── Debounce búsqueda ──────────────────────────────────────────────────────
  const handleSearchChange = (value) => {
    setSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 350);
  };

  // ── Acciones de estudiantes ────────────────────────────────────────────────
  const handleToggleActive = async (student) => {
    const action = student.is_active ? 'desactivar' : 'activar';
    if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} a ${student.first_name} ${student.last_name}?`)) return;
    try {
      const res = await studentsApi.toggleActive(student.id);
      setStudents((prev) => prev.map((s) => s.id === student.id ? res.data.data : s));
      showToast(`Estudiante ${res.data.data.is_active ? 'activado' : 'desactivado'}.`);
    } catch {
      showToast('Error al cambiar estado.', 'error');
    }
  };

  const handleSaved = (savedStudent) => {
    setStudents((prev) => {
      const idx = prev.findIndex((s) => s.id === savedStudent.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = savedStudent; return next; }
      return [savedStudent, ...prev];
    });
    setModal(null);
    if (!savedStudent._edit) setMeta((m) => m ? { ...m, total: m.total + 1 } : m);
  };

  const handleCsvFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const text = await file.text();
    setCsvImporting(true);
    try {
      const res = await studentsApi.importCsv(text);
      setCsvResult(res.data?.data || null);
      if ((res.data?.data?.imported ?? 0) > 0) { setPage(1); load(); }
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al importar el CSV.', 'error');
    } finally { setCsvImporting(false); }
  };

  const handleExportStudents = async () => {
    setExporting(true);
    try {
      const params = { classroomId: selectedClassroom.id };
      if (showInactive)    params.includeInactive = 'true';
      if (debouncedSearch) params.search          = debouncedSearch;
      const name = `estudiantes_${selectedClassroom.name.replace(/\s+/g, '_')}_${Date.now()}.xlsx`;
      await downloadExcel('/export/students', params, name);
    } catch {
      showToast('Error al exportar el Excel.', 'error');
    } finally { setExporting(false); }
  };

  const submitStudentForm = () => {
    document.getElementById('student-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  };

  const submitEnrollForm = () => {
    document.getElementById('enroll-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  };

  const columns = buildColumns({ setModal, setEnrollTarget, handleToggleActive });
  const isEdit  = modal && modal !== 'create';

  // Input de archivo — siempre montado para que el ref sea estable
  const csvFileInput = (
    <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvFile} />
  );

  // ══════════════════════════════════════════════════════════════════════════
  // VISTA OVERVIEW — cuadrícula de grupos
  // ══════════════════════════════════════════════════════════════════════════
  if (!selectedClassroom) {
    return (
      <div className="max-w-6xl space-y-6">

        {/* Encabezado */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Estudiantes</h1>
            <p className="page-subtitle">Selecciona un grupo para ver y gestionar sus estudiantes</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={downloadTemplate} className="btn-secondary text-sm" title="Descargar plantilla CSV">
              <Download size={14} /> Plantilla CSV
            </button>
            {csvFileInput}
            <button onClick={() => csvInputRef.current?.click()} disabled={csvImporting} className="btn-secondary text-sm">
              {csvImporting ? <Spinner small /> : <Upload size={14} />}
              {csvImporting ? 'Importando…' : 'Importar CSV'}
            </button>
            <button onClick={() => setModal('create')} className="btn-primary">
              <UserPlus size={16} /> Nuevo Estudiante
            </button>
          </div>
        </div>

        <Toast toast={toast} onDismiss={dismissToast} />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="kpi-card">
            <div className="kpi-icon bg-blue-100">
              <Users size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="kpi-value">{classrooms.length}</p>
              <p className="kpi-label">Grupos activos</p>
            </div>
          </div>
          <div className="kpi-card col-span-2 sm:col-span-2">
            <div className="kpi-icon bg-purple-100">
              <GraduationCap size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="kpi-value text-base font-medium" style={{ color: 'var(--color-muted)' }}>
                Selecciona un grupo para ver sus estudiantes
              </p>
              <p className="kpi-label">Carga paginada por grupo</p>
            </div>
          </div>
        </div>

        {/* Cuadrícula de grupos */}
        {classroomsLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm" style={{ color: 'var(--color-muted)' }}>
            <Spinner /> Cargando grupos…
          </div>
        ) : classrooms.length === 0 ? (
          <div className="card p-12 text-center">
            <BookOpen size={40} className="mx-auto mb-3 opacity-25" />
            <p className="font-medium" style={{ color: 'var(--color-base)' }}>No hay grupos creados</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
              Crea grupos en la sección Académico antes de gestionar estudiantes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classrooms.map((c) => (
              <ClassroomCard key={c.id} classroom={c} onSelect={handleSelectClassroom} />
            ))}
          </div>
        )}

        {/* Modales */}
        <Modal
          isOpen={modal === 'create' || isEdit}
          onClose={() => setModal(null)}
          title={isEdit ? 'Editar Estudiante' : 'Nuevo Estudiante'}
          size="lg"
          footer={
            <>
              <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
              <button type="button" onClick={submitStudentForm} disabled={savingForm} className="btn-primary">
                {savingForm ? <><Spinner small /> Guardando…</> : isEdit ? 'Guardar cambios' : 'Crear Estudiante'}
              </button>
            </>
          }
        >
          {(modal === 'create' || isEdit) && (
            <StudentModal
              student={isEdit ? modal : null}
              onClose={() => setModal(null)}
              onSaved={handleSaved}
              showToast={showToast}
            />
          )}
        </Modal>

        <Modal
          isOpen={!!enrollTarget}
          onClose={() => setEnrollTarget(null)}
          title="Matricular Estudiante"
          size="sm"
          footer={
            <>
              <button type="button" onClick={() => setEnrollTarget(null)} className="btn-secondary">Cancelar</button>
              <button type="button" onClick={submitEnrollForm} className="btn-primary">Matricular</button>
            </>
          }
        >
          {enrollTarget && (
            <EnrollModal
              student={enrollTarget}
              onClose={() => setEnrollTarget(null)}
              onSaved={() => { setEnrollTarget(null); showToast('Matrícula guardada.'); }}
              showToast={showToast}
            />
          )}
        </Modal>

        <CsvResultModal result={csvResult} onClose={() => setCsvResult(null)} />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VISTA DETALLE — estudiantes de un grupo
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-6xl space-y-6">

      {/* Encabezado */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            title="Volver a grupos"
          >
            <ArrowLeft size={20} style={{ color: 'var(--color-muted)' }} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: 'var(--color-muted)' }}>Estudiantes</span>
              <ChevronRight size={14} style={{ color: 'var(--color-muted)' }} />
              <h1 className="page-title">
                {selectedClassroom.grade_level_name} {selectedClassroom.name}
              </h1>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium ml-1"
                style={{ backgroundColor: 'rgba(102,108,255,0.1)', color: 'var(--color-primary)' }}
              >
                {SHIFT_LABELS[selectedClassroom.shift] || selectedClassroom.shift}
              </span>
            </div>
            <p className="page-subtitle">
              {meta?.total != null ? `${meta.total} estudiante${meta.total !== 1 ? 's' : ''}` : 'Cargando…'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportStudents}
            disabled={exporting || students.length === 0}
            className="btn-secondary text-sm"
            title="Exportar grupo a Excel"
          >
            {exporting ? <Spinner small /> : <FileDown size={14} />}
            {exporting ? 'Exportando…' : 'Excel'}
          </button>
          <button onClick={downloadTemplate} className="btn-secondary text-sm" title="Descargar plantilla CSV">
            <Download size={14} /> Plantilla CSV
          </button>
          {csvFileInput}
          <button onClick={() => csvInputRef.current?.click()} disabled={csvImporting} className="btn-secondary text-sm">
            {csvImporting ? <Spinner small /> : <Upload size={14} />}
            {csvImporting ? 'Importando…' : 'Importar CSV'}
          </button>
          <button onClick={() => setModal('create')} className="btn-primary">
            <UserPlus size={16} /> Nuevo Estudiante
          </button>
        </div>
      </div>

      <Toast toast={toast} onDismiss={dismissToast} />

      {/* Filtros inline */}
      <div className="flex flex-wrap gap-3 items-center">
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none" style={{ color: 'var(--color-muted)' }}>
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300"
          />
          Ver inactivos
        </label>
      </div>

      {/* Tabla */}
      <DataTable
        columns={columns}
        data={students}
        loading={loading}
        emptyIcon={<GraduationCap size={40} />}
        emptyMessage={debouncedSearch ? 'Sin resultados para esa búsqueda' : 'No hay estudiantes en este grupo'}
        emptySubMessage={!debouncedSearch ? 'Usa "Nuevo Estudiante" o importa un CSV para agregar.' : undefined}
        searchValue={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Buscar por nombre o documento…"
        pagination={{ meta, onPageChange: setPage }}
        rowClassName={(row) => !row.is_active ? 'opacity-50' : ''}
      />

      {/* Modal Crear / Editar */}
      <Modal
        isOpen={modal === 'create' || isEdit}
        onClose={() => setModal(null)}
        title={isEdit ? 'Editar Estudiante' : 'Nuevo Estudiante'}
        size="lg"
        footer={
          <>
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
            <button type="button" onClick={submitStudentForm} disabled={savingForm} className="btn-primary">
              {savingForm ? <><Spinner small /> Guardando…</> : isEdit ? 'Guardar cambios' : 'Crear Estudiante'}
            </button>
          </>
        }
      >
        {(modal === 'create' || isEdit) && (
          <StudentModal
            student={isEdit ? modal : null}
            onClose={() => setModal(null)}
            onSaved={handleSaved}
            showToast={showToast}
          />
        )}
      </Modal>

      {/* Modal Matrícula */}
      <Modal
        isOpen={!!enrollTarget}
        onClose={() => setEnrollTarget(null)}
        title="Matricular Estudiante"
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setEnrollTarget(null)} className="btn-secondary">Cancelar</button>
            <button type="button" onClick={submitEnrollForm} className="btn-primary">Matricular</button>
          </>
        }
      >
        {enrollTarget && (
          <EnrollModal
            student={enrollTarget}
            onClose={() => setEnrollTarget(null)}
            onSaved={() => { setEnrollTarget(null); showToast('Matrícula guardada.'); }}
            showToast={showToast}
          />
        )}
      </Modal>

      {/* Modal Resultado CSV */}
      <CsvResultModal result={csvResult} onClose={() => setCsvResult(null)} />
    </div>
  );
}
