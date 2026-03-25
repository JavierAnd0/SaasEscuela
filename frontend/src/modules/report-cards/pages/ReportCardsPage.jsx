import { useState, useEffect } from 'react';
import { Check, X, Clock, FileText, Download, Link } from 'lucide-react';
import apiClient from '../../../shared/api/client';
import { reportCardsApi } from '../api/report-cards.api';

function Spinner({ small = false }) {
  const size = small ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <svg className={`animate-spin ${size}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function StatusBadge({ status }) {
  const s = (status || '').toLowerCase();
  if (s === 'generated' || s === 'generado') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
        <Check size={11} /> Generado
      </span>
    );
  }
  if (s === 'error') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full">
        <X size={11} /> Error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
      <Clock size={11} /> Pendiente
    </span>
  );
}

export default function ReportCardsPage() {
  const [classrooms,    setClassrooms]    = useState([]);
  const [periods,       setPeriods]       = useState([]);
  const [classroomId,   setClassroomId]   = useState('');
  const [periodId,      setPeriodId]      = useState('');

  const [reportCards,   setReportCards]   = useState([]);
  const [loadingData,   setLoadingData]   = useState(false);
  const [generating,    setGenerating]    = useState(false);
  const [toast,         setToast]         = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    apiClient.get('/classrooms').then(r => setClassrooms(r.data?.data || [])).catch(() => {});
    apiClient.get('/periods').then(r => setPeriods(r.data?.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!classroomId || !periodId) {
      setReportCards([]);
      return;
    }
    setLoadingData(true);
    reportCardsApi.getAll(classroomId, periodId)
      .then(r => setReportCards(r.data?.data || []))
      .catch(() => setReportCards([]))
      .finally(() => setLoadingData(false));
  }, [classroomId, periodId]);

  const handleGenerate = async () => {
    if (!classroomId || !periodId) {
      showToast('Seleccione un grupo y un período primero.', 'error');
      return;
    }
    setGenerating(true);
    try {
      await reportCardsApi.generate({ classroomId, periodId });
      const r = await reportCardsApi.getAll(classroomId, periodId);
      const list = r.data?.data || [];
      setReportCards(list);
      showToast(`${list.length} boletín${list.length !== 1 ? 'es generados' : ' generado'} correctamente.`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al generar los boletines.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyLink = (token) => {
    const url = `${window.location.origin}/p/${token}`;
    navigator.clipboard.writeText(url)
      .then(() => showToast('Enlace copiado al portapapeles.'))
      .catch(() => showToast('No se pudo copiar el enlace.', 'error'));
  };

  const generatedCount = reportCards.filter(r => {
    const s = (r.status || '').toLowerCase();
    return s === 'generated' || s === 'generado';
  }).length;

  return (
    <div className="max-w-5xl space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Boletines PDF</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Genere y distribuya los boletines de calificaciones del período
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={!classroomId || !periodId || generating}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? <Spinner /> : <FileText size={16} />}
          {generating ? 'Generando…' : 'Generar Boletines'}
        </button>
      </div>

      {/* Generating notice */}
      {generating && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 flex items-start gap-3">
          <FileText size={20} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">
              Generando {reportCards.length > 0 ? reportCards.length : ''} boletines, esto puede tardar unos minutos…
            </p>
            <p className="text-blue-600 mt-0.5">
              Por favor espere mientras se crean los PDFs para cada estudiante del grupo.
            </p>
          </div>
        </div>
      )}

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

      {/* Filter bar */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Grupo</label>
            <select
              value={classroomId}
              onChange={e => setClassroomId(e.target.value)}
              className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="">Seleccione un grupo…</option>
              {classrooms.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Período</label>
            <select
              value={periodId}
              onChange={e => setPeriodId(e.target.value)}
              className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="">Seleccione un período…</option>
              {periods.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loadingData && (
        <div className="flex items-center justify-center gap-2 text-gray-500 text-sm py-12">
          <Spinner />
          Cargando boletines…
        </div>
      )}

      {/* Stats */}
      {!loadingData && reportCards.length > 0 && (
        <div className="flex items-center gap-4 px-1">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-emerald-600">{generatedCount}</span>
            {' / '}
            <span className="font-semibold text-gray-900">{reportCards.length}</span>
            {' boletines generados'}
          </p>
        </div>
      )}

      {/* Results table */}
      {!loadingData && reportCards.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Boletines del grupo</h2>
            <span className="text-xs text-gray-400">{reportCards.length} boletines</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-medium">Estudiante</th>
                  <th className="px-5 py-3 text-center font-medium">Estado</th>
                  <th className="px-5 py-3 text-center font-medium">Descargar PDF</th>
                  <th className="px-5 py-3 text-center font-medium">Enlace de acceso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reportCards.map((rc, idx) => (
                  <tr key={rc.id || idx} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <span className="font-medium text-gray-900">
                        {rc.first_name} {rc.last_name}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <StatusBadge status={rc.status} />
                    </td>
                    <td className="px-5 py-3 text-center">
                      {rc.pdf_url ? (
                        <a
                          href={rc.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-800 hover:underline"
                        >
                          <Download size={13} /> Descargar
                        </a>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {rc.access_token ? (
                        <button
                          onClick={() => handleCopyLink(rc.access_token)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
                          title={`${window.location.origin}/p/${rc.access_token}`}
                        >
                          <Link size={13} /> Copiar enlace
                        </button>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loadingData && classroomId && periodId && reportCards.length === 0 && !generating && (
        <div className="card p-12 text-center">
          <FileText size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-700">Sin boletines generados</p>
          <p className="text-gray-400 text-sm mt-1">
            Presione "Generar Boletines" para crear los PDFs de este período.
            Asegúrese de haber ejecutado la consolidación y aprobado los comentarios primero.
          </p>
        </div>
      )}

      {/* Initial state */}
      {!classroomId && (
        <div className="card p-12 text-center text-gray-400">
          Seleccione un grupo y período para ver o generar los boletines.
        </div>
      )}
    </div>
  );
}
