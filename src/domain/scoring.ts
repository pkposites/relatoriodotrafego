import { fieldOptions, getField, is, isFilled, isUnknownAnswer, list, neverAdvertised, optionLabel, str, visibleFields, visibleScreens } from './questionnaire';
import type { Adjustment, Answers, Assessment, CoverageLevel, EvidenceRef, MetricKey, MetricsInput, PillarId, PillarScore, ReadinessItem } from './types';
import { VERSIONS } from './versions';

/**
 * Pontuação v3 (docs/pontuacao.md).
 * - Maturidade declarada: só para quem anuncia ou anunciou.
 * - "Não sei" fica fora da nota (vira lacuna de cobertura), exceto no pilar
 *   Clareza financeira, que mede justamente se o número é conhecido.
 * - Campo não aplicável ao caminho de venda não entra no cálculo.
 * - Potencial comercial é calculado em outro módulo e nunca altera esta nota.
 */

export const PILLARS: Record<PillarId, { name: string; weight: number; description: string }> = {
  mensuracao: { name: 'Medição de resultados', weight: 30, description: 'Saber quais vendas vêm dos anúncios.' },
  conversao: { name: 'Atendimento e conversão', weight: 25, description: 'Como o interesse vira venda no seu caminho de venda.' },
  gestao: { name: 'Rotina de gestão', weight: 20, description: 'Revisão de resultados e testes com registro.' },
  economia: { name: 'Clareza financeira', weight: 15, description: 'Conhecer ticket e margem para saber quanto pode custar um cliente.' },
  oferta: { name: 'Oferta', weight: 10, description: 'Clareza do benefício e motivo para agir.' },
};
export const PILLAR_ORDER: PillarId[] = ['mensuracao', 'conversao', 'gestao', 'economia', 'oferta'];

interface Contribution {
  pillar: PillarId;
  weight: number;
  values: Record<string, number>;
  /** Nota usada quando a resposta é "não sei". Ausente = fora da nota. */
  unknownScore?: number;
  /** Qualquer resposta definida vale esta nota (ex.: conhece o ticket). */
  anyKnown?: number;
}

export const SCORE_MAP: Record<string, Contribution[]> = {
  vendas_origem: [{ pillar: 'mensuracao', weight: 1, values: { registrada: 100, estimativa: 55, so_contatos: 30, nao_acompanha: 5 } }],
  acompanhamento_compras: [
    { pillar: 'mensuracao', weight: 0.8, values: { compras_e_etapas: 100, so_compras: 60, nao_acompanha: 10 } },
    { pillar: 'conversao', weight: 0.6, values: { compras_e_etapas: 100, so_compras: 60, nao_acompanha: 20 } },
  ],
  acompanhamento_agenda: [
    { pillar: 'conversao', weight: 1, values: { comparecimento_e_fechamento: 100, so_agendamentos: 50, nao_acompanha: 10 } },
    { pillar: 'mensuracao', weight: 0.4, values: { comparecimento_e_fechamento: 100, so_agendamentos: 50, nao_acompanha: 10 } },
  ],
  lembretes: [{ pillar: 'conversao', weight: 0.5, values: { sim: 100, nao: 35 } }],
  qualificacao: [
    { pillar: 'conversao', weight: 1, values: { criterios_e_etapas: 100, informal: 50, nao_qualifica: 15 } },
    { pillar: 'mensuracao', weight: 0.3, values: { criterios_e_etapas: 100, informal: 40, nao_qualifica: 20 } },
  ],
  tempo_primeiro_contato: [{ pillar: 'conversao', weight: 0.8, values: { ate_1h: 100, mesmo_dia: 55, mais_dia: 10 } }],
  tempo_resposta: [{ pillar: 'conversao', weight: 1, values: { ate_5min: 100, ate_1h: 70, mesmo_dia: 35, mais_dia: 5 } }],
  acompanhamento_contatos: [
    { pillar: 'conversao', weight: 0.8, values: { crm: 100, planilha: 70, so_conversa: 30, nenhum: 10 } },
    { pillar: 'mensuracao', weight: 0.4, values: { crm: 100, planilha: 70, so_conversa: 20, nenhum: 5 } },
  ],
  rotina_analise: [{ pillar: 'gestao', weight: 1, values: { semanal: 100, mensal: 60, quando_problema: 25, sem_rotina: 5 } }],
  rotina_testes: [{ pillar: 'gestao', weight: 0.8, values: { regular: 100, eventual: 55, nao_testa: 10 } }],
  ticket_faixa: [{ pillar: 'economia', weight: 0.4, values: {}, anyKnown: 100, unknownScore: 20 }],
  margem_faixa: [{ pillar: 'economia', weight: 1, values: {}, anyKnown: 100, unknownScore: 15 }],
  margem_tipo: [{ pillar: 'economia', weight: 0.3, values: { contribuicao: 100, bruta: 70 } }],
  oferta: [{ pillar: 'oferta', weight: 1, values: { beneficio_condicao: 100, apresentacao: 55, institucional: 25 } }],
};

