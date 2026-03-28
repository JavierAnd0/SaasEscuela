import { useEffect } from 'react';
import { X } from 'lucide-react';

const SIZE_MAP = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-2xl',
  xl:   'max-w-4xl',
  full: 'max-w-6xl',
};

/**
 * Reusable modal dialog.
 *
 * Props:
 *   isOpen   bool
 *   onClose  fn
 *   title    string
 *   size     'sm' | 'md' | 'lg' | 'xl' | 'full'  (default 'md')
 *   children ReactNode  (modal body)
 *   footer   ReactNode  (rendered in the bottom action bar)
 *   noPadding  bool  (skip px-6 py-6 on body — useful for custom padding)
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  footer,
  noPadding = false,
}) {
  /* Close on Escape */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`bg-white rounded-xl shadow-2xl w-full ${SIZE_MAP[size] || SIZE_MAP.md} max-h-[92vh] flex flex-col`}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-base)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-muted)' }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'var(--color-body-bg)';
              e.currentTarget.style.color = 'var(--color-base)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = '';
              e.currentTarget.style.color = 'var(--color-muted)';
            }}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div className={`flex-1 overflow-y-auto ${noPadding ? '' : 'p-6'}`}>
          {children}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        {footer && (
          <div
            className="flex-shrink-0 flex items-center justify-end gap-3 px-6 py-4"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
