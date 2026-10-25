import { PILLARS, PILLAR_ORDER, QUESTIONS, answerIds, has, single } from '../data/questions';
import type {
  Answers,
  Band,
  ConfidenceLevel,
  EvidenceLevel,
  OptionalMetricsInput,
  PillarId,
  PillarResult,
  Question,
  ScoreAdjustment,
  ScoreResult,
} from '../types';
import { computeEconomics } from './economics';
import { hasAnyMetric } from './metrics';

export const BANDS: Band[] = [
  { id: 'critica', min: 0, max: 39, label: 'Estrutura crítica / muitos pontos de atenção', tone: 'bad' },
  { id: 'potencial', min: 40, max: 59, label: 'Alto potencial de melhoria', tone: 'warn' },
  { id: 'desenvolvimento', min: 60, max: 79, label: 'Operação em desenvolvimento', tone: 'brand' },
  { id: 'organizada', min: 80, max: 100, label: 'Estrutura relativamente organizada', tone: 'ok' },
];

export function bandFor(score: number): Band {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  return BANDS.find((b) => s >= b.min && s <= b.max) ?? BANDS[0];
}

/** Peso máximo de evidência que uma pergunta dá a um pilar. */
function maxWeight(q: Question, p: PillarId): number {
  if (q.multi) return q.multiWeights?.[p] ?? 0;
  return Math.max(0, ...q.options.map((o) => o.scores?.[p]?.weight ?? 0));
}

/** Soma máxima de pesos de evidência que cada pilar pode receber, derivada de questions.ts. */
export function nominalEvidence(): Record<PillarId, number> {
  const totals = Object.fromEntries(PILLAR_ORDER.map((p) => [p, 0])) as Record<PillarId, number>;
  for (const q of QUESTIONS) for (const p of PILLAR_ORDER) totals[p] += maxWeight(q, p);
  return totals;
}

const NOMINAL = nominalEvidence();

export function isAnswered(q: Question, answers: Answers): boolean {
  return answerIds(q.id, answers[q.id]).length > 0;
}

/** Todas as perguntas respondidas com opções válidas. */
export function isComplete(answers: Answers): boolean {
  return QUESTIONS.every((q) => isAnswered(q, answers));
}

export function answeredCount(answers: Answers): number {
  return QUESTIONS.filter((q) => isAnswered(q, answers)).length;
}

function evidenceLevel(e: number): EvidenceLevel {
  if (e >= 0.85) return 'plena';
  if (e >= 0.6) return 'parcial';
  return 'limitada';
}

function confidenceLevel(c: number): ConfidenceLevel {
  if (c >= 0.85) return 'alta';
  if (c >= 0.6) return 'media';
  return 'baixa';
}

/** Contribuições de uma pergunta para os pilares, conforme a resposta. */
function contributions(q: Question, answers: Answers): Partial<Record<PillarId, { value: number; weight: number }>> {
  const ids = answerIds(q.id, answers[q.id]);
  if (!ids.length) return {};
  if (q.multi) {
    const opts = q.options.filter((o) => ids.includes(o.id));
    const uncertain = opts.some((o) => o.uncertain);
    const value = Math.min(100, opts.reduce((s, o) => s + (o.points ?? 0), 0));
    const out: Partial<Record<PillarId, { value: number; weight: number }>> = {};
    for (const [p, w] of Object.entries(q.multiWeights ?? {}) as [PillarId, number][]) {
      out[p] = { value, weight: uncertain ? w * 0.5 : w };
    }
    return out;
  }
  return q.options.find((o) => o.id === ids[0])?.scores ?? {};
}

