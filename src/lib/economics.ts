import { single } from '../data/questions';
import type { Answers, OptionalMetricsInput, UnitEconomics } from '../types';
import { computeMetrics } from './metrics';

/** Ponto médio de cada faixa de margem declarada. */
export const MARGIN_MID: Record<string, number> = {
  ate_20: 0.15,
  '20_40': 0.3,
  '40_60': 0.5,
  acima_60: 0.7,
};

/**
 * Economia da unidade a partir da margem declarada e dos números opcionais.
 * Só calcula o que os dados sustentam; nada é inventado.
 */
export function computeEconomics(answers: Answers, metrics?: OptionalMetricsInput): UnitEconomics {
  const m = computeMetrics(metrics);
  const margin = MARGIN_MID[single(answers, 'margem') ?? ''];
  const ticket = metrics?.avgTicket && metrics.avgTicket > 0 ? metrics.avgTicket : undefined;
  const out: UnitEconomics = { ticket, marginRate: margin, cpa: m.cpa, roas: m.roas };
  if (margin) out.breakevenRoas = 1 / margin;
  if (margin && ticket) out.grossProfitPerSale = ticket * margin;
  // Números implausíveis (ex.: ROAS acima de 30x) não alimentam travas nem pisos.
  const plausible = !(m.roas !== undefined && m.roas > 30) && !(m.cpl !== undefined && m.cpl < 0.5);
  if (plausible && out.grossProfitPerSale && out.cpa) {
    const ratio = out.cpa / out.grossProfitPerSale;
    out.status = ratio > 1 ? 'acima_da_margem' : ratio > 0.6 ? 'apertado' : 'saudavel';
  }
  return out;
}
