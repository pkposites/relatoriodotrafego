import { describe, expect, it } from 'vitest';
import { calculate, detectContradictions, parseNumberInput } from './calculations';
import { commercialScore } from './commercial';
import { buildDiagnostic } from './diagnostic';
import { PROFILES } from './profiles';
import { isComplete, looksLikeInstruction, pruneHidden, visibleScreens } from './questionnaire';
import { assess } from './scoring';
import type { Answers, MetricsInput } from './types';

const base = PROFILES.local_whatsapp.answers;
const dx = (a: Answers, m?: MetricsInput) => buildDiagnostic({ id: 't', environment: 'test', answers: a, metrics: m, createdAt: '2026-10-25T00:00:00Z' });

describe('questionário fase A', () => {
  it('12 telas para quem anuncia e 10 para quem não anuncia', () => {
    expect(visibleScreens(base)).toHaveLength(12);
    expect(visibleScreens(PROFILES.never.answers)).toHaveLength(10);
  });
  it('a pergunta de conversão muda com o caminho de venda', () => {
    const ids = (a: Answers) => visibleScreens(a).find((s) => s.id === 's_conversao')!.fields.filter((f) => !f.visible || f.visible(a)).map((f) => f.id);
    expect(ids({ ...base, caminho_venda: 'whatsapp_direct' })).toEqual(['tempo_resposta', 'acompanhamento_contatos']);
    expect(ids({ ...base, caminho_venda: 'site' })).toEqual(['acompanhamento_compras']);
    expect(ids({ ...base, caminho_venda: 'agendamento' })).toEqual(['acompanhamento_agenda', 'lembretes']);
    expect(ids({ ...base, caminho_venda: 'formulario' })).toEqual(['qualificacao', 'tempo_primeiro_contato']);
  });
  it('todos os perfis completam o questionário', () => {
    for (const p of Object.values(PROFILES)) expect(isComplete(p.answers), p.id).toBe(true);
  });
  it('trocar o caminho de venda descarta respostas que não se aplicam mais', () => {
    const pruned = pruneHidden({ ...base, caminho_venda: 'site' });
    expect(pruned.tempo_resposta).toBeUndefined();
    expect(pruned.caminho_venda).toBe('site');
  });
  it('detecta texto com cara de instrução', () => {
    expect(looksLikeInstruction(PROFILES.injection.answers.produto as string)).toBe(true);
    expect(looksLikeInstruction('Instalação de energia solar em Campinas')).toBe(false);
  });
});

describe('cálculos', () => {
  it('entrada no padrão brasileiro', () => {
    expect(parseNumberInput('4.500')).toBe(4500);
    expect(parseNumberInput('R$ 1.250,90')).toBe(1250.9);
    expect(parseNumberInput('32%')).toBe(32);
    expect(parseNumberInput('abc')).toBe('invalid');
    expect(parseNumberInput('')).toBeUndefined();
  });
  it('não divide por zero e não trata ausência como zero', () => {
    const c = calculate({}, { values: { investimento: { value: 0, precision: 'exato' }, contatos: { value: 0, precision: 'exato' }, vendas: { value: null, precision: 'nao_sei' } } });
    expect(c).toHaveLength(0);
  });
  it('fórmulas e precisão', () => {
    const c = calculate({}, { values: { investimento: { value: 1000, precision: 'exato' }, contatos: { value: 50, precision: 'estimado' }, vendas: { value: 5, precision: 'exato' } } });
    const cpl = c.find((x) => x.id === 'cpl')!;
    expect(cpl.value).toBe(20);
    expect(cpl.precision).toBe('estimado');
    expect(c.find((x) => x.id === 'custo_midia_cliente')!.caveats[0]).toMatch(/Não é o CAC completo/);
  });
  it('ROAS de equilíbrio explicita a definição da margem', () => {
    const bruta = calculate({ margem_faixa: '20_40', margem_tipo: 'bruta' }).find((x) => x.id === 'roas_equilibrio')!;
    expect(bruta.value).toBeCloseTo(3.33, 1);
    expect(bruta.caveats.join(' ')).toMatch(/margem bruta/i);
    expect(calculate({ margem_faixa: 'nao_sei' }).find((x) => x.id === 'roas_equilibrio')).toBeUndefined();
  });
  it('ciclo longo recebe ressalva de coorte', () => {
    const c = calculate({ tipo_negocio: 'servicos_b2b' }, { values: { contatos: { value: 100, precision: 'exato' }, vendas: { value: 4, precision: 'exato' } } });
    expect(c.find((x) => x.id === 'conversao_contato_venda')!.caveats.join(' ')).toMatch(/grupos diferentes/);
  });
  it('contradições pedem revisão sem corrigir valores', () => {
    const m: MetricsInput = { values: { contatos: { value: 10, precision: 'exato' }, vendas: { value: 20, precision: 'exato' } } };
    const ctr = detectContradictions({}, m);
    expect(ctr[0].message).toMatch(/mais vendas que contatos/);
    expect(m.values.vendas!.value).toBe(20);
    expect(calculate({}, m).find((x) => x.id === 'conversao_contato_venda')).toBeUndefined();
  });
});

