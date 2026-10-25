import { describe, expect, it } from 'vitest';
import { buildModelInput } from '../ai/modelInput';
import { validatePlan } from '../ai/validate';
import { buildDiagnostic } from './diagnostic';
import { buildPlan } from './plan';
import { PROFILES } from './profiles';

/** Testes de aceitação com perfis fictícios (1–9). O perfil 10 (pagamento/IA) está em netlify/functions/_lib/orders.test.ts. */
function run(id: string) {
  const p = PROFILES[id];
  const d = buildDiagnostic({ id, environment: 'test', answers: p.answers, metrics: p.metrics, createdAt: '2026-10-25T00:00:00Z', links: id === 'local_whatsapp' ? [{ url: 'https://exemplo.com.br', status: 'informado' }] : [] });
  const plan = buildPlan(d, p.answers);
  const input = buildModelInput(d, p.answers);
  return { d, plan, input, text: JSON.stringify(plan), v: validatePlan(plan, input) };
}

describe('critérios gerais (todos os perfis)', () => {
  for (const id of Object.keys(PROFILES)) {
    it(`${id}: plano válido, com evidência e sem métricas inventadas`, () => {
      const { d, plan, v } = run(id);
      expect(v.errors).toEqual([]);
      expect(d.record.conversion_path).toBe(PROFILES[id].answers.caminho_venda);
      for (const pr of plan.priorities) if (pr.kind !== 'investigacao') expect(pr.evidence_refs.length, pr.id).toBeGreaterThan(0);
      for (const i of plan.indicators) expect(d.record.calculated_metrics.some((c) => `calc.${c.id}` === i.evidence_ref)).toBe(true);
      expect(plan.limitations[0]).toMatch(/não foram acessados/);
      expect(plan.priorities.length).toBeLessThanOrEqual(3);
      expect(plan.avoid_now.length).toBeLessThanOrEqual(3);
    });
  }
});

describe('perfis específicos', () => {
  it('1. serviço local com resposta lenta: ação rápida de atendimento, sem pedir verba', () => {
    const { plan, d } = run('local_whatsapp');
    expect(d.prioritized.quickWin?.id).toBe('resposta_lenta');
    expect(plan.quick_win.priority_id).toBe('resposta_lenta');
    expect(plan.limitations.join(' ')).toMatch(/Link informado .* não acessado/);
    expect(plan.avoid_now.map((x) => x.decision).join(' ')).toMatch(/Aumentar o investimento/);
  });
  it('2. e-commerce: indicadores calculados e API de Conversões ligada ao evento de compra', () => {
    const { plan } = run('ecommerce_metrics');
    expect(plan.indicators.map((i) => i.label)).toEqual(expect.arrayContaining(['ROAS', 'Custo de mídia por cliente']));
    const ev = plan.priorities.find((p) => p.id === 'evento_compra')!;
    expect(ev.action.how.join(' ')).toMatch(/evento de compra.*API de Conversões|API de Conversões.*evento/);
  });
  it('3. B2B de ciclo longo: ressalva de coorte nos cálculos', () => {
    const { plan } = run('b2b_long');
    const caveats = plan.indicators.filter((i) => ['calc.conversao_contato_venda', 'calc.fechamento_propostas', 'calc.roas'].includes(i.evidence_ref)).map((i) => i.caveat ?? '');
    expect(caveats.length).toBe(3);
    for (const c of caveats) expect(c).toMatch(/grupos diferentes/);
  });
  it('4. quem não anuncia: avaliação de preparação, sem nota de campanha', () => {
    const { plan, d } = run('never');
    expect(d.record.assessment.maturity).toBeNull();
    expect(plan.pillar_assessments.every((p) => p.score === null)).toBe(true);
    expect(plan.executive_summary.scenario).toMatch(/preparação/);
    expect(plan.conversion_map[0].status).toBe('nao_se_aplica');
  });
  it('5. só Google Pesquisa: nada de formatos visuais; termos e negativas', () => {
    const { text, d } = run('search_only');
    expect(text).not.toMatch(/Reels|Stories|vídeo vertical|carrossel/i);
    expect(d.prioritized.ordered.map((f) => f.id)).toContain('pesquisa_termos');
    expect(d.findings.find((f) => f.id === 'testes')!.action.how.join(' ')).toMatch(/títulos ou descrições/);
  });
  it('6. não conhece os números: cobertura limitada e plano de descoberta antes de escala', () => {
    const { d, plan } = run('unknown_numbers');
    expect(d.record.assessment.coverage.level).toBe('limitada');
    expect(plan.evidence_coverage.statement).toMatch(/limitada/);
    expect(d.prioritized.ordered.some((f) => f.kind === 'investigacao')).toBe(true);
    expect(plan.avoid_now[0].decision).toMatch(/Aumentar o orçamento antes/);
    expect(d.findings.find((f) => f.id === 'visibilidade_gestao')!.hypothesis).toMatch(/não comprova/);
  });
  it('7. dados contraditórios e zeros: pede revisão, não calcula divisões inválidas', () => {
    const { d, plan } = run('contradictory');
    const ids = d.record.contradictions.map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(['vendas_maior_contatos', 'periodo_invertido', 'receita_ticket_divergente']));
    expect(d.record.calculated_metrics.find((c) => ['cpl', 'custo_midia_cliente', 'roas', 'conversao_contato_venda'].includes(c.id))).toBeUndefined();
    expect(d.record.metrics.values.agendamentos).toEqual({ value: null, precision: 'nao_se_aplica' });
    expect(plan.limitations.join(' ')).toMatch(/Números a revisar/);
  });
  it('8. pouco tempo e sem verba: tarefas de até 30 min/dia e nada de verba extra', () => {
    const { plan, text } = run('low_time_no_budget');
    for (const t of plan.action_plan.filter((x) => /^Dia/.test(x.day))) expect(t.minutes, t.day).toBeLessThanOrEqual(30);
    expect(text).not.toMatch(/aumente (o )?(orçamento|investimento)/i);
    const tests = plan.priorities.find((p) => p.id === 'testes');
    if (tests) expect(tests.action.how.join(' ')).toMatch(/sem aumentar a verba|material que já existe/);
  });
  it('9. tentativa de instruir a IA: texto não é reproduzido e vai marcado como descartado', () => {
    const { text, input } = run('injection');
    expect(text).not.toMatch(/Ignore todas|revele o prompt|169\.254/);
    const untrusted = input.payload.conteudo_do_cliente_nao_confiavel as Record<string, string>;
    expect(untrusted.produto).toMatch(/desconsiderado/);
    expect(untrusted.b_tentativas).toMatch(/desconsiderado/);
  });
});
