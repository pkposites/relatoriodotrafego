import type { PlanOutput, PlanPriority } from '../ai/outputSchema';
import { findCalc } from './calculations';
import { profileText, type Diagnostic } from './diagnostic';
import { evCalc } from './findings';
import { advertises, is, list, neverAdvertised, optionLabel, str, suspiciousTextFields } from './questionnaire';
import { PILLARS } from './scoring';
import { TEMPLATES } from './templates';
import type { Answers, EvidenceRef, Finding } from './types';

/**
 * Plano determinístico: mesma estrutura da saída da IA.
 * Usado (1) para os relatórios de exemplo, (2) como base factual enviada à IA
 * e (3) como referência do validador. Não inventa nada além das regras.
 */

function toPriority(f: Finding): PlanPriority {
  return {
    id: f.id,
    title: f.title,
    kind: f.kind,
    fact: f.fact,
    hypothesis: f.hypothesis,
    possible_consequence: f.consequence,
    how_to_confirm: f.howToConfirm,
    evidence_refs: f.evidence.map((e) => e.id),
    action: {
      what: f.action.what,
      why: f.action.why,
      how: f.action.how,
      owner: f.action.owner,
      effort: f.action.effort,
      effort_estimate: f.action.effortHours,
      dependencies: f.action.dependencies,
      done_criteria: f.action.doneCriteria,
      indicator: f.action.indicator,
      review_when: f.action.reviewWhen,
    },
  };
}

function conversionMap(d: Diagnostic, a: Answers): PlanOutput['conversion_map'] {
  const v = d.record.metrics.values;
  const metricStatus = (k: 'contatos' | 'vendas' | 'agendamentos' | 'comparecimentos') =>
    v[k]?.precision === 'exato' ? 'medido' : v[k]?.precision === 'estimado' ? 'estimado' : null;
  const out: PlanOutput['conversion_map'] = [];
  out.push(
    advertises(a)
      ? { stage: 'Anúncio', status: 'medido', note: 'Impressões e cliques são registrados pelas plataformas.' }
      : { stage: 'Anúncio', status: 'nao_se_aplica', note: 'Ainda não há campanhas.' },
  );
  const path = str(a, 'caminho_venda');
  if (path === 'site') {
    const s = is(a, 'acompanhamento_compras', 'compras_e_etapas') ? 'medido' : is(a, 'acompanhamento_compras', 'so_compras') ? 'estimado' : 'desconhecido';
    out.push({ stage: 'Site e checkout', status: s, note: optionLabel('acompanhamento_compras', a.acompanhamento_compras, a) ?? 'Sem informação.' });
  } else {
    const declared = is(a, 'acompanhamento_contatos', 'crm', 'planilha') || is(a, 'acompanhamento_agenda', 'comparecimento_e_fechamento', 'so_agendamentos') || is(a, 'qualificacao', 'criterios_e_etapas');
    const weak = is(a, 'acompanhamento_contatos', 'so_conversa');
    out.push({
      stage: 'Contato',
      status: metricStatus('contatos') ?? (declared ? 'medido' : weak ? 'estimado' : 'desconhecido'),
      note: v.contatos?.value != null ? `${v.contatos.value} contatos informados no período.` : 'Conforme registro declarado.',
    });
    if (path === 'agendamento') {
      out.push({
        stage: 'Agendamento e comparecimento',
        status: metricStatus('comparecimentos') ?? (is(a, 'acompanhamento_agenda', 'comparecimento_e_fechamento') ? 'medido' : is(a, 'acompanhamento_agenda', 'so_agendamentos') ? 'estimado' : 'desconhecido'),
        note: optionLabel('acompanhamento_agenda', a.acompanhamento_agenda, a) ?? 'Sem informação.',
      });
    } else {
      const t = optionLabel('tempo_resposta', a.tempo_resposta, a) ?? optionLabel('tempo_primeiro_contato', a.tempo_primeiro_contato, a);
      out.push({ stage: 'Atendimento', status: t && !is(a, 'tempo_resposta', 'nao_sei') && !is(a, 'tempo_primeiro_contato', 'nao_sei') ? 'estimado' : 'desconhecido', note: t ? `Tempo de resposta declarado: ${t.toLowerCase()}.` : 'Tempo de resposta não informado.' });
    }
  }
  out.push({
    stage: 'Venda',
    status: metricStatus('vendas') ?? (is(a, 'vendas_origem', 'registrada') ? 'medido' : is(a, 'vendas_origem', 'estimativa') ? 'estimado' : neverAdvertised(a) ? 'nao_se_aplica' : 'desconhecido'),
    note: optionLabel('vendas_origem', a.vendas_origem, a) ?? (neverAdvertised(a) ? 'Ainda sem vendas por anúncio.' : 'Origem das vendas não informada.'),
  });
  return out;
}