describe('pontuação', () => {
  it('"não sei" fica fora da nota (exceto clareza financeira) e reduz a cobertura', () => {
    const a = { ...base, rotina_analise: 'nao_sei', rotina_testes: 'nao_sei' };
    const r = assess(a);
    expect(r.pillars.find((p) => p.id === 'gestao')!.score).toBeNull();
    expect(r.coverage.unknownFields).toContain('rotina_analise');
    expect(r.coverage.ratio).toBeLessThan(assess(base).coverage.ratio);
  });
  it('campos de outro caminho de venda não entram (não se aplica)', () => {
    const site = assess({ ...base, caminho_venda: 'site', acompanhamento_compras: 'compras_e_etapas' });
    const evidence = site.pillars.flatMap((p) => p.evidence.map((e) => e.id));
    expect(evidence).not.toContain('resp.tempo_resposta');
  });
  it('quem não anuncia recebe prontidão, sem nota', () => {
    const r = assess(PROFILES.never.answers);
    expect(r.mode).toBe('prontidao');
    expect(r.maturity).toBeNull();
    expect(r.readiness!.length).toBeGreaterThan(3);
  });
  it('travas só aparecem quando cortam pontos', () => {
    const r = assess({ ...base, vendas_origem: 'nao_acompanha', tempo_resposta: 'mais_dia' });
    expect(r.adjustments.every((x) => x.before > x.limit)).toBe(true);
  });
  it('não usa "confiança alta" como rótulo único e cita a limitação financeira', () => {
    const r = assess({ ...base });
    expect(r.confidenceStatement).toMatch(/análise financeira limitada/);
    expect(r.confidenceStatement).not.toMatch(/confiança alta/i);
  });
  it('é determinística', () => {
    expect(assess(base)).toEqual(assess(base));
  });
  it('potencial comercial nunca altera a avaliação', () => {
    const rich = { ...base, orcamento: 'acima_30k', gestor: 'ninguem' };
    expect(assess(rich).maturity).toBe(assess({ ...base, gestor: 'ninguem' }).maturity);
    expect(commercialScore(rich, 'consultoria').score).toBeGreaterThan(commercialScore(base).score);
  });
});

describe('priorização', () => {
  it('separa prioridade estrutural, ação rápida e explica a ordem', () => {
    const d = dx(base, PROFILES.local_whatsapp.metrics);
    expect(d.prioritized.structural?.kind).toBe('estrutural');
    expect(d.prioritized.quickWin?.kind).toBe('rapida');
    expect(d.prioritized.quickWinRationale).toMatch(/pode começar antes da prioridade estrutural/);
  });
  it('dependências: medir compras vem antes da margem apertada', () => {
    const p = PROFILES.ecommerce_metrics;
    const ids = dx(p.answers, p.metrics).prioritized.ordered.map((f) => f.id);
    expect(ids.indexOf('evento_compra')).toBeLessThan(ids.indexOf('margem_apertada'));
  });
});
