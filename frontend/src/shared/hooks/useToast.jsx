import { useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

/**
 * Shared toast notification hook.
 *
 * Usage:
 *   const [toast, showToast] = useToast();
 *   showToast('Guardado correctamente.');
 *   showToast('Error al guardar.', 'error');
 *
 * Renders:  <Toast toast={toast} onDismiss={…} />
 */
export function useToast(duration = 4500) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type, id: Date.now() });
    setTimeout(() => setToast(null), duration);
  }, [duration]);

  const dismiss = useCallback(() => setToast(null), []);

  return [toast, showToast, dismiss];
}

// ─── Toast component ──────────────────────────────────────────────────────────

const STYLES = {
  success: { bg: 'bg-green-50 border-green-200', text: 'text-green-800', Icon: CheckCircle2, iconCls: 'text-green-500' },
  error:   { bg: 'bg-red-50   border-red-200',   text: 'text-red-800',   Icon: XCircle,      iconCls: 'text-red-500'   },
  warning: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', Icon: AlertTriangle, iconCls: 'text-amber-500' },
  info:    { bg: 'bg-blue-50  border-blue-200',  text: 'text-blue-800',  Icon: Info,          iconCls: 'text-blue-500'  },
};

export function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  const s = STYLES[toast.type] || STYLES.success;
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${s.bg} ${s.text}`}>
      <s.Icon size={16} className={`flex-shrink-0 ${s.iconCls}`} />
      <span className="flex-1">{toast.msg}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
          aria-label="Cerrar"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
