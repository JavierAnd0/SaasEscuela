import { useState, useEffect } from 'react';
import { Check, X, Clock, Sparkles, CheckCheck } from 'lucide-react';
import apiClient from '../../../shared/api/client';
import { commentsApi } from '../api/comments.api';
import GradeLevelBadge from '../../grades/components/GradeLevelBadge';

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
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
        <Check size={11} /> Aprobado
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full">
        <X size={11} /> Rechazado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
      <Clock size={11} /> Pendiente
    </span>
  );
}

function CommentCard({ item, onApprove, onUpdate }) {
  const [editing,      setEditing]      = useState(false);
  const [draftComment, setDraftComment] = useState(item.final_comment || item.ai_comment || '');
  const [saving,       setSaving]       = useState(false);

  const handleApprove = async () => {
    setSaving(true);
    await onApprove(item.id, draftComment);
    setSaving(false);
    setEditing(false);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    await onUpdate(item.id, draftComment);
    setSaving(false);
    setEditing(false);
  };

  const isApproved = item.status === 'approved';

  return (
    <div className={`card p-5 space-y-3 ${isApproved ? 'border-l-4 border-emerald-400' : ''}`}>
      {/* Student header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
            {(item.first_name?.[0] || '?').toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">
              {item.first_name} {item.last_name}
            </p>
            <p className="text-xs text-gray-400">
              Promedio: <span className="font-medium text-gray-600">
                {parseFloat(item.period_average || 0).toFixed(2)}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <GradeLevelBadge value={item.period_average} />
          <StatusBadge status={item.status} />
        </div>
      </div>

      {/* AI comment display */}
      {item.ai_comment && (
        <div className="bg-primary-50 border border-primary-100 rounded-lg p-3">
          <p className="text-xs font-medium text-primary-600 mb-1 flex items-center gap-1">
            <Sparkles size={12} /> Comentario generado por IA
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">{item.ai_comment}</p>
        </div>
      )}

      {/* Editable textarea */}
      {!isApproved && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Comentario final {editing ? '(editando…)' : ''}
          </label>
          <textarea
            value={draftComment}
            onChange={e => setDraftComment(e.target.value)}
            onFocus={() => setEditing(true)}
            rows={3}
            className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none leading-relaxed"
            placeholder="Escriba o edite el comentario para este estudiante…"
          />
        </div>
      )}

      {/* Approved — show final comment read-only */}
      {isApproved && item.final_comment && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
          <p className="text-xs font-medium text-emerald-600 mb-1">Comentario aprobado</p>
          <p className="text-sm text-gray-700 leading-relaxed">{item.final_comment}</p>
        </div>
      )}

      {/* Action buttons */}
      {!isApproved && (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleApprove}
            disabled={saving || !draftComment.trim()}
            className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Spinner small /> : <Check size={14} />}
            Aprobar
          </button>
          {editing && (
            <button
              onClick={handleSaveEdit}
              disabled={saving || !draftComment.trim()}
              className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? <Spinner small /> : null}
              Guardar edición
            </button>
          )}
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="btn-secondary text-sm"
            >
              Editar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function CommentsPage() {
  const [classrooms,   setClassrooms]   = useState([]);
  const [periods,      setPeriods]      = useState([]);
  const [classroomId,  setClassroomId]  = useState('');
  const [periodId,     setPeriodId]     = useState('');

  const [comments,     setComments]     = useState([]);
  const [loadingData,  setLoadingData]  = useState(false);
  const [generating,   setGenerating]   = useState(false);
  const [approvingAll, setApprovingAll] = useState(false);
  const [toast,        setToast]        = useState(null);

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
      setComments([]);
      return;
    }
    setLoadingData(true);
    commentsApi.getAll(classroomId, periodId)
      .then(r => setComments(r.data?.data || []))
      .catch(() => setComments([]))
      .finally(() => setLoadingData(false));
  }, [classroomId, periodId]);

  const handleGenerate = async () => {
    if (!classroomId || !periodId) {
      showToast('Seleccione un grupo y un período primero.', 'error');
      return;
    }
    setGenerating(true);
    try {
      await commentsApi.generate({ classroomId, periodId });
      const r = await commentsApi.getAll(classroomId, periodId);
      setComments(r.data?.data || []);
      showToast('Comentarios generados correctamente.');
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al generar comentarios.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleApproveAll = async () => {
    setApprovingAll(true);
    try {
      await commentsApi.approveAll({ classroomId, periodId });
      const r = await commentsApi.getAll(classroomId, periodId);
      setComments(r.data?.data || []);
      showToast('Todos los comentarios han sido aprobados.');
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al aprobar comentarios.', 'error');
    } finally {
      setApprovingAll(false);
    }
  };

  const handleApprove = async (id, finalComment) => {
    try {
      await commentsApi.update(id, { finalComment, status: 'approved' });
      setComments(prev => prev.map(c =>
        c.id === id ? { ...c, status: 'approved', final_comment: finalComment } : c
      ));
      showToast('Comentario aprobado.');
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al aprobar.', 'error');
    }
  };

  const handleUpdate = async (id, finalComment) => {
    try {
      await commentsApi.update(id, { finalComment });
      setComments(prev => prev.map(c =>
        c.id === id ? { ...c, final_comment: finalComment } : c
      ));
      showToast('Comentario guardado.');
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al guardar el comentario.', 'error');
    }
  };

  const approvedCount = comments.filter(c => c.status === 'approved').length;
  const pendingCount  = comments.filter(c => c.status !== 'approved').length;

  return (
    <div className="max-w-4xl space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comentarios IA</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Genere y apruebe comentarios personalizados para los boletines
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {pendingCount > 0 && comments.length > 0 && (
            <button
              onClick={handleApproveAll}
              disabled={approvingAll}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50"
            >
              {approvingAll ? <Spinner small /> : <CheckCheck size={16} />}
              Aprobar todos
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={!classroomId || !periodId || generating}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? <Spinner /> : <Sparkles size={16} />}
            {generating ? 'Generando con IA…' : 'Generar Comentarios con IA'}
          </button>
        </div>
      </div>

      {/* Generating notice */}
      {generating && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm text-purple-800 flex items-start gap-3">
          <Sparkles size={20} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Generando comentarios con IA…</p>
            <p className="text-purple-600 mt-0.5">
              Este proceso puede tomar entre 30 y 60 segundos para un grupo de 20 estudiantes.
              Por favor espere sin cerrar la página.
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
          Cargando comentarios…
        </div>
      )}

      {/* Stats bar */}
      {!loadingData && comments.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-emerald-600">{approvedCount}</span>
            {' / '}
            <span className="font-semibold text-gray-900">{comments.length}</span>
            {' comentarios aprobados'}
          </p>
          <div className="flex items-center gap-2">
            <div className="h-2 w-32 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${comments.length > 0 ? (approvedCount / comments.length) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">
              {comments.length > 0 ? ((approvedCount / comments.length) * 100).toFixed(0) : 0}%
            </span>
          </div>
        </div>
      )}

      {/* Comment cards */}
      {!loadingData && comments.length > 0 && (
        <div className="space-y-4">
          {comments.map(item => (
            <CommentCard
              key={item.id}
              item={item}
              onApprove={handleApprove}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}

      {/* Empty state — filters selected but no comments */}
      {!loadingData && classroomId && periodId && comments.length === 0 && !generating && (
        <div className="card p-12 text-center">
          <Sparkles size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-700">Sin comentarios generados</p>
          <p className="text-gray-400 text-sm mt-1">
            Presione "Generar Comentarios con IA" para crear comentarios personalizados para cada estudiante.
          </p>
        </div>
      )}

      {/* Initial state */}
      {!classroomId && (
        <div className="card p-12 text-center text-gray-400">
          Seleccione un grupo y período para ver o generar comentarios.
        </div>
      )}
    </div>
  );
}
