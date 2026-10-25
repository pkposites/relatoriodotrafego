import { describe, expect, it } from 'vitest';
import type { Answers } from '../types';
import { commercialScore } from './leadQualification';
import { best } from './fixtures';
import { computeScore } from './scoring';

const base: Answers = { ...best, gestor: 'eu', objetivo: 'avaliar_gestao', orcamento: 'acima_30k' };

describe('commercialScore', () => {
  it('orçamento alto + necessidade + consultoria = potencial alto', () => {
    const c = commercialScore(base, { plan: 'consultoria' });
    expect(c.tier).toBe('alto');
    expect(c.score).toBeLessThanOrEqual(100);
    expect(c.factors.length).toBeGreaterThan(2);
  });

  it('orçamento baixo sem interesse = potencial baixo', () => {
    const c = commercialScore({ ...base, orcamento: 'ate_1k', gestor: 'agencia', dor: 'nao_fecha', objetivo: 'vender_mais' });
    expect(c.tier).toBe('baixo');
  });

  it('é independente do índice de maturidade', () => {
    const low = { ...base, orcamento: 'ate_1k', gestor: 'agencia' };
    expect(computeScore(low).overall).toBe(computeScore(base).overall);
    expect(commercialScore(low).score).toBeLessThan(commercialScore(base).score);
  });
});