function interpretation(score: number | null): string {
  if (score === null) return 'Sem respostas suficientes para avaliar este pilar.';
  if (score >= 80) return 'As respostas indicam uma prática estruturada.';
  if (score >= 60) return 'Há base, com pontos a consolidar.';
  if (score >= 40) return 'Prática parcial: funciona em parte, sem registro ou rotina consistentes.';
  return 'Prática ausente ou muito frágil, segundo as respostas.';
}

function minutesOf(f: Finding): number {
  return f.action.effort === 'baixo' ? 45 : f.action.effort === 'medio' ? 120 : 240;
}

function sevenDays(d: Diagnostic, priorities: Finding[], a: Answers): PlanOutput['action_plan'] {
  const short = list(a, 'restricoes').includes('tempo') || is(a, 'b_tempo_semanal', 'menos_1h');
  const cap = short ? 30 : 90; // minutos por dia
  const tasks: PlanOutput['action_plan'] = [];
  const queue: { task: string; owner: string; minutes: number; id: string }[] = [];
  for (const f of priorities) {
    const total = minutesOf(f);
    const setup = Math.min(total, cap);
    queue.push({ task: `${f.action.what}: ${f.action.how[0].replace(/\.$/, '')}.`, owner: f.action.owner, minutes: setup, id: f.id });
    if (f.action.how.length > 1)
      queue.push({ task: `${f.action.how.slice(1, 3).map((s) => s.replace(/\.$/, '')).join('; ')}.`, owner: f.action.owner, minutes: Math.min(Math.max(total - setup, 20), cap), id: f.id });
  }
  const recurring = priorities.find((f) => f.id === 'registrar_origem' || f.id === 'controle_contatos' || f.id === 'agenda_registro');
  for (let day = 1; day <= 6; day++) {
    const next = queue.shift();
    if (next) tasks.push({ day: `Dia ${day}`, task: next.task, owner: next.owner, minutes: next.minutes, priority_id: next.id });
    else if (recurring) tasks.push({ day: `Dia ${day}`, task: `Manter o registro iniciado (${recurring.action.what.toLowerCase()}) — sem novas mudanças.`, owner: recurring.action.owner, minutes: 10, priority_id: recurring.id });
    else tasks.push({ day: `Dia ${day}`, task: 'Observar, sem novas mudanças.', owner: 'Você', minutes: 5, priority_id: null });
  }
  tasks.push({ day: 'Dia 7', task: 'Revisão da semana: o que foi concluído pelos critérios de conclusão e o que ficou pendente. Anote a decisão para a próxima semana.', owner: 'Você', minutes: 30, priority_id: null });
  if (queue.length) tasks.push({ day: 'Semana 2', task: `Continuar: ${queue.map((q) => q.task.split(':')[0]).filter((v, i, arr) => arr.indexOf(v) === i).join('; ')}.`, owner: queue[0].owner, minutes: queue.reduce((s, q) => s + q.minutes, 0), priority_id: queue[0].id });
  void d;
  return tasks;
}

