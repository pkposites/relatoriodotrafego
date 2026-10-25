import { describe, expect, it } from 'vitest';
import { QUESTIONS, STAGES } from '../data/questions';
import type { Answers } from '../types';
import { buildAiContext } from './aiContext';
import { computeEconomics } from './economics';
import { buildReport, rankGaps } from './report';
import { best, worst } from './fixtures';
import { BANDS, bandFor, computeScore, isComplete, nominalEvidence } from './scoring';

const pillar = (a: Answers, id: string, m?: Parameters<typeof computeScore>[1]) => computeScore(a, m).pillars.find((p) => p.id === id)!;

describe('estrutura do quiz', () => {
  it('tem 23 perguntas com ids únicos em 5 etapas', () => {
    expect(QUESTIONS).toHaveLength(23);
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(23);
    for (const s of STAGES) expect(QUESTIONS.filter((q) => q.stage === s.id).length).toBeGreaterThan(0);
  });

  it('as respostas de exemplo cobrem todas as perguntas', () => {
    expect(isComplete(best)).toBe(true);
    expect(isComplete(worst)).toBe(true);
  });

  it('contribuições e pontos ficam entre 0 e 100', () => {
    for (const q of QUESTIONS)
      for (const o of q.options) {
        for (const c of Object.values(o.scores ?? {})) {
          expect(c!.value).toBeGreaterThanOrEqual(0);
          expect(c!.value).toBeLessThanOrEqual(100);
          expect(c!.weight).toBeGreaterThan(0);
        }
        if (q.multi) expect(o.points).toBeTypeOf('number');
      }
  });

  it('todo pilar recebe evidência de alguma pergunta', () => {
    for (const v of Object.values(nominalEvidence())) expect(v).toBeGreaterThan(0);
  });
});

describe('computeScore', () => {
  it('melhor cenário: nota alta, faixa organizada, sem travas', () => {
    const r = computeScore(best);
    expect(r.overall).toBeGreaterThanOrEqual(90);
    expect(r.band.id).toBe('organizada');
    expect(r.adjustments).toHaveLength(0);
    expect(r.pillars.every((p) => p.evidenceLevel === 'plena')).toBe(true);
  });

  it('pior cenário: nota baixa, faixa crítica e travas aplicadas', () => {
    const r = computeScore(worst);
    expect(r.overall).toBeLessThan(25);
    expect(r.band.id).toBe('critica');
  });

  it('travas só aparecem quando de fato cortam a nota', () => {
    const r = computeScore({ ...best, otimizacao: 'trafego_engajamento' });
    expect(r.adjustments.every((a) => a.before > a.limit)).toBe(true);
    expect(computeScore(worst).adjustments.every((a) => a.before > a.limit)).toBe(true);
  });

  it('é determinístico', () => {
    expect(computeScore(best)).toEqual(computeScore(best));
    expect(buildReport(worst)).toEqual(buildReport(worst));
  });

  it('perguntas de contexto, dor, objetivo e orçamento não alteram a nota', () => {
    const variant: Answers = {
      ...best, segmento: 'outro', ticket: 'ate_100', ciclo: 'mesmo_dia', orcamento: 'ate_1k', gestor: 'ninguem',
      plataformas: 'outras', tempo_anuncio: 'menos_3m', dor: 'nao_sabe', objetivo: 'avaliar_gestao',
    };
    expect(computeScore(variant).overall).toBe(computeScore(best).overall);
    expect(computeScore(variant).pillars).toEqual(computeScore(best).pillars);
  });

  it('respostas ausentes: sem nota fingida', () => {
    const r = computeScore({});
    expect(r.overall).toBe(0);
    expect(r.complete).toBe(false);
    expect(r.confidenceLevel).toBe('baixa');
    expect(isComplete({ ...best, acompanhamento: undefined })).toBe(false);
    expect(isComplete({ ...best, rastreamento: [] })).toBe(false);
    expect(isComplete({ ...best, vendas_origem: 'xyz' })).toBe(false);
  });

  it('múltipla escolha soma pontos até 100', () => {
    expect(pillar({ ...best, rastreamento: ['pixel'] }, 'mensuracao').score).toBeLessThan(pillar(best, 'mensuracao').score);
    expect(pillar(best, 'mensuracao').score).toBeLessThanOrEqual(100);
  });

  it('respostas "não sei" reduzem a evidência', () => {
    const r = computeScore({ ...best, criativos_volume: 'nao_sabe', formatos: ['nao_sabe'], testes: 'nao_sabe', oferta: 'nao_sabe' });
    expect(r.pillars.find((p) => p.id === 'criativos')!.evidenceLevel).toBe('limitada');
    expect(r.confidence).toBeLessThan(computeScore(best).confidence);
  });

  it('melhorar uma resposta diagnóstica aumenta a nota', () => {
    expect(computeScore({ ...worst, analise: 'semanal' }).overall).toBeGreaterThanOrEqual(computeScore(worst).overall);
    expect(computeScore({ ...best, tempo_resposta: 'ate_1h' }).overall).toBeLessThan(computeScore(best).overall);
  });

  it('nota coerente com a faixa', () => {
    const r = computeScore({ ...best, vendas_origem: 'estimativa', acompanhamento: 'so_whats' });
    expect(r.overall).toBeGreaterThanOrEqual(r.band.min);
    expect(r.overall).toBeLessThanOrEqual(r.band.max);
  });

  it('orçamento não informado e dados pulados reduzem só a confiança', () => {
    const withData = computeScore(best, { investment: 1000, leads: 10 });
    const skipped = computeScore({ ...best, orcamento: 'nao_informar' });
    expect(withData.overall).toBe(skipped.overall);
    expect(withData.confidence).toBeGreaterThan(skipped.confidence);
  });
});