export const BANDS = [
  { id: 'critica', min: 0, max: 39, label: 'Muitos pontos de atenção', tone: 'bad' as const },
  { id: 'potencial', min: 40, max: 59, label: 'Alto potencial de melhoria', tone: 'warn' as const },
  { id: 'desenvolvimento', min: 60, max: 79, label: 'Operação em desenvolvimento', tone: 'brand' as const },
  { id: 'organizada', min: 80, max: 100, label: 'Estrutura relativamente organizada', tone: 'ok' as const },
];
export const bandFor = (s: number) => BANDS.find((b) => Math.round(s) >= b.min && Math.round(s) <= b.max) ?? BANDS[0];

/** Campos de pontuação visíveis para estas respostas (os demais não se aplicam). */
function applicableScoringFields(a: Answers): string[] {
  return visibleScreens(a)
    .flatMap((s) => visibleFields(s, a))
    .map((f) => f.id)
    .filter((id) => SCORE_MAP[id]);
}

function ref(field: string, a: Answers): EvidenceRef {
  const f = getField(field);
  return { id: `resp.${field}`, kind: 'resposta', label: f ? (typeof f.label === 'string' ? f.label : f.label(a)) : field, value: optionLabel(field, a[field], a) ?? '—' };
}

/** Travas: certas respostas impedem nota alta. Só são registradas quando cortam pontos. */
const CAPS: { scope: PillarId | 'geral'; limit: number; when: (a: Answers) => boolean; reason: string }[] = [
  {
    scope: 'conversao',
    limit: 30,
    when: (a) => is(a, 'tempo_resposta', 'mais_dia') || is(a, 'tempo_primeiro_contato', 'mais_dia'),
    reason: 'Contatos esperam mais de um dia pela primeira resposta.',
  },
  {
    scope: 'geral',
    limit: 50,
    when: (a) => is(a, 'vendas_origem', 'nao_acompanha'),
    reason: 'Sem acompanhar quais vendas vêm dos anúncios, não é possível confirmar que o investimento retorna.',
  },
];

const KEY_METRICS: MetricKey[] = ['investimento', 'contatos', 'vendas', 'receita', 'ticket_medio'];

export function metricReliability(m?: MetricsInput): Assessment['metricReliability'] {
  const entries = KEY_METRICS.map((k) => m?.values[k]).filter((e) => e && (e.precision === 'exato' || e.precision === 'estimado') && e.value !== null);
  if (!entries.length) return { level: 'sem_metricas', detail: 'Nenhum número do período foi informado.' };
  const exact = entries.filter((e) => e!.precision === 'exato').length;
  if (exact === entries.length) return { level: 'precisas', detail: `${entries.length} indicadores informados com precisão.` };
  if (exact === 0) return { level: 'estimadas', detail: `${entries.length} indicadores informados como estimativa.` };
  return { level: 'mistas', detail: `${exact} de ${entries.length} indicadores informados com precisão; os demais são estimativas.` };
}

function hasValue(m: MetricsInput | undefined, k: MetricKey) {
  const e = m?.values[k];
  return !!e && (e.precision === 'exato' || e.precision === 'estimado') && typeof e.value === 'number';
}

