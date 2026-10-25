import { PILLARS, PILLAR_ORDER, QUESTIONS } from '../data/questions';
import type {
  Answers,
  Band,
  ConfidenceLevel,
  EvidenceLevel,
  OptionalMetricsInput,
  PillarId,
  PillarResult,
  ScoreResult,
} from '../types';
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

/** Soma máxima de pesos de evidência que cada pilar pode receber, derivada de questions.ts. */
export function nominalEvidence(): Record<PillarId, number> {
  const totals = Object.fromEntries(PILLAR_ORDER.map((p) => [p, 0])) as Record<PillarId, number>;
  for (const q of QUESTIONS) {
    for (const p of PILLAR_ORDER) {
      const max = Math.max(0, ...q.options.map((o) => o.scores?.[p]?.weight ?? 0));
      totals[p] += max;
    }
  }
  return totals;
}

const NOMINAL = nominalEvidence();

/** Perguntas obrigatórias para considerar o diagnóstico completo (todas as 12). */
export function isComplete(answers: Answers): boolean {
  return QUESTIONS.every((q) => {
    const a = answers[q.id];
    return !!a && q.options.some((o) => o.id === a);
  });
}

export function answeredCount(answers: Answers): number {
  return QUESTIONS.filter((q) => {
    const a = answers[q.id];
    return !!a && q.options.some((o) => o.id === a);
  }).length;
}

function evidenceLevel(e: number): EvidenceLevel {
  if (e >= 0.9) return 'plena';
  if (e >= 0.6) return 'parcial';
  return 'limitada';
}

function confidenceLevel(c: number): ConfidenceLevel {
  if (c >= 0.85) return 'alta';
  if (c >= 0.6) return 'media';
  return 'baixa';
}

const round = (n: number) => Math.round(n);

/**
 * Calcula o índice indicativo de maturidade de forma determinística.
 * - Cada pilar: média ponderada (0–100) das contribuições das respostas.
 * - Evidência do pilar: pesos obtidos ÷ pesos possíveis.
 * - Índice geral: média dos pilares ponderada por peso estratégico × evidência.
 * Perguntas de contexto, dor e orçamento não alteram a nota.
 */
export function computeScore(answers: Answers, metrics?: OptionalMetricsInput): ScoreResult {
  const sums = Object.fromEntries(PILLAR_ORDER.map((p) => [p, { v: 0, w: 0 }])) as Record<
    PillarId,
    { v: number; w: number }
  >;

  for (const q of QUESTIONS) {
    const opt = q.options.find((o) => o.id === answers[q.id]);
    if (!opt?.scores) continue;
    for (const p of PILLAR_ORDER) {
      const c = opt.scores[p];
      if (!c || c.weight <= 0) continue;
      sums[p].v += c.value * c.weight;
      sums[p].w += c.weight;
    }
  }

  const pillars: PillarResult[] = PILLAR_ORDER.map((id) => {
    const { v, w } = sums[id];
    const evidence = NOMINAL[id] > 0 ? Math.min(1, w / NOMINAL[id]) : 0;
    return {
      id,
      name: PILLARS[id].name,
      weight: PILLARS[id].weight,
      score: w > 0 ? round(v / w) : 0,
      evidence: Math.round(evidence * 100) / 100,
      evidenceLevel: evidenceLevel(evidence),
    };
  });

  let num = 0;
  let den = 0;
  let evidenceMass = 0;
  for (const p of pillars) {
    const raw = sums[p.id].w > 0 ? sums[p.id].v / sums[p.id].w : 0;
    num += p.weight * p.evidence * raw;
    den += p.weight * p.evidence;
    evidenceMass += p.weight * p.evidence;
  }
  const overall = den > 0 ? round(num / den) : 0;

  // Confiança: 85% vem da evidência dos pilares, 15% do contexto informado.
  const budgetInformed = !!answers.q2 && answers.q2 !== 'nao_informar';
  const context = (budgetInformed ? 0.5 : 0) + (hasAnyMetric(metrics) ? 0.5 : 0);
  const confidence = Math.round((0.85 * (evidenceMass / 100) + 0.15 * context) * 100) / 100;

  return {
    overall,
    band: bandFor(overall),
    pillars,
    confidence,
    confidenceLevel: confidenceLevel(confidence),
    complete: isComplete(answers),
  };
}