describe('travas realistas', () => {
  it('otimizar para cliques/engajamento limita a estratégia a 35', () => {
    const r = computeScore({ ...best, otimizacao: 'trafego_engajamento' });
    expect(r.pillars.find((p) => p.id === 'estrategia')!.score).toBeLessThanOrEqual(35);
    expect(r.adjustments.some((a) => a.scope === 'estrategia')).toBe(true);
  });

  it('sem identificar vendas e sem pixel/CAPI, o índice não passa de 45', () => {
    const a: Answers = { ...best, vendas_origem: 'nao_identifica', rastreamento: ['nenhum'] };
    expect(computeScore(a).overall).toBeLessThanOrEqual(45);
    expect(computeScore({ ...a, rastreamento: ['pixel'] }).adjustments.some((x) => x.scope === 'geral')).toBe(false);
  });

  it('resposta em mais de um dia limita conversão a 30', () => {
    expect(pillar({ ...best, tempo_resposta: 'mais_dia' }, 'conversao').score).toBeLessThanOrEqual(30);
  });

  it('custo por venda acima da margem limita a rentabilidade a 25', () => {
    const m = { investment: 8000, sales: 10, avgTicket: 1000 }; // CPA 800 > lucro bruto 500 (margem 50%)
    expect(computeEconomics(best, m).status).toBe('acima_da_margem');
    expect(pillar(best, 'rentabilidade', m).score).toBeLessThanOrEqual(25);
  });

  it('folga comprovada pelos números garante piso de 75 na rentabilidade', () => {
    const m = { investment: 1000, sales: 10, avgTicket: 1000 }; // CPA 100 vs lucro bruto 500
    const a: Answers = { ...best, cac: 'nao_sabe' };
    expect(pillar(a, 'rentabilidade').score).toBeLessThan(75);
    expect(pillar(a, 'rentabilidade', m).score).toBeGreaterThanOrEqual(75);
  });

  it('economia da unidade só calcula com dados suficientes', () => {
    expect(computeEconomics({ margem: 'nao_sabe' }, { investment: 1000, sales: 10, avgTicket: 100 }).status).toBeUndefined();
    expect(computeEconomics({ margem: '20_40' }).breakevenRoas).toBeCloseTo(3.33, 1);
  });
});

describe('faixas', () => {
  it('cobrem 0–100 sem lacunas', () => {
    for (let s = 0; s <= 100; s++) expect(BANDS.some((b) => s >= b.min && s <= b.max)).toBe(true);
    expect(bandFor(39).id).toBe('critica');
    expect(bandFor(40).id).toBe('potencial');
    expect(bandFor(60).id).toBe('desenvolvimento');
    expect(bandFor(80).id).toBe('organizada');
  });
});

