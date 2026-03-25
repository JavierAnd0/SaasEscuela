'use strict';

/**
 * Escala de valoración colombiana — Decreto 1290 de 2009
 * Estos son los umbrales POR DEFECTO. Cada colegio puede personalizarlos
 * en school_siee_config, pero deben mapear a estos cuatro niveles nacionales.
 */
const DEFAULT_SCALE = {
  SUPERIOR: { name: 'Superior', min: 4.6, max: 5.0 },
  ALTO:     { name: 'Alto',     min: 4.0, max: 4.5 },
  BASICO:   { name: 'Básico',   min: 3.0, max: 3.9 },
  BAJO:     { name: 'Bajo',     min: 1.0, max: 2.9 },
};

const MIN_GRADE = 1.0;
const MAX_GRADE = 5.0;
const DEFAULT_PASSING = 3.0;

/**
 * Retorna el nivel SIEE para una nota dada, usando la config del colegio
 * o la escala nacional por defecto.
 * @param {number} gradeValue - nota entre 1.0 y 5.0
 * @param {object} sieeConfig - config del colegio (opcional)
 * @returns {{ key: string, name: string }}
 */
function getColombianLevel(gradeValue, sieeConfig = null) {
  const superiorMin = sieeConfig?.level_superior_min ?? DEFAULT_SCALE.SUPERIOR.min;
  const altoMin     = sieeConfig?.level_alto_min     ?? DEFAULT_SCALE.ALTO.min;
  const basicoMin   = sieeConfig?.level_basico_min   ?? DEFAULT_SCALE.BASICO.min;

  const superiorName = sieeConfig?.level_superior_name ?? DEFAULT_SCALE.SUPERIOR.name;
  const altoName     = sieeConfig?.level_alto_name     ?? DEFAULT_SCALE.ALTO.name;
  const basicoName   = sieeConfig?.level_basico_name   ?? DEFAULT_SCALE.BASICO.name;
  const bajoName     = sieeConfig?.level_bajo_name     ?? DEFAULT_SCALE.BAJO.name;

  if (gradeValue >= superiorMin) return { key: 'SUPERIOR', name: superiorName };
  if (gradeValue >= altoMin)     return { key: 'ALTO',     name: altoName };
  if (gradeValue >= basicoMin)   return { key: 'BASICO',   name: basicoName };
  return                                { key: 'BAJO',     name: bajoName };
}

/**
 * Valida que una nota esté en el rango colombiano 1.0–5.0
 * @param {number} value
 * @returns {boolean}
 */
function isValidGrade(value) {
  return typeof value === 'number' && value >= MIN_GRADE && value <= MAX_GRADE;
}

/**
 * Determina si un estudiante está en riesgo académico
 * @param {number} average
 * @param {number} passingGrade
 * @returns {boolean}
 */
function isAtRisk(average, passingGrade = DEFAULT_PASSING) {
  return average < passingGrade;
}

module.exports = {
  DEFAULT_SCALE,
  MIN_GRADE,
  MAX_GRADE,
  DEFAULT_PASSING,
  getColombianLevel,
  isValidGrade,
  isAtRisk,
};