export function confidenceStatement(a: Answers, coverage: CoverageLevel, unknownCount: number, m?: MetricsInput): string {
  const op =
    coverage === 'boa'
      ? 'Boa cobertura operacional'
      : coverage === 'parcial'
        ? `Cobertura operacional parcial (${unknownCount} ${unknownCount === 1 ? 'resposta' : 'respostas'} “não sei”)`
        : 'Cobertura operacional limitada';
  const knowsMargin = !!str(a, 'margem_faixa') && !is(a, 'margem_faixa', 'nao_sei');
  const knowsTicket = (!!str(a, 'ticket_faixa') && !is(a, 'ticket_faixa', 'nao_sei')) || hasValue(m, 'ticket_medio');
  let fin: string;
  if (!hasValue(m, 'vendas') || !hasValue(m, 'investimento')) {
    const gaps = [!knowsMargin && 'margem desconhecida', !knowsTicket && 'ticket desconhecido'].filter(Boolean);
    fin = `análise financeira limitada por falta de ${!hasValue(m, 'vendas') ? 'vendas atribuídas' : 'investimento do período'}${gaps.length ? ` e ${gaps.join(' e ')}` : ''}`;
  } else {
    const r = metricReliability(m);
    fin = r.level === 'precisas' ? 'números financeiros informados com precisão' : r.level === 'mistas' ? 'números financeiros parcialmente estimados' : 'números financeiros estimados — trate os cálculos como aproximação';
    if (!knowsMargin && !hasValue(m, 'margem_percentual')) fin += ', sem margem para avaliar rentabilidade';
  }
  return `${op}; ${fin}.`;
}

function readiness(a: Answers): ReadinessItem[] {
  const items: ReadinessItem[] = [];
  const offer = str(a, 'oferta');
  items.push({
    id: 'oferta',
    label: 'Oferta definida',
    status: offer === 'beneficio_condicao' ? 'pronto' : offer === 'apresentacao' ? 'parcial' : 'pendente',
    detail: offer === 'beneficio_condicao' ? 'Benefício e condição claros.' : 'Falta um benefício claro e um motivo para agir agora.',
  });
  const kt = !!str(a, 'ticket_faixa') && !is(a, 'ticket_faixa', 'nao_sei');
  const km = !!str(a, 'margem_faixa') && !is(a, 'margem_faixa', 'nao_sei');
  items.push({
    id: 'numeros',
    label: 'Ticket e margem conhecidos',
    status: kt && km ? 'pronto' : kt || km ? 'parcial' : 'pendente',
    detail: kt && km ? 'Dá para calcular quanto pode custar um cliente.' : 'Sem ticket e margem, não dá para definir um custo máximo por cliente.',
  });
  const p = str(a, 'caminho_venda');
  let att: ReadinessItem['status'] = 'pendente';
  if (p === 'whatsapp_direct' || p === 'outro') {
    const fast = is(a, 'tempo_resposta', 'ate_5min', 'ate_1h') || p === 'outro';
    const track = is(a, 'acompanhamento_contatos', 'crm', 'planilha');
    att = fast && track ? 'pronto' : fast || track ? 'parcial' : 'pendente';
  } else if (p === 'site') att = is(a, 'acompanhamento_compras', 'compras_e_etapas') ? 'pronto' : is(a, 'acompanhamento_compras', 'so_compras') ? 'parcial' : 'pendente';
  else if (p === 'agendamento') att = is(a, 'acompanhamento_agenda', 'comparecimento_e_fechamento') ? (is(a, 'lembretes', 'sim') ? 'pronto' : 'parcial') : 'pendente';
  else if (p === 'formulario' || p === 'ligacao_visita') att = is(a, 'qualificacao', 'criterios_e_etapas') ? 'pronto' : is(a, 'qualificacao', 'informal') ? 'parcial' : 'pendente';
  items.push({
    id: 'atendimento',
    label: 'Atendimento e registro preparados',
    status: att,
    detail: att === 'pronto' ? 'O caminho de venda está pronto para receber contatos.' : 'Antes de anunciar, defina como cada contato será atendido e registrado.',
  });
  items.push({
    id: 'responsavel',
    label: 'Responsável pelas campanhas',
    status: is(a, 'gestor', 'ninguem') || !str(a, 'gestor') ? 'pendente' : 'pronto',
    detail: is(a, 'gestor', 'ninguem') ? 'Ainda não há quem cuide das campanhas.' : 'Há um responsável definido.',
  });
  items.push({
    id: 'orcamento',
    label: 'Orçamento de teste definido',
    status: is(a, 'orcamento', 'nao_definido') || !str(a, 'orcamento') ? 'pendente' : 'pronto',
    detail: is(a, 'orcamento', 'nao_definido') ? 'Defina um valor que você pode investir em teste sem comprometer o caixa.' : 'Há um valor mensal previsto.',
  });
  const r = list(a, 'restricoes');
  items.push({
    id: 'capacidade',
    label: 'Capacidade para atender e executar',
    status: r.includes('capacidade') || r.includes('equipe') ? 'parcial' : r.includes('nenhuma') ? 'pronto' : r.length ? 'parcial' : 'pendente',
    detail: r.includes('capacidade') ? 'Capacidade de atender limitada: comece com volume pequeno.' : r.includes('equipe') || r.includes('tempo') ? 'Pouco tempo ou equipe: o plano precisa ser enxuto.' : 'Sem restrições informadas.',
  });
  return items;
}