describe('buildReport — personalização', () => {
  it('gera três lacunas a partir dos pilares mais frágeis', () => {
    const r = buildReport({ ...best, cac: 'nao_sabe', margem: 'nao_sabe', acompanhamento: 'nenhum', tempo_resposta: 'mais_dia', criativos_volume: 'mesmos' });
    expect(r.gaps).toHaveLength(3);
    expect(r.gaps.map((g) => g.pillar).sort()).toEqual(['conversao', 'criativos', 'rentabilidade']);
  });

  it('empate prioriza o pilar de maior peso', () => {
    const ranked = rankGaps([
      { id: 'criativos', name: '', weight: 15, score: 10, evidence: 1, evidenceLevel: 'plena' },
      { id: 'mensuracao', name: '', weight: 25, score: 10, evidence: 1, evidenceLevel: 'plena' },
    ]);
    expect(ranked[0].id).toBe('mensuracao');
  });

  it('a hipótese muda conforme as respostas', () => {
    const weakMeasure: Answers = { ...best, vendas_origem: 'nao_identifica', rastreamento: ['nenhum'] };
    const noSignal = buildReport(weakMeasure).gaps.find((g) => g.pillar === 'mensuracao')!;
    const pixelOnly = buildReport({ ...weakMeasure, rastreamento: ['pixel'] }).gaps.find((g) => g.pillar === 'mensuracao')!;
    expect(noSignal.hypothesis).toMatch(/pixel/);
    expect(noSignal.hypothesis).not.toBe(pixelOnly.hypothesis);
    expect(pixelOnly.action).toMatch(/API de Conversões/);
  });

  it('o primeiro passo segue o objetivo declarado quando possível', () => {
    const a: Answers = { ...worst, objetivo: 'vender_mais' };
    const r = buildReport(a);
    const conv = r.gaps.find((g) => g.pillar === 'conversao');
    if (conv) expect(r.firstStep).toBe(conv.action);
  });

  it('perfil e dica refletem segmento e orçamento', () => {
    const r = buildReport({ ...best, segmento: 'ecommerce' });
    expect(r.profile).toMatch(/e-commerce/);
    expect(r.profile).toMatch(/R\$ 10 a 30 mil/);
    expect(r.segmentTip).toMatch(/API de Conversões/);
  });

  it('alertas cruzam respostas e respeitam o limite de 4', () => {
    const r = buildReport({ ...best, otimizacao: 'mensagens', tempo_resposta: 'mesmo_dia' });
    expect(r.alerts.some((a) => a.id === 'mensagens_lento')).toBe(true);
    expect(buildReport(worst).alerts.length).toBeLessThanOrEqual(4);
    expect(buildReport(best).alerts).toHaveLength(0);
  });

  it('ponto forte usa pilar com nota ≥ 60 ou mensagem neutra', () => {
    expect(buildReport(best).strength.title).not.toMatch(/Disposição/);
    expect(buildReport(worst).strength.title).toMatch(/Disposição/);
  });

  it('não usa linguagem de desperdício como fato', () => {
    expect(JSON.stringify(buildReport(worst))).not.toMatch(/dinheiro está sendo desperdiçado/i);
  });
});

describe('buildAiContext', () => {
  it('inclui todas as respostas, números, notas e contexto livre', () => {
    const ctx = buildAiContext(best, { investment: 5000, leads: 100, sales: 10, avgTicket: 3000 }, { produto: 'Software contábil' });
    const items = ctx.respostas.flatMap((e) => e.itens);
    expect(items).toHaveLength(23);
    expect(items.every((i) => i.resposta)).toBe(true);
    expect(ctx.numeros_30_dias.cpa).toBe(500);
    expect(ctx.economia_da_unidade.roas_de_equilibrio).toBe(2);
    expect(ctx.contexto_livre.produto_e_publico).toBe('Software contábil');
    expect(() => JSON.stringify(ctx)).not.toThrow();
  });
});
