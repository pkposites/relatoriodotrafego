import { describe, expect, it } from 'vitest';
import { computeMetrics, parseNumberInput, validateMetrics } from './metrics';

describe('computeMetrics', () => {
  it('calcula todos os indicadores quando os dados são válidos', () => {
    const m = computeMetrics({ investment: 3000, leads: 150, sales: 15, avgTicket: 600 });
    expect(m.cpl).toBe(20);
    expect(m.cpa).toBe(200);
    expect(m.leadToSale).toBeCloseTo(0.1);
    expect(m.revenue).toBe(9000);
    expect(m.roas).toBe(3);
    expect(m.warnings).toHaveLength(0);
  });

  it('não calcula nada sem dados', () => {
    const m = computeMetrics(undefined);
    expect(m.hasAny).toBe(false);
    expect(m.cpl ?? m.cpa ?? m.roas ?? m.leadToSale ?? m.revenue).toBeUndefined();
  });

  it('evita divisão por zero', () => {
    const m = computeMetrics({ investment: 1000, leads: 0, sales: 0, avgTicket: 100 });
    expect(m.cpl).toBeUndefined();
    expect(m.cpa).toBeUndefined();
    expect(m.leadToSale).toBeUndefined();
    expect(m.roas).toBeUndefined();
  });

  it('sinaliza vendas maiores que leads sem calcular conversão', () => {
    const m = computeMetrics({ leads: 10, sales: 20 });
    expect(m.leadToSale).toBeUndefined();
    expect(m.warnings.length).toBe(1);
  });

  it('ROAS exige investimento e receita', () => {
    expect(computeMetrics({ sales: 10, avgTicket: 100 }).roas).toBeUndefined();
    expect(computeMetrics({ sales: 10, avgTicket: 100 }).revenue).toBe(1000);
  });

  it('avisa quando os valores parecem incomuns', () => {
    expect(computeMetrics({ investment: 4.5, leads: 150, sales: 12, avgTicket: 900 }).warnings.length).toBeGreaterThan(0);
    expect(computeMetrics({ investment: 4500, leads: 150, sales: 12, avgTicket: 900 }).warnings).toHaveLength(0);
  });

  it('ignora valores negativos', () => {
    const m = computeMetrics({ investment: -100, leads: 10 });
    expect(m.cpl).toBeUndefined();
  });
});

describe('entrada numérica', () => {
  it('aceita formatos brasileiros', () => {
    expect(parseNumberInput('1.500,50')).toBe(1500.5);
    expect(parseNumberInput('R$ 2000')).toBe(2000);
    expect(parseNumberInput('4.500')).toBe(4500);
    expect(parseNumberInput('1.250.000')).toBe(1250000);
    expect(parseNumberInput('4.5')).toBe(4.5);
    expect(parseNumberInput('R$ 4.500,90')).toBe(4500.9);
    expect(parseNumberInput('')).toBeUndefined();
    expect(parseNumberInput('abc')).toBe('invalid');
  });

  it('valida negativos e inteiros', () => {
    const { values, errors } = validateMetrics({ investment: '-5', leads: '2.5', sales: '3', avgTicket: '' });
    expect(errors.investment).toBeTruthy();
    expect(errors.leads).toBeTruthy();
    expect(values).toEqual({ sales: 3 });
  });
});