export function buildPlan(d: Diagnostic, a: Answers): PlanOutput {
  const { record, prioritized } = d;
  const as = record.assessment;
  const priorities = prioritized.ordered.slice(0, 3);
  const refs = new Map<string, EvidenceRef>();
  const addRefs = (list: EvidenceRef[]) => list.forEach((r) => refs.set(r.id, r));
  priorities.forEach((f) => addRefs(f.evidence));
  as.pillars.forEach((p) => addRefs(p.evidence));
  record.calculated_metrics.forEach((c) => addRefs([evCalc(c)]));
  record.evidence.links.forEach((l, i) => refs.set(`link.${i}`, { id: `link.${i}`, kind: 'link', label: 'Link informado (não acessado)', value: l.url }));

  const templateIds = [...new Set(priorities.flatMap((f) => f.templates))].filter((t) => TEMPLATES[t]);
  const templateReason = (id: string) => {
    const f = priorities.find((p) => p.templates.includes(id))!;
    return `Apoia a prioridade “${f.title}”.`;
  };

  const limitations = [
    'Análise baseada nas respostas e nos números informados; as contas de anúncio, o site e os criativos não foram acessados.',
    as.confidenceStatement,
    ...record.evidence.links.map((l) => `Link informado (${l.url}) registrado como contexto, mas não acessado.`),
    ...record.contradictions.map((c) => `Números a revisar: ${c.message}`),
  ];
  if (suspiciousTextFields(a).length) limitations.push('Um ou mais textos livres foram desconsiderados por conter instruções, endereços ou código.');
  if (record.missing_fields.length) limitations.push(`Informações não disponíveis: ${record.missing_fields.length} campo(s) com “não sei” ou sem resposta.`);

  const assumptions: string[] = [];
  for (const c of record.calculated_metrics) for (const cv of c.caveats) if (!assumptions.includes(cv)) assumptions.push(cv);
  if (record.metrics.period) assumptions.push(`Todos os cálculos usam o período de ${record.metrics.period.start} a ${record.metrics.period.end}.`);

  const qw = prioritized.quickWin;
  const st = prioritized.structural;
  const indicators: PlanOutput['indicators'] = record.calculated_metrics.map((c) => ({
    evidence_ref: `calc.${c.id}`,
    label: c.label,
    value: evCalc(c).value,
    formula: c.formula,
    caveat: c.caveats.length ? c.caveats.join(' ') : null,
  }));

  const reviewMetrics = priorities.map((f) => ({ name: f.action.indicator.split(';')[0], how: f.action.reviewWhen }));
  const roasEq = findCalc(record.calculated_metrics, 'roas_equilibrio');

  return {
    executive_summary: {
      scenario: `${profileText(a)}${as.maturity !== null ? ` Maturidade declarada: ${as.maturity}/100 (${as.band!.label.toLowerCase()}).` : neverAdvertised(a) ? ' Avaliação de preparação (sem nota de campanhas).' : ''}`,
      main_hypothesis: (st ?? priorities[0])?.hypothesis ?? 'Não há evidência suficiente para uma hipótese principal.',
      structural_priority: st ? st.title : 'Nenhuma prioridade estrutural identificada com as informações disponíveis.',
      quick_win: qw ? `${qw.title}. ${prioritized.quickWinRationale ?? ''}`.trim() : 'Nenhuma ação rápida identificada com segurança.',
      main_limitation: as.confidenceStatement,
    },
    evidence_coverage: {
      operational: as.coverage.level,
      financial: as.metricReliability.detail,
      statement: as.confidenceStatement,
    },
    limitations,
    conversion_map: conversionMap(d, a),
    indicators,
    pillar_assessments: as.pillars.map((p) => {
      const f = d.findings.find((x) => x.pillar === p.id);
      return {
        pillar: PILLARS[p.id].name,
        score: as.mode === 'maturidade' ? p.score : null,
        evidence_refs: p.evidence.map((e) => e.id),
        interpretation: as.mode === 'maturidade' ? interpretation(p.score) : 'Avaliação de preparação: veja a lista de itens prontos e pendentes.',
        to_confirm: f ? f.howToConfirm : 'Nada específico a confirmar com as informações atuais.',
      };
    }),
    priorities: priorities.map(toPriority),
    quick_win: { priority_id: qw?.id ?? null, rationale: prioritized.quickWinRationale ?? (qw ? 'Ação de baixo esforço que pode ser feita imediatamente.' : 'Sem ação rápida identificada.') },
    action_plan: sevenDays(d, priorities, a),
    selected_templates: templateIds.map((id) => ({ template_id: id, reason: templateReason(id) })),
    avoid_now: prioritized.avoidNow,
    measurement_plan: {
      review_in_days: priorities.some((f) => f.pillar === 'mensuracao') ? 14 : 7,
      metrics: reviewMetrics.length ? reviewMetrics : [{ name: 'Vendas por origem', how: 'Semanalmente' }],
      continue_if: 'As tarefas foram concluídas pelos critérios de conclusão e os indicadores passaram a ser registrados toda semana.',
      adjust_if: `Uma tarefa não puder ser concluída com o tempo e a equipe disponíveis, ou os registros mostrarem que o problema está em outra etapa.${roasEq ? ` Use o ROAS de equilíbrio aproximado (${evCalc(roasEq).value}) como referência mínima, não como meta.` : ''}`,
      execution_vs_results_note: 'Executar as tarefas leva dias; ver efeito nos resultados pode levar semanas, conforme o volume de contatos e o ciclo de venda. Não avalie o plano só pelos números da primeira semana.',
    },
    assumptions,
    evidence_references: [...refs.values()].map((r) => ({ id: r.id, kind: r.kind, label: r.label, value: r.value })),
  };
}
