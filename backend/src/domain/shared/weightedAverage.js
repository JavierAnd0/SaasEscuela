'use strict';

/**
 * Calcula el promedio ponderado de los períodos para el año escolar.
 *
 * @param {Array<{ average: number, weightPercent: number }>} periods
 *   Lista de períodos con su promedio y peso porcentual (deben sumar 100)
 * @returns {number} promedio anual ponderado, redondeado a 1 decimal
 *
 * @example
 * weightedYearAverage([
 *   { average: 3.5, weightPercent: 40 },
 *   { average: 4.0, weightPercent: 30 },
 *   { average: 4.2, weightPercent: 30 },
 * ])
 * // → 3.86
 */
function weightedYearAverage(periods) {
  if (!periods || periods.length === 0) return 0;

  const totalWeight = periods.reduce((sum, p) => sum + p.weightPercent, 0);
  if (totalWeight === 0) return 0;

  const weightedSum = periods.reduce((sum, p) => {
    return sum + p.average * (p.weightPercent / 100);
  }, 0);

  // Normaliza si los pesos no suman exactamente 100
  const normalized = totalWeight !== 100
    ? weightedSum * (100 / totalWeight)
    : weightedSum;

  return Math.round(normalized * 10) / 10;
}

/**
 * Calcula el promedio simple de un array de notas
 * @param {number[]} grades
 * @returns {number} promedio redondeado a 1 decimal
 */
function simpleAverage(grades) {
  if (!grades || grades.length === 0) return 0;
  const sum = grades.reduce((acc, g) => acc + g, 0);
  return Math.round((sum / grades.length) * 10) / 10;
}

module.exports = { weightedYearAverage, simpleAverage };
