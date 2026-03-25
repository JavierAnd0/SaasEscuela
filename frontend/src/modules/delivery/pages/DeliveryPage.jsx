import { useState, useEffect } from 'react';
import { Check, X, Clock, FileText, Mail, AlertTriangle, RotateCcw } from 'lucide-react';
import apiClient from '../../../shared/api/client';
import { deliveryApi } from '../api/delivery.api';

function Spinner({ small = false }) {
  const size = small ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <svg className={`animate-spin ${size}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function DeliveryStatusBadge({ status }) {
  const s = (status || '').toLowerCase();
  if (s === 'sent' || s === 'enviado') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
        <Check size={11} /> Enviado
      </span>
    );
  }
  if (s === 'failed' || s === 'fallido' || s === 'error') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full">
        <X size={11} /> Fallido
      </span>
    );
  }
  if (s === 'pending' || s === 'pendiente') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
        <Clock size={11} /> Pendiente
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
      — Sin estado
    </span>
  );
}

function CardStatusBadge({ status }) {
  const s = (status || '').toLowerCase();
  if (s === 'generated' || s === 'generado') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
        <FileText size={11} /> Generado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
      <Clock size={11} /> Sin boletín
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function DeliveryPage() {
  const [classrooms,   setClassrooms]   = useState([]);
  const [periods,      setPeriods]      = useState([]);
  const [classroomId,  setClassroomId]  = useState('');
  const [periodId,     setPeriodId]     = useState('');

  const [statuses,     setStatuses]     = useState([]);
  const [loadingData,  setLoadingData]  = useState(false);
  const [sending,      setSending]      = useState(false);
  const [resendingId,  setResendingId]  = useState(null);
  const [toast,        setToast]        = useState(null);
  const [smtpError,    setSmtpError]    = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    apiClient.get('/classrooms').then(r => setClassrooms(r.data?.data || [])).catch(() => {});
    apiClient.get('/periods').then(r => setPeriods(r.data?.data || [])).catch(() => {});
  }, []);

  const loadStatus = async () => {
    if (!classroomId || !periodId) {
      setStatuses([]);
      return;
    }
    setLoadingData(true);
    setSmtpError(false);
    try {
      const r = await deliveryApi.getStatus(classroomId, periodId);
      setStatuses(r.data?.data || []);
    } catch {
      setStatuses([]);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomId, periodId]);

  const handleSendAll = async () => {
    if (!classroomId || !periodId) {
      showToast('Seleccione un grupo y un período primero.', 'error');
      return;
    }
    setSending(true);
    setSmtpError(false);
    try {
      await deliveryApi.send({ classroomId, periodId, channel: 'email' });
      await loadStatus();
      showToast('Boletines enviados por email correctamente.');
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.error || '';
      if (status === 503 || msg.toLowerCase().includes('smtp') || msg.toLowerCase().includes('mail')) {
        setSmtpError(true);
        showToast('El servidor de correo (SMTP) no está configurado. Contacte al administrador.', 'error');
      } else {
        showToast(msg || 'Error al enviar los boletines.', 'error');
      }
    } finally {
      setSending(false);
    }
  };

  const handleResend = async (studentId) => {
    setResendingId(studentId);
    try {
      // Resend for individual student — we call send with the full classroom/period;
      // the backend should handle idempotency. If a per-student endpoint exists, swap here.
      await deliveryApi.send({ classroomId, periodId, channel: 'email', studentId });
      await loadStatus();
      showToast('Reenvío realizado correctamente.');
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.error || '';
      if (status === 503 || msg.toLowerCase().includes('smtp')) {
        setSmtpError(true);
        showToast('El servidor de correo (SMTP) no está configurado.', 'error');
      } else {
        showToast(msg || 'Error al reenviar.', 'error');
      }
    } finally {
      setResendingId(null);
    }
  };

  // Computed stats
  const sentCount    = statuses.filter(s => ['sent','enviado'].includes((s.delivery_status||'').toLowerCase())).length;
  const failedCount  = statuses.filter(s => ['failed','fallido','error'].includes((s.delivery_status||'').toLowerCase())).length;
  const pendingCount = statuses.filter(s => ['pending','pendiente',''].includes((s.delivery_status||'').toLowerCase())).length;

  return (
    <div className="max-w-5xl space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Entrega a Padres</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Envíe los boletines digitales a los acudientes por correo electrónico
          </p>
        </div>
        <button
          onClick={handleSendAll}
          disabled={!classroomId || !periodId || sending}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? <Spinner /> : <Mail size={16} />}
          {sending ? 'Enviando…' : 'Enviar a Todos por Email'}
        </button>
      </div>

      {/* SMTP error warning */}
      {smtpError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800 flex items-start gap-3">
          <AlertTriangle size={20} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Servidor de correo no configurado</p>
            <p className="text-red-600 mt-0.5">
              El servicio de envío de emails (SMTP) no está disponible en este momento.
              Contacte al administrador del sistema para configurar las credenciales de correo
              en el panel de configuración del colegio.
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
          Cargando estado de entregas…
        </div>
      )}

      {/* Stats */}
      {!loadingData && statuses.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 text-center border-l-4 border-emerald-400">
            <p className="text-2xl font-bold text-emerald-600">{sentCount}</p>
            <p className="text-xs text-gray-500 mt-1">Enviados</p>
          </div>
          <div className="card p-4 text-center border-l-4 border-red-400">
            <p className="text-2xl font-bold text-red-600">{failedCount}</p>
            <p className="text-xs text-gray-500 mt-1">Fallidos</p>
          </div>
          <div className="card p-4 text-center border-l-4 border-amber-400">
            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            <p className="text-xs text-gray-500 mt-1">Pendientes</p>
          </div>
        </div>
      )}

      {/* Delivery table */}
      {!loadingData && statuses.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Estado de entrega por estudiante</h2>
            <span className="text-xs text-gray-400">{statuses.length} estudiantes</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-medium">Estudiante</th>
                  <th className="px-5 py-3 text-left font-medium">Email acudiente</th>
                  <th className="px-5 py-3 text-center font-medium">Boletín</th>
                  <th className="px-5 py-3 text-center font-medium">Entrega</th>
                  <th className="px-5 py-3 text-center font-medium">Enviado el</th>
                  <th className="px-5 py-3 text-center font-medium">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {statuses.map((row, idx) => {
                  const isFailed  = ['failed','fallido','error'].includes((row.delivery_status||'').toLowerCase());
                  const isSent    = ['sent','enviado'].includes((row.delivery_status||'').toLowerCase());
                  const noEmail   = !row.parent_email;
                  return (
                    <tr
                      key={row.student_id || idx}
                      className={
                        isFailed ? 'bg-red-50 hover:bg-red-100' :
                        noEmail  ? 'bg-amber-50 hover:bg-amber-100' :
                        'hover:bg-gray-50'
                      }
                    >
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {row.first_name} {row.last_name}
                      </td>
                      <td className="px-5 py-3">
                        {row.parent_email ? (
                          <span className="text-gray-600">{row.parent_email}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded-full font-medium">
                            <AlertTriangle size={11} /> Sin email
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <CardStatusBadge status={row.card_status} />
                      </td>
                      <td className="px-5 py-3 text-center">
                        <DeliveryStatusBadge status={row.delivery_status} />
                      </td>
                      <td className="px-5 py-3 text-center text-xs text-gray-500">
                        {formatDate(row.sent_at)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {!noEmail && (
                          <button
                            onClick={() => handleResend(row.student_id)}
                            disabled={resendingId === row.student_id}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-2.5 py-1 rounded-full transition-colors disabled:opacity-50"
                          >
                            {resendingId === row.student_id ? <Spinner small /> : <RotateCcw size={13} />}
                            {resendingId === row.student_id ? '' : 'Reenviar'}
                          </button>
                        )}
                        {noEmail && (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loadingData && classroomId && periodId && statuses.length === 0 && (
        <div className="card p-12 text-center">
          <Mail size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-700">Sin registros de entrega</p>
          <p className="text-gray-400 text-sm mt-1">
            Asegúrese de haber generado los boletines antes de proceder con el envío.
          </p>
        </div>
      )}

      {/* Initial state */}
      {!classroomId && (
        <div className="card p-12 text-center text-gray-400">
          Seleccione un grupo y período para ver el estado de la entrega.
        </div>
      )}
    </div>
  );
}