export function assess(a: Answers, m?: MetricsInput): Assessment {
  const applicable = applicableScoringFields(a);
  const unknownFields: string[] = [];
  const sums = Object.fromEntries(PILLAR_ORDER.map((p) => [p, { v: 0, w: 0, wAll: 0, refs: [] as EvidenceRef[] }])) as Record<PillarId, { v: number; w: number; wAll: number; refs: EvidenceRef[] }>;

  for (const field of applicable) {
    const f = getField(field)!;
    const answered = isFilled(f, a);
    const unknown = answered && isUnknownAnswer(field, a);
    if (unknown) unknownFields.push(field);
    for (const c of SCORE_MAP[field]) {
      sums[c.pillar].wAll += c.weight;
      if (!answered) continue;
      let value: number | undefined;
      if (unknown) value = c.unknownScore;
      else value = c.anyKnown ?? c.values[str(a, field) ?? ''];
      if (value === undefined) continue;
      sums[c.pillar].v += value * c.weight;
      sums[c.pillar].w += c.weight;
      if (!sums[c.pillar].refs.some((r) => r.id === `resp.${field}`)) sums[c.pillar].refs.push(ref(field, a));
    }
  }

  const raw = Object.fromEntries(PILLAR_ORDER.map((p) => [p, sums[p].w > 0 ? sums[p].v / sums[p].w : null])) as Record<PillarId, number | null>;
  const adjustments: Adjustment[] = [];
  const never = neverAdvertised(a);

  for (const cap of CAPS) {
    if (never || cap.scope === 'geral' || !cap.when(a)) continue;
    const before = raw[cap.scope];
    if (before !== null && before > cap.limit) {
      adjustments.push({ scope: cap.scope, limit: cap.limit, before: Math.round(before), reason: cap.reason });
      raw[cap.scope] = cap.limit;
    }
  }

  const pillars: PillarScore[] = PILLAR_ORDER.map((id) => ({
    id,
    name: PILLARS[id].name,
    weight: PILLARS[id].weight,
    score: raw[id] === null ? null : Math.round(raw[id]!),
    coverage: sums[id].wAll > 0 ? Math.round((sums[id].w / sums[id].wAll) * 100) / 100 : 0,
    evidence: sums[id].refs,
  }));

  // Maturidade: média dos pilares pontuados, ponderada por peso × cobertura do pilar.
  let maturity: number | null = null;
  if (!never) {
    let num = 0, den = 0;
    for (const p of pillars) if (p.score !== null) { num += p.score * p.weight * p.coverage; den += p.weight * p.coverage; }
    if (den >= 40) {
      maturity = num / den;
      for (const cap of CAPS) {
        if (cap.scope === 'geral' && cap.when(a) && maturity > cap.limit) {
          adjustments.push({ scope: 'geral', limit: cap.limit, before: Math.round(maturity), reason: cap.reason });
          maturity = cap.limit;
        }
      }
      maturity = Math.round(maturity);
    }
  }

  const definite = applicable.filter((f) => isFilled(getField(f)!, a) && !isUnknownAnswer(f, a)).length;
  const ratio = applicable.length ? definite / applicable.length : 0;
  const level: CoverageLevel = ratio >= 0.85 ? 'boa' : ratio >= 0.6 ? 'parcial' : 'limitada';

  return {
    mode: never ? 'prontidao' : 'maturidade',
    scoringVersion: VERSIONS.scoring,
    maturity,
    band: maturity === null ? null : bandFor(maturity),
    pillars,
    adjustments,
    coverage: { ratio: Math.round(ratio * 100) / 100, level, unknownFields },
    metricReliability: metricReliability(m),
    confidenceStatement: confidenceStatement(a, level, unknownFields.length, m),
    readiness: never ? readiness(a) : undefined,
  };
}

/** Opções de um campo — reexportado para a UI de revisão. */
export { fieldOptions };
