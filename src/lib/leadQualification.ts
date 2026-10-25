import type { Answers, CommercialFactor, CommercialScore, LeadRecord } from '../types';

/**
 * Potencial comercial (Qvn Ads) — independente do índice de maturidade.
 * Critérios simples e explicados; não prevê fechamento.
 */
const BUDGET_POINTS: Record<string, [number, string]> = {
  ate_1k: [5, 'Investimento até R$ 1.000/mês'],
  '1k_3k': [15, 'Investimento de R$ 1.001 a R$ 3.000/mês'],
  '3k_10k': [25, 'Investimento de R$ 3.001 a R$ 10.000/mês'],
  acima_10k: [30, 'Investimento acima de R$ 10.000/mês'],
  nao_informar: [8, 'Orçamento não informado'],
};

/** Dores que a Qvn Ads atende diretamente. */
const ALIGNED_PAINS = new Set(['nao_sabe', 'custo_alto', 'inconsistente', 'poucos_leads']);
const ALIGNED_DISCOMFORT = new Set(['vale_a_pena', 'relatorios', 'criativos', 'nao_sabe']);

export function commercialScore(answers: Answers, lead?: Pick<LeadRecord, 'plan' | 'consulting'>): CommercialScore {
  const factors: CommercialFactor[] = [];

  const budget = answers.q2 ? BUDGET_POINTS[answers.q2] : undefined;
  if (budget) factors.push({ label: budget[1], points: budget[0] });

  let need = 0;
  if (answers.q4 && ALIGNED_PAINS.has(answers.q4)) need += 10;
  if (answers.q6 && ALIGNED_DISCOMFORT.has(answers.q6)) need += 10;
  if (need > 0) factors.push({ label: 'Necessidade alinhada aos serviços de tráfego', points: need });

  let seeking = 0;
  if (answers.q3 === 'eu' || answers.q3 === 'ninguem') seeking += 10;
  if (answers.q12 === 'avaliar_gestao') seeking += 10;
  if (seeking > 0) factors.push({ label: 'Sinais de busca por apoio especializado', points: seeking });

  if (lead?.consulting || lead?.plan === 'consultoria') {
    factors.push({ label: 'Solicitou conversa inicial de consultoria', points: 30 });
  } else if (lead?.plan === 'especialista') {
    factors.push({ label: 'Interesse no Diagnóstico com Especialista', points: 22 });
  } else if (lead?.plan === 'express') {
    factors.push({ label: 'Interesse no Diagnóstico Express', points: 12 });
  }

  const score = Math.min(100, factors.reduce((s, f) => s + f.points, 0));
  const tier = score >= 65 ? 'alto' : score >= 40 ? 'medio' : 'baixo';
  return { score, tier, factors };
}

export const TIER_LABEL: Record<CommercialScore['tier'], string> = {
  alto: 'Potencial alto',
  medio: 'Potencial médio',
  baixo: 'Potencial baixo',
};
