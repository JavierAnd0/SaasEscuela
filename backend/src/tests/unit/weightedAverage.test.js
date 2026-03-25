'use strict';

const { weightedYearAverage, simpleAverage } = require('../../domain/shared/weightedAverage');

describe('weightedYearAverage', () => {

  test('array vacío → 0', () => {
    expect(weightedYearAverage([])).toBe(0);
  });

  test('null → 0', () => {
    expect(weightedYearAverage(null)).toBe(0);
  });

  test('un solo período con peso 100', () => {
    expect(weightedYearAverage([{ average: 4.2, weightPercent: 100 }])).toBe(4.2);
  });

  test('dos períodos con pesos iguales (50/50)', () => {
    const result = weightedYearAverage([
      { average: 4.0, weightPercent: 50 },
      { average: 3.0, weightPercent: 50 },
    ]);
    expect(result).toBe(3.5);
  });

  test('tres períodos pesos distintos (40/30/30)', () => {
    const result = weightedYearAverage([
      { average: 3.5, weightPercent: 40 },
      { average: 4.0, weightPercent: 30 },
      { average: 4.2, weightPercent: 30 },
    ]);
    // (3.5*0.4) + (4.0*0.3) + (4.2*0.3) = 1.4 + 1.2 + 1.26 = 3.86 → 3.9 redondeado a 1 decimal
    expect(result).toBe(3.9);
  });

  test('normaliza cuando pesos no suman 100', () => {
    // 2 períodos con peso 50 y 50 pero calculado como si fueran 100
    const base = weightedYearAverage([
      { average: 4.0, weightPercent: 50 },
      { average: 3.0, weightPercent: 50 },
    ]);
    // Pesos que suman 200 deben dar el mismo resultado
    const scaled = weightedYearAverage([
      { average: 4.0, weightPercent: 100 },
      { average: 3.0, weightPercent: 100 },
    ]);
    expect(scaled).toBe(base);
  });

  test('todos pesos en cero → 0', () => {
    expect(weightedYearAverage([{ average: 4.0, weightPercent: 0 }])).toBe(0);
  });

  test('nota máxima 5.0 en todos los períodos → 5.0', () => {
    const result = weightedYearAverage([
      { average: 5.0, weightPercent: 25 },
      { average: 5.0, weightPercent: 25 },
      { average: 5.0, weightPercent: 25 },
      { average: 5.0, weightPercent: 25 },
    ]);
    expect(result).toBe(5.0);
  });
});

describe('simpleAverage', () => {

  test('array vacío → 0', () => {
    expect(simpleAverage([])).toBe(0);
  });

  test('null → 0', () => {
    expect(simpleAverage(null)).toBe(0);
  });

  test('un solo valor', () => {
    expect(simpleAverage([4.0])).toBe(4.0);
  });

  test('promedio de [3.0, 4.0, 5.0] → 4.0', () => {
    expect(simpleAverage([3.0, 4.0, 5.0])).toBe(4.0);
  });

  test('redondea a 1 decimal: [3.3, 3.3, 3.3] → 3.3', () => {
    expect(simpleAverage([3.3, 3.3, 3.3])).toBe(3.3);
  });

  test('notas extremas [1.0, 5.0] → 3.0', () => {
    expect(simpleAverage([1.0, 5.0])).toBe(3.0);
  });
});