interface Rule {
  scope: PillarId | 'geral';
  kind: 'cap' | 'floor';
  limit: number;
  applies: (a: Answers, m?: OptionalMetricsInput) => boolean;
  reason: (a: Answers, m?: OptionalMetricsInput) => string;
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Travas realistas: certas combinações impedem nota alta, por mais que o
 * resto esteja bem. Pisos só existem quando há números declarados que os sustentam.
 */
const RULES: Rule[] = [
  {
    scope: 'estrategia',
    kind: 'cap',
    limit: 35,
    applies: (a) => single(a, 'otimizacao') === 'trafego_engajamento',
    reason: () => 'Campanhas otimizadas para cliques, alcance ou engajamento entregam exatamente isso — não necessariamente clientes.',
  },
  {
    scope: 'estrategia',
    kind: 'cap',
    limit: 40,
    applies: (a) => single(a, 'estrutura') === 'impulsionar',
    reason: () => 'O botão “Impulsionar” tem poucas opções de otimização e de mensuração comparado ao Gerenciador de Anúncios.',
  },
  {
    scope: 'criativos',
    kind: 'cap',
    limit: 35,
    applies: (a) => single(a, 'criativos_volume') === 'mesmos',
    reason: () => 'Anúncios iguais há meses tendem a saturar o público e encarecer os resultados.',
  },
  {
    scope: 'conversao',
    kind: 'cap',
    limit: 30,
    applies: (a) => single(a, 'tempo_resposta') === 'mais_dia',
    reason: () => 'Contatos respondidos depois de um dia esfriam muito; boa parte do investimento se perde no atendimento.',
  },
  {
    scope: 'rentabilidade',
    kind: 'cap',
    limit: 25,
    applies: (a, m) => computeEconomics(a, m).status === 'acima_da_margem',
    reason: (a, m) => {
      const e = computeEconomics(a, m);
      return `O custo por venda informado (${brl(e.cpa!)}) está acima do lucro bruto estimado por venda (${brl(e.grossProfitPerSale!)}).`;
    },
  },
  {
    scope: 'rentabilidade',
    kind: 'floor',
    limit: 75,
    applies: (a, m) => computeEconomics(a, m).status === 'saudavel',
    reason: (a, m) => {
      const e = computeEconomics(a, m);
      return `Seus números indicam folga: custo por venda (${brl(e.cpa!)}) bem abaixo do lucro bruto estimado por venda (${brl(e.grossProfitPerSale!)}).`;
    },
  },
  {
    scope: 'geral',
    kind: 'cap',
    limit: 45,
    applies: (a) =>
      single(a, 'vendas_origem') === 'nao_identifica' && !has(a, 'rastreamento', 'pixel') && !has(a, 'rastreamento', 'capi'),
    reason: () =>
      'Sem identificar as vendas e sem pixel ou API de Conversões, não há como confirmar que o investimento dá retorno — nem o algoritmo sabe quem compra.',
  },
  {
    scope: 'geral',
    kind: 'cap',
    limit: 55,
    applies: (a) => single(a, 'cac') === 'nao_sabe' && single(a, 'margem') === 'nao_sabe',
    reason: () => 'Sem conhecer a margem nem o custo por cliente, a rentabilidade dos anúncios não pode ser confirmada.',
  },
];

/**
 * Calcula o índice indicativo de maturidade de forma determinística.
 * 1. Pilar: média ponderada (0–100) das contribuições das respostas.
 * 2. Evidência do pilar: pesos obtidos ÷ pesos possíveis.
 * 3. Travas e pisos por pilar (combinações críticas ou números declarados).
 * 4. Índice geral: média dos pilares ponderada por peso estratégico × evidência.
 * 5. Travas gerais.
 * Perguntas de contexto, dor, objetivo e orçamento não alteram a nota.
 */
export function computeScore(answers: Answers, metrics?: OptionalMetricsInput): ScoreResult {
  const sums = Object.fromEntries(PILLAR_ORDER.map((p) => [p, { v: 0, w: 0 }])) as Record<PillarId, { v: number; w: number }>;

  for (const q of QUESTIONS) {
    for (const [p, c] of Object.entries(contributions(q, answers)) as [PillarId, { value: number; weight: number }][]) {
      if (!c || c.weight <= 0) continue;
      sums[p].v += c.value * c.weight;
      sums[p].w += c.weight;
    }
  }

  const adjustments: ScoreAdjustment[] = [];
  const raw = Object.fromEntries(PILLAR_ORDER.map((p) => [p, sums[p].w > 0 ? sums[p].v / sums[p].w : 0])) as Record<PillarId, number>;

  for (const r of RULES) {
    if (r.scope === 'geral' || !r.applies(answers, metrics)) continue;
    const before = raw[r.scope];
    const after = r.kind === 'cap' ? Math.min(before, r.limit) : Math.max(before, r.limit);
    if (Math.round(after) !== Math.round(before)) {
      adjustments.push({ kind: r.kind, scope: r.scope, limit: r.limit, before: Math.round(before), reason: r.reason(answers, metrics) });
      raw[r.scope] = after;
    }
  }

  const pillars: PillarResult[] = PILLAR_ORDER.map((id) => {
    const evidence = NOMINAL[id] > 0 ? Math.min(1, sums[id].w / NOMINAL[id]) : 0;
    return {
      id,
      name: PILLARS[id].name,
      weight: PILLARS[id].weight,
      score: Math.round(raw[id]),
      evidence: Math.round(evidence * 100) / 100,
      evidenceLevel: evidenceLevel(evidence),
    };
  });

  let num = 0;
  let den = 0;
  for (const p of pillars) {
    num += p.weight * p.evidence * raw[p.id];
    den += p.weight * p.evidence;
  }
  let overall = den > 0 ? num / den : 0;

  for (const r of RULES) {
    if (r.scope !== 'geral' || !r.applies(answers, metrics)) continue;
    if (overall > r.limit) {
      adjustments.push({ kind: 'cap', scope: 'geral', limit: r.limit, before: Math.round(overall), reason: r.reason(answers, metrics) });
      overall = r.limit;
    }
  }

  // Confiança: 80% evidência dos pilares, 20% contexto informado.
  const ctx =
    (single(answers, 'orcamento') && single(answers, 'orcamento') !== 'nao_informar' ? 0.3 : 0) +
    (single(answers, 'ticket') && single(answers, 'ticket') !== 'nao_sabe' ? 0.2 : 0) +
    (hasAnyMetric(metrics) ? 0.5 : 0);
  const confidence = Math.round((0.8 * (den / 100) + 0.2 * ctx) * 100) / 100;

  return {
    overall: Math.round(overall),
    adjustments,
    band: bandFor(overall),
    pillars,
    confidence,
    confidenceLevel: confidenceLevel(confidence),
    complete: isComplete(answers),
  };
}
