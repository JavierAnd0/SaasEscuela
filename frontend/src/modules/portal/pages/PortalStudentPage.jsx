import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, Calendar, FileText,
  TrendingUp, TrendingDown, Minus, ExternalLink, AlertCircle,
} from 'lucide-react';
import portalApi from '../api/portal.api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GRADE_LEVEL = { superior: { min: 4.0, label: 'Superior', color: 'text-green-700 bg-green-50' },
                      alto:     { min: 3.5, label: 'Alto',     color: 'text-blue-700  bg-blue-50'  },
                      basico:   { min: 3.0, label: 'Básico',   color: 'text-amber-700 bg-amber-50' },
                      bajo:     { min: 0,   label: 'Bajo',     color: 'text-red-700   bg-red-50'   } };

function gradeLevel(v) {
  if (!v) return null;
  if (v >= 4.0) return GRADE_LEVEL.superior;
  if (v >= 3.5) return GRADE_LEVEL.alto;
  if (v >= 3.0) return GRADE_LEVEL.basico;
  return GRADE_LEVEL.bajo;
}

function GradeBar({ value }) {
  const pct   = Math.min(100, ((value - 1) / 4) * 100);
  const level = gradeLevel(value);
  const bar   = value >= 4 ? 'bg-green-500' : value >= 3 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${level?.color}`}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

function AttendanceIcon({ rate }) {
  if (rate >= 90) return <TrendingUp size={16} className="text-green-600" />;
  if (rate >= 75) return <Minus       size={16} className="text-amber-600" />;
  return                 <TrendingDown size={16} className="text-red-600" />;
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'grades',      label: 'Notas',      Icon: BookOpen  },
  { id: 'attendance',  label: 'Asistencia', Icon: Calendar  },
  { id: 'reportcards', label: 'Boletines',  Icon: FileText  },
];

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PortalStudentPage() {
  const { studentId } = useParams();
  const navigate      = useNavigate();

  const [activeTab,   setActiveTab]   = useState('grades');
  const [periods,     setPeriods]     = useState([]);
  const [selectedPeriod, setSelected] = useState('');
  const [summary,     setSummary]     = useState(null);
  const [reportCards, setReportCards] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingSum,  setLoadingSum]  = useState(false);
  const [error,       setError]       = useState('');

  // Carga períodos al montar
  useEffect(() => {
    async function init() {
      try {
        const { data: res } = await portalApi.getPeriods(studentId);
        const ps = res.data || [];
        setPeriods(ps);
        // Preseleccionar el primer período abierto, o el último si todos están cerrados
        const open = ps.find(p => !p.is_closed) || ps[ps.length - 1];
        if (open) setSelected(open.id);
      } catch {
        setError('No se pudo cargar la información del estudiante.');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [studentId]);

  // Carga resumen cuando cambia el período o el tab de boletines
  const loadSummary = useCallback(async (periodId) => {
    if (!periodId) return;
    setLoadingSum(true);
    try {
      const { data: res } = await portalApi.getSummary(studentId, periodId);
      setSummary(res.data);
    } catch {
      setError('No se pudo cargar el resumen del período.');
    } finally {
      setLoadingSum(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (selectedPeriod) loadSummary(selectedPeriod);
  }, [selectedPeriod, loadSummary]);

  // Carga boletines cuando se abre ese tab
  useEffect(() => {
    if (activeTab !== 'reportcards') return;
    portalApi.getReportCards(studentId)
      .then(({ data: res }) => setReportCards(res.data || []))
      .catch(() => setError('No se pudo cargar los boletines.'));
  }, [activeTab, studentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <svg className="animate-spin h-8 w-8 text-emerald-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
      </div>
    );
  }

  const student = summary?.student;

  return (
    <div>
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/portal/home')}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {student ? `${student.first_name} ${student.last_name}` : 'Detalle del estudiante'}
          </h1>
          <p className="text-gray-500 text-sm">Seguimiento académico</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* ─── Selector de período ─────────────────────────────────────────────── */}
      {activeTab !== 'reportcards' && periods.length > 0 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {periods.map(p => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedPeriod === p.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.name}
              {p.is_closed && <span className="ml-1 opacity-60 text-xs">(cerrado)</span>}
            </button>
          ))}
        </div>
      )}

      {/* ─── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-0">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Tab: Notas ──────────────────────────────────────────────────────── */}
      {activeTab === 'grades' && (
        <div>
          {loadingSum ? (
            <div className="flex justify-center py-12">
              <svg className="animate-spin h-6 w-6 text-emerald-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            </div>
          ) : !summary?.grades?.length ? (
            <div className="text-center py-12 text-gray-400">
              <BookOpen size={36} className="mx-auto mb-2 text-gray-300" />
              <p>No hay notas registradas en este período.</p>
            </div>
          ) : (
            <>
              {/* Promedio del período */}
              {summary.grade_average != null && (
                <div className="card p-4 mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Promedio del período</p>
                    <p className={`text-3xl font-bold mt-0.5 ${
                      summary.grade_average >= 3 ? 'text-gray-900' : 'text-red-600'
                    }`}>
                      {summary.grade_average.toFixed(1)}
                    </p>
                  </div>
                  {(() => {
                    const lvl = gradeLevel(summary.grade_average);
                    return lvl ? (
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${lvl.color}`}>
                        {lvl.label}
                      </span>
                    ) : null;
                  })()}
                </div>
              )}

              {/* Tabla de notas */}
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Materia</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 w-40">Nota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.grades.map((g, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{g.subject_name}</p>
                          {g.subject_area && (
                            <p className="text-xs text-gray-400 mt-0.5">{g.subject_area}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 w-40">
                          <GradeBar value={parseFloat(g.grade_value)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── Tab: Asistencia ─────────────────────────────────────────────────── */}
      {activeTab === 'attendance' && (
        <div>
          {loadingSum ? (
            <div className="flex justify-center py-12">
              <svg className="animate-spin h-6 w-6 text-emerald-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            </div>
          ) : !summary?.attendance ? (
            <div className="text-center py-12 text-gray-400">
              <Calendar size={36} className="mx-auto mb-2 text-gray-300" />
              <p>No hay registros de asistencia en este período.</p>
            </div>
          ) : (() => {
            const a   = summary.attendance;
            const rate = parseFloat(a.attendance_rate || 0);
            const riskColor = rate >= 90 ? 'text-green-600' : rate >= 75 ? 'text-amber-600' : 'text-red-600';
            const riskBg    = rate >= 90 ? 'bg-green-50'   : rate >= 75 ? 'bg-amber-50'    : 'bg-red-50';
            const riskBorder = rate >= 90 ? 'border-green-200' : rate >= 75 ? 'border-amber-200' : 'border-red-200';

            return (
              <>
                {/* Card principal */}
                <div className={`card p-5 mb-4 border ${riskBorder} ${riskBg}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm text-gray-500">Tasa de asistencia</p>
                      <div className="flex items-center gap-2 mt-1">
                        <AttendanceIcon rate={rate} />
                        <span className={`text-3xl font-bold ${riskColor}`}>
                          {rate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p className="font-medium text-gray-700">{a.present_count} / {a.total_days}</p>
                      <p>días asistidos</p>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        rate >= 90 ? 'bg-green-500' : rate >= 75 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>

                {/* Desglose */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Presentes',        value: a.present_count,           color: 'text-green-700', bg: 'bg-green-50'  },
                    { label: 'Ausencias justif.', value: a.absent_justified_count,  color: 'text-amber-700', bg: 'bg-amber-50'  },
                    { label: 'Ausencias injustif.',value: a.absent_unjustified_count,color: 'text-red-700',  bg: 'bg-red-50'    },
                    { label: 'Tardanzas',          value: a.late_count,             color: 'text-purple-700',bg: 'bg-purple-50' },
                    { label: 'Total días',         value: a.total_days,             color: 'text-gray-700',  bg: 'bg-gray-50'   },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} className={`card p-3 ${bg}`}>
                      <p className={`text-xl font-bold ${color}`}>{value ?? 0}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                {rate < 80 && (
                  <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-sm">
                    <AlertCircle size={16} className="shrink-0" />
                    La asistencia está por debajo del 80%. Comuníquese con el colegio.
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ─── Tab: Boletines ──────────────────────────────────────────────────── */}
      {activeTab === 'reportcards' && (
        <div>
          {reportCards.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText size={36} className="mx-auto mb-2 text-gray-300" />
              <p>No hay boletines generados aún.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reportCards.map(rc => {
                const expired = rc.access_token_expires_at && new Date(rc.access_token_expires_at) < new Date();
                return (
                  <div key={rc.id} className="card p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {rc.period_name} — {rc.academic_year_name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Generado: {new Date(rc.pdf_generated_at).toLocaleDateString('es-CO')}
                        {expired && <span className="ml-2 text-red-500">· Enlace vencido</span>}
                      </p>
                    </div>
                    {!expired && (
                      <a
                        href={`/p/${rc.access_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm font-medium text-emerald-700
                                   hover:text-emerald-900 hover:underline"
                      >
                        Ver PDF
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
