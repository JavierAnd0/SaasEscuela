/**
 * Muestra el nivel SIEE (Superior/Alto/Básico/Bajo) de una nota.
 * Usa los umbrales por defecto de la escala colombiana.
 */
export function getGradeLevel(value) {
  const v = parseFloat(value);
  if (isNaN(v) || v === '' || value === null || value === undefined) return null;
  if (v >= 4.6) return { label: 'Superior', cls: 'badge-superior' };
  if (v >= 4.0) return { label: 'Alto',     cls: 'badge-alto' };
  if (v >= 3.0) return { label: 'Básico',   cls: 'badge-basico' };
  return             { label: 'Bajo',      cls: 'badge-bajo' };
}

export default function GradeLevelBadge({ value }) {
  const level = getGradeLevel(value);
  if (!level) return <span className="text-gray-300 text-xs">—</span>;
  return <span className={level.cls}>{level.label}</span>;
}
