import { useState } from 'react';

/** Clases de borde/fondo según el valor de la nota (escala colombiana 1.0–5.0) */
function gradeColorClasses(raw) {
  const v = parseFloat(raw);
  if (raw === '' || raw === null || raw === undefined || isNaN(v)) {
    return 'border-gray-200 bg-white focus:border-primary-400 focus:ring-primary-100';
  }
  if (v < 1 || v > 5) return 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-100';
  if (v < 3.0)        return 'border-red-300 bg-red-50  focus:border-red-400  focus:ring-red-100';
  if (v < 4.0)        return 'border-yellow-300 bg-yellow-50 focus:border-yellow-400 focus:ring-yellow-100';
  if (v < 5.0)        return 'border-blue-300 bg-blue-50   focus:border-blue-400   focus:ring-blue-100';
  return                     'border-green-300 bg-green-50  focus:border-green-400  focus:ring-green-100';
}

/**
 * Input de nota individual con validación visual en tiempo real.
 *
 * Props:
 *   value      - string | number | ''
 *   onChange   - (rawValue: string) => void
 *   onBlur     - (parsedValue: number | null) => void
 *   disabled   - boolean
 *   saving     - boolean  muestra spinner mientras guarda
 *   saved      - boolean  muestra checkmark cuando está guardado
 */
export default function GradeInput({ value = '', onChange, onBlur, disabled, saving, saved }) {
  const [localValue, setLocalValue] = useState(String(value ?? ''));
  const [error, setError]           = useState(false);

  const handleChange = (e) => {
    const raw = e.target.value;
    setLocalValue(raw);
    setError(false);
    onChange?.(raw);
  };

  const handleBlur = () => {
    if (localValue === '') {
      onBlur?.(null);
      return;
    }
    const v = parseFloat(localValue);
    if (isNaN(v) || v < 1.0 || v > 5.0) {
      setError(true);
      onBlur?.(null);
      return;
    }
    const formatted = v.toFixed(1);
    setLocalValue(formatted);
    setError(false);
    onBlur?.(parseFloat(formatted));
  };

  // Sincronizar si el valor externo cambia (ej: carga inicial)
  if (String(value ?? '') !== localValue && !document.activeElement?.isSameNode) {
    // Solo sincroniza si el campo no está activo (sin foco)
  }

  const colorCls = error
    ? 'border-red-500 bg-red-50 focus:border-red-600 focus:ring-red-100'
    : gradeColorClasses(localValue);

  return (
    <div className="relative flex items-center gap-1.5">
      <input
        type="number"
        step="0.1"
        min="1"
        max="5"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        inputMode="decimal"
        placeholder="—"
        className={`
          w-20 text-center rounded-lg border-2 px-2 py-1.5
          text-sm font-mono font-semibold tracking-wide
          focus:outline-none focus:ring-2
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-colors duration-150
          ${colorCls}
        `}
      />

      {/* Indicador de estado (guardando / guardado) */}
      <span className="w-4 flex-shrink-0">
        {saving && (
          <svg className="animate-spin h-3.5 w-3.5 text-gray-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        )}
        {saved && !saving && (
          <svg className="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
        )}
      </span>

      {error && (
        <span className="absolute -bottom-4 left-0 text-xs text-red-500 whitespace-nowrap">
          1.0 – 5.0
        </span>
      )}
    </div>
  );
}
