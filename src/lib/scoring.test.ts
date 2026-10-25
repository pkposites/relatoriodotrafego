import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '../data/questions';
import type { Answers } from '../types';
import { BANDS, bandFor, computeScore, isComplete, nominalEvidence } from './scoring';
import { buildReport, rankGaps } from './report';

const best: Answers = {
  q1: 'b2b', q2: 'acima_10k', q3: 'agencia', q4: 'custo_alto', q5: 'confiavel', q6: 'relatorios',
  q7: 'ambas', q8: 'pagina_medida', q9: 'crm', q10: 'semanal', q11: 'ambos', q12: 'reduzir_custo',
};
const worst: Answers = {
  q1: 'outro', q2: 'ate_1k', q3: 'ninguem', q4: 'nao_sabe', q5: 'nao_identifica', q6: 'nao_sabe',
  q7: 'meta', q8: 'whats_sem_processo', q9: 'nenhum', q10: 'sem_rotina', q11: 'nao_sabe', q12: 'avaliar_gestao',
};

describe('estrutura do quiz', () => {
  it('tem exatamente 12 perguntas, 3 por etapa', () => {
    expect(QUESTIONS).toHaveLength(12);
    for (const s of [1, 2, 3, 4]) expect(QUESTIONS.filter((q) => q.stage === s)).toHaveLength(3);
  });

  it('todas as contribuições ficam entre 0 e 100', () => {
    for (const q of QUESTIONS)
      for (const o of q.options)
        for (const c of Object.values(o.scores ?? {})) {
          expect(c!.value).toBeGreaterThanOrEqual(0);
          expect(c!.value).toBeLessThanOrEqual(100);
          expect(c!.weight).toBeGreaterThan(0);
        }
  });

  it('todo pilar recebe evidência de alguma pergunta', () => {
    for (const v of Object.values(nominalEvidence())) expect(v).toBeGreaterThan(0);
  });
});

describe('computeScore', () => {
  it('melhor cenário gera nota alta e faixa organizada', () => {
    const r = computeScore(best);
    expect(r.overall).toBeGreaterThanOrEqual(90);
    expect(r.band.id).toBe('organizada');
    expect(r.complete).toBe(true);
    expect(r.pillars.every((p) => p.evidenceLevel === 'plena')).toBe(true);
  });

  it('pior cenário gera nota baixa e faixa crítica', () => {
    const r = computeScore(worst);
    expect(r.overall).toBeLessThan(25);
    expect(r.band.id).toBe('critica');
  });

  it('é determinístico', () => {
    expect(computeScore(best)).toEqual(computeScore(best));
    expect(buildReport(worst)).toEqual(buildReport(worst));
  });

  it('perguntas de contexto, dor e orçamento não alteram a nota', () => {
    const variant: Answers = { ...best, q1: 'outro', q2: 'ate_1k', q3: 'ninguem', q4: 'nao_sabe', q6: 'nao_sabe', q7: 'outras', q12: 'avaliar_gestao' };
    expect(computeScore(variant).overall).toBe(computeScore(best).overall);
    expect(computeScore(variant).pillars).toEqual(computeScore(best).pillars);
  });

  it('respostas ausentes: sem nota fingida e diagnóstico incompleto', () => {
    const r = computeScore({});
    expect(r.overall).toBe(0);
    expect(r.complete).toBe(false);
    expect(r.confidenceLevel).toBe('baixa');
    expect(r.pillars.every((p) => p.evidenceLevel === 'limitada')).toBe(true);
    expect(isComplete({ ...best, q12: undefined })).toBe(false);
  });

  it('resposta de opção inexistente é ignorada', () => {
    expect(isComplete({ ...best, q5: 'xyz' })).toBe(false);
  });

  it('"Não sei informar" marca evidência limitada no pilar', () => {
    const r = computeScore({ ...best, q10: 'nao_sabe' });
    expect(r.pillars.find((p) => p.id === 'criativos')!.evidenceLevel).toBe('limitada');
    expect(r.confidence).toBeLessThan(computeScore(best).confidence);
  });

  it('melhorar uma resposta diagnóstica nunca reduz a nota', () => {
    const base = { ...worst };
    const better = { ...worst, q11: 'ambos' };
    expect(computeScore(better).overall).toBeGreaterThan(computeScore(base).overall);
  });

  it('nota sempre entre 0 e 100 e coerente com a faixa', () => {
    const r = computeScore({ ...best, q5: 'estimativa', q9: 'so_whats' });
    expect(r.overall).toBeGreaterThanOrEqual(0);
    expect(r.overall).toBeLessThanOrEqual(100);
    expect(r.overall).toBeGreaterThanOrEqual(r.band.min);
    expect(r.overall).toBeLessThanOrEqual(r.band.max);
  });

  it('orçamento não informado e dados opcionais pulados reduzem só a confiança', () => {
    const withData = computeScore(best, { investment: 1000, leads: 10 });
    const skipped = computeScore({ ...best, q2: 'nao_informar' });
    expect(withData.overall).toBe(skipped.overall);
    expect(withData.confidence).toBeGreaterThan(skipped.confidence);
  });
});

describe('faixas', () => {
  it('cobrem 0–100 sem lacunas', () => {
    for (let s = 0; s <= 100; s++) expect(BANDS.some((b) => s >= b.min && s <= b.max)).toBe(true);
    expect(bandFor(39).id).toBe('critica');
    expect(bandFor(40).id).toBe('potencial');
    expect(bandFor(60).id).toBe('desenvolvimento');
    expect(bandFor(80).id).toBe('organizada');
    expect(bandFor(-5).id).toBe('critica');
    expect(bandFor(140).id).toBe('organizada');
  });
});

describe('buildReport', () => {
  it('gera três lacunas a partir dos pilares mais frágeis', () => {
    const answers: Answers = { ...best, q11: 'nao_sabe', q9: 'nenhum', q10: 'sem_rotina' };
    const r = buildReport(answers);
    expect(r.gaps).toHaveLength(3);
    expect(r.gaps.map((g) => g.pillar).sort()).toEqual(['conversao', 'criativos', 'rentabilidade']);
    expect(r.mainGap.pillar).toBe('rentabilidade');
    expect(r.firstStep).toBe(r.mainGap.action);
  });

  it('empate prioriza o pilar de maior peso', () => {
    const ranked = rankGaps([
      { id: 'criativos', name: '', weight: 15, score: 10, evidence: 1, evidenceLevel: 'plena' },
      { id: 'mensuracao', name: '', weight: 25, score: 10, evidence: 1, evidenceLevel: 'plena' },
    ]);
    expect(ranked[0].id).toBe('mensuracao');
  });

  it('ponto forte usa pilar com nota ≥ 60 ou mensagem neutra', () => {
    expect(buildReport(best).strength.title).not.toMatch(/Disposição/);
    expect(buildReport(worst).strength.title).toMatch(/Disposição/);
  });

  it('não usa linguagem de desperdício como fato', () => {
    const text = JSON.stringify(buildReport(worst));
    expect(text).not.toMatch(/dinheiro está sendo desperdiçado/i);
  });
});
