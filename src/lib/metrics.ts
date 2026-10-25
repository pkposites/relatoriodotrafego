import type { ComputedMetrics, OptionalMetricsInput } from '../types';

export type MetricField = keyof OptionalMetricsInput;

const valid = (n: number | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;

export function hasAnyMetric(m?: OptionalMetricsInput): boolean {
  if (!m) return false;
  return (['investment', 'leads', 'sales', 'avgTicket'] as MetricField[]).some((k) => valid(m[k]));
}

/** Converte texto digitado (aceita "1.500,50" ou "1500.5") em número. Vazio → undefined. */
export function parseNumberInput(raw: string): number | undefined | 'invalid' {
  const t = raw.trim();
  if (!t) return undefined;
  let normalized = t.replace(/\s|R\$/g, '');
  if (normalized.includes(',')) normalized = normalized.replace(/\./g, '').replace(',', '.');
  // Ponto como separador de milhar no padrão brasileiro: "4.500" = 4500, "1.250.000" = 1250000.
  else if (/^\d{1,3}(\.\d{3})+$/.test(normalized)) normalized = normalized.replace(/\./g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 'invalid';
}

/** Valida campos: negativos, não numéricos e contagens fracionadas. */
export function validateMetrics(raw: Record<MetricField, string>): {
  values: OptionalMetricsInput;
  errors: Partial<Record<MetricField, string>>;
} {
  const values: OptionalMetricsInput = {};
  const errors: Partial<Record<MetricField, string>> = {};
  (Object.keys(raw) as MetricField[]).forEach((k) => {
    const parsed = parseNumberInput(raw[k]);
    if (parsed === undefined) return;
    if (parsed === 'invalid') {
      errors[k] = 'Digite apenas números.';
      return;
    }
    if (parsed < 0) {
      errors[k] = 'O valor não pode ser negativo.';
      return;
    }
    if ((k === 'leads' || k === 'sales') && !Number.isInteger(parsed)) {
      errors[k] = 'Use um número inteiro.';
      return;
    }
    values[k] = parsed;
  });
  return { values, errors };
}

/**
 * Calcula indicadores apenas quando os dados permitem.
 * Nenhum indicador é calculado com divisão por zero ou dado ausente.
 */
export function computeMetrics(m?: OptionalMetricsInput): ComputedMetrics {
  const out: ComputedMetrics = { warnings: [], hasAny: hasAnyMetric(m) };
  if (!m) return out;
  const inv = valid(m.investment) ? m.investment : undefined;
  const leads = valid(m.leads) ? m.leads : undefined;
  const sales = valid(m.sales) ? m.sales : undefined;
  const ticket = valid(m.avgTicket) ? m.avgTicket : undefined;

  if (inv !== undefined && inv > 0 && leads !== undefined && leads > 0) out.cpl = inv / leads;
  if (inv !== undefined && inv > 0 && sales !== undefined && sales > 0) out.cpa = inv / sales;

  if (leads !== undefined && sales !== undefined && leads > 0) {
    if (sales > leads) {
      out.warnings.push(
        'Há mais vendas do que contatos informados. Vale revisar os números — a taxa de conversão não foi calculada.',
      );
    } else {
      out.leadToSale = sales / leads;
    }
  }

  if (sales !== undefined && sales > 0 && ticket !== undefined && ticket > 0) {
    out.revenue = sales * ticket;
    if (inv !== undefined && inv > 0) out.roas = out.revenue / inv;
  }

  if ((out.roas !== undefined && out.roas > 30) || (out.cpl !== undefined && out.cpl < 0.5)) {
    out.warnings.push('Alguns valores parecem fora do comum. Confira se o investimento e as quantidades foram digitados corretamente.');
  }

  if (inv === 0 && ((leads ?? 0) > 0 || (sales ?? 0) > 0)) {
    out.warnings.push('O investimento informado é zero; custos por contato e por venda não foram calculados.');
  }
  return out;
}
