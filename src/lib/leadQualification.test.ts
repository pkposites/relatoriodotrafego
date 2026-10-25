import { describe, expect, it } from 'vitest';
import type { Answers } from '../types';
import { commercialScore } from './leadQualification';
import { computeScore } from './scoring';

const base: Answers = {
  q1: 'b2b', q2: 'acima_10k', q3: 'eu', q4: 'custo_alto', q5: 'confiavel', q6: 'relatorios',
  q7: 'ambas', q8: 'pagina_medida', q9: 'crm', q10: 'semanal', q11: 'ambos', q12: 'avaliar_gestao',
};

describe('commercialScore', () => {
  it('orçamento alto + necessidade + consultoria = potencial alto', () => {
    const c = commercialScore(base, { plan: 'consultoria' });
    expect(c.tier).toBe('alto');
    expect(c.score).toBeLessThanOrEqual(100);
    expect(c.factors.length).toBeGreaterThan(2);
  });

  it('orçamento baixo sem interesse = potencial baixo', () => {
    const c = commercialScore({ ...base, q2: 'ate_1k', q3: 'agencia', q4: 'nao_fecha', q6: 'atendimento', q12: 'vender_mais' });
    expect(c.tier).toBe('baixo');
  });

  it('é independente do índice de maturidade', () => {
    const low = { ...base, q2: 'ate_1k', q3: 'agencia' };
    expect(computeScore(low).overall).toBe(computeScore(base).overall);
    expect(commercialScore(low).score).toBeLessThan(commercialScore(base).score);
  });
});
