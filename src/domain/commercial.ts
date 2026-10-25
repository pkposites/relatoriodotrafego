import { is, str } from './questionnaire';
import type { Answers } from './types';

/**
 * Potencial comercial para a agência (Qvn Ads). Uso interno.
 * Totalmente separado da avaliação: nenhuma função de pontuação importa este módulo.
 */
export interface CommercialScore {
  score: number;
  tier: 'alto' | 'medio' | 'baixo';
  factors: { label: string; points: number }[];
}

const BUDGET: Record<string, [number, string]> = {
  ate_1k: [5, 'Investimento até R$ 1.000/mês'],
  '1k_3k': [12, 'Investimento de R$ 1.001 a R$ 3.000/mês'],
  '3k_10k': [22, 'Investimento de R$ 3.001 a R$ 10.000/mês'],
  '10k_30k': [28, 'Investimento de R$ 10.001 a R$ 30.000/mês'],
  acima_30k: [30, 'Investimento acima de R$ 30.000/mês'],
};

export function commercialScore(a: Answers, interest?: 'plano' | 'especialista' | 'consultoria'): CommercialScore {
  const factors: CommercialScore['factors'] = [];
  const b = BUDGET[str(a, 'orcamento') ?? ''];
  if (b) factors.push({ label: b[1], points: b[0] });
  if (is(a, 'dor', 'poucos_contatos', 'contatos_desqualificados', 'custo_alto', 'resultado_instavel', 'numeros_confusos'))
    factors.push({ label: 'Dor ligada à gestão de tráfego', points: 10 });
  if (is(a, 'gestor', 'eu', 'ninguem')) factors.push({ label: 'Sem gestão especializada hoje', points: 10 });
  if (is(a, 'prioridade', 'avaliar_gestao', 'escalar')) factors.push({ label: 'Busca avaliar a gestão ou crescer', points: 8 });
  if (interest === 'consultoria') factors.push({ label: 'Pediu conversa de consultoria', points: 30 });
  else if (interest === 'especialista') factors.push({ label: 'Interesse na análise com especialista', points: 20 });
  else if (interest === 'plano') factors.push({ label: 'Interesse no plano de ação', points: 10 });
  const score = Math.min(100, factors.reduce((s, f) => s + f.points, 0));
  return { score, tier: score >= 65 ? 'alto' : score >= 40 ? 'medio' : 'baixo', factors };
}

export const TIER_LABEL = { alto: 'Potencial alto', medio: 'Potencial médio', baixo: 'Potencial baixo' } as const;
