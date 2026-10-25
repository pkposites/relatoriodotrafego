import { is, str } from './questionnaire';
import type { Answers, CalculatedMetric, Contradiction, MarginDefinition, MetricEntry, MetricKey, MetricsInput, Period } from './types';

/* ------------------------------ entrada numérica ------------------------------ */

/** Converte texto digitado no padrão brasileiro em número. Vazio → undefined. */
export function parseNumberInput(raw: string): number | undefined | 'invalid' {
  const t = raw.trim();
  if (!t) return undefined;
  let n = t.replace(/\s|R\$|%/g, '');
  if (n.includes(',')) n = n.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(n)) n = n.replace(/\./g, ''); // "4.500" = 4500
  const v = Number(n);
  return Number.isFinite(v) ? v : 'invalid';
}

export const METRIC_META: Record<MetricKey, { label: string; unit: 'BRL' | 'quantidade' | 'percentual'; integer?: boolean }> = {
  investimento: { label: 'Investimento em mídia', unit: 'BRL' },
  contatos: { label: 'Contatos atribuídos aos anúncios', unit: 'quantidade', integer: true },
  contatos_qualificados: { label: 'Contatos qualificados', unit: 'quantidade', integer: true },
  agendamentos: { label: 'Agendamentos', unit: 'quantidade', integer: true },
  propostas: { label: 'Propostas enviadas', unit: 'quantidade', integer: true },
  comparecimentos: { label: 'Comparecimentos', unit: 'quantidade', integer: true },
  vendas: { label: 'Vendas atribuídas aos anúncios', unit: 'quantidade', integer: true },
  receita: { label: 'Receita atribuída aos anúncios', unit: 'BRL' },
  ticket_medio: { label: 'Ticket médio', unit: 'BRL' },
  margem_percentual: { label: 'Margem (%)', unit: 'percentual' },
  estornos: { label: 'Estornos ou cancelamentos', unit: 'quantidade', integer: true },
};

/** Valor utilizável: precisão exata ou estimada, número finito e não negativo. */
function usable(e?: MetricEntry): e is MetricEntry & { value: number } {
  return !!e && (e.precision === 'exato' || e.precision === 'estimado') && typeof e.value === 'number' && Number.isFinite(e.value) && e.value >= 0;
}

const MARGIN_MID: Record<string, number> = { ate_20: 0.15, '20_40': 0.3, '40_60': 0.5, acima_60: 0.7 };

/** Margem efetiva: valor numérico da fase B, ou ponto médio da faixa declarada (aproximação). */
export function effectiveMargin(a: Answers, m?: MetricsInput): { rate: number; source: 'informada' | 'faixa'; definition: MarginDefinition } | null {
  const def: MarginDefinition = m?.marginDefinition ?? ((str(a, 'margem_tipo') as MarginDefinition | undefined) === 'contribuicao' ? 'contribuicao' : str(a, 'margem_tipo') === 'bruta' ? 'bruta' : 'nao_especificada');
  const e = m?.values.margem_percentual;
  if (usable(e) && e.value > 0 && e.value < 100) return { rate: e.value / 100, source: 'informada', definition: def };
  const mid = MARGIN_MID[str(a, 'margem_faixa') ?? ''];
  return mid ? { rate: mid, source: 'faixa', definition: def } : null;
}

export function effectiveTicket(a: Answers, m?: MetricsInput): { value: number; source: 'informado' | 'resposta' } | null {
  const e = m?.values.ticket_medio;
  if (usable(e) && e.value > 0) return { value: e.value, source: 'informado' };
  const exact = a.ticket_exato;
  if (typeof exact === 'number' && exact > 0) return { value: exact, source: 'resposta' };
  return null;
}

/** Venda consultiva ou de ciclo longo: taxas do mesmo mês misturam coortes. */
export function longCycle(a: Answers, extra?: { ciclo?: string }): boolean {
  if (extra?.ciclo) return ['semanas', 'meses'].includes(extra.ciclo);
  return is(a, 'tipo_negocio', 'servicos_b2b', 'alto_valor') || is(a, 'caminho_venda', 'formulario', 'ligacao_visita');
}

export function periodDays(p?: Period | null): number | null {
  if (!p?.start || !p?.end) return null;
  const d = (Date.parse(p.end) - Date.parse(p.start)) / 86400000 + 1;
  return Number.isFinite(d) && d > 0 ? Math.round(d) : null;
}

const MARGIN_CAVEAT: Record<MarginDefinition, string> = {
  contribuicao: 'Usa margem de contribuição (já desconta custos variáveis informados). Custos fixos não entram.',
  bruta: 'Usa margem bruta: impostos, taxas, comissões e outros custos variáveis ficaram fora, então o equilíbrio real tende a ser mais alto.',
  nao_especificada: 'A definição da margem não foi informada; trate como aproximação.',
};

/**
 * Cálculos derivados. Só calcula quando há dados compatíveis; nunca divide
 * por zero; ausência de dado nunca vira zero.
 */
export function calculate(a: Answers, m?: MetricsInput, extra?: { ciclo?: string }): CalculatedMetric[] {
  const v = m?.values ?? {};
  const out: CalculatedMetric[] = [];
  const prec = (...keys: MetricKey[]): 'exato' | 'estimado' => (keys.some((k) => v[k]?.precision === 'estimado') ? 'estimado' : 'exato');
  const cohort = longCycle(a, extra)
    ? ['Venda de ciclo longo: contatos e vendas do mesmo período podem pertencer a grupos diferentes; trate a taxa como aproximação.']
    : [];
  const ok = (k: MetricKey) => usable(v[k]);
  const val = (k: MetricKey) => (v[k] as MetricEntry).value as number;

  if (ok('investimento') && ok('contatos') && val('contatos') > 0 && val('investimento') > 0) {
    out.push({ id: 'cpl', label: 'Custo por contato (CPL)', value: val('investimento') / val('contatos'), unit: 'BRL', formula: 'investimento ÷ contatos', inputs: ['investimento', 'contatos'], precision: prec('investimento', 'contatos'), caveats: [] });
  }
  if (ok('investimento') && ok('vendas') && val('vendas') > 0 && val('investimento') > 0) {
    out.push({
      id: 'custo_midia_cliente',
      label: 'Custo de mídia por cliente',
      value: val('investimento') / val('vendas'),
      unit: 'BRL',
      formula: 'investimento em mídia ÷ vendas atribuídas',
      inputs: ['investimento', 'vendas'],
      precision: prec('investimento', 'vendas'),
      caveats: ['Considera só a mídia. Não é o CAC completo: salários, comissões, ferramentas e agência ficam fora.', ...cohort],
    });
  }
  if (ok('contatos') && ok('vendas') && val('contatos') > 0 && val('vendas') <= val('contatos')) {
    out.push({ id: 'conversao_contato_venda', label: 'Conversão de contato em venda', value: val('vendas') / val('contatos'), unit: 'razao', formula: 'vendas ÷ contatos', inputs: ['contatos', 'vendas'], precision: prec('contatos', 'vendas'), caveats: [...cohort] });
  }
  if (ok('contatos') && ok('contatos_qualificados') && val('contatos') > 0 && val('contatos_qualificados') <= val('contatos')) {
    out.push({ id: 'taxa_qualificacao', label: 'Contatos qualificados', value: val('contatos_qualificados') / val('contatos'), unit: 'razao', formula: 'qualificados ÷ contatos', inputs: ['contatos', 'contatos_qualificados'], precision: prec('contatos', 'contatos_qualificados'), caveats: [] });
  }
  if (ok('agendamentos') && ok('comparecimentos') && val('agendamentos') > 0 && val('comparecimentos') <= val('agendamentos')) {
    out.push({ id: 'comparecimento', label: 'Comparecimento', value: val('comparecimentos') / val('agendamentos'), unit: 'razao', formula: 'comparecimentos ÷ agendamentos', inputs: ['agendamentos', 'comparecimentos'], precision: prec('agendamentos', 'comparecimentos'), caveats: [] });
  }
  if (ok('propostas') && ok('vendas') && val('propostas') > 0 && val('vendas') <= val('propostas')) {
    out.push({ id: 'fechamento_propostas', label: 'Fechamento de propostas', value: val('vendas') / val('propostas'), unit: 'razao', formula: 'vendas ÷ propostas', inputs: ['propostas', 'vendas'], precision: prec('propostas', 'vendas'), caveats: [...cohort] });
  }

  // Receita: preferir a informada; senão, estimar por vendas × ticket (marcando a estimativa).
  let revenue: { value: number; precision: 'exato' | 'estimado'; inputs: MetricKey[]; estimated: boolean } | null = null;
  if (ok('receita') && val('receita') > 0) revenue = { value: val('receita'), precision: prec('receita'), inputs: ['receita'], estimated: false };
  else if (ok('vendas') && val('vendas') > 0 && ok('ticket_medio') && val('ticket_medio') > 0)
    revenue = { value: val('vendas') * val('ticket_medio'), precision: 'estimado', inputs: ['vendas', 'ticket_medio'], estimated: true };
  if (revenue?.estimated) {
    out.push({ id: 'receita_estimada', label: 'Receita atribuída (estimada)', value: revenue.value, unit: 'BRL', formula: 'vendas × ticket médio', inputs: revenue.inputs, precision: 'estimado', caveats: ['Estimada a partir das vendas e do ticket médio, não informada diretamente.'] });
  }
  if (revenue && ok('investimento') && val('investimento') > 0) {
    out.push({
      id: 'roas',
      label: 'ROAS',
      value: revenue.value / val('investimento'),
      unit: 'razao',
      formula: 'receita atribuída ÷ investimento em mídia',
      inputs: [...revenue.inputs, 'investimento'],
      precision: revenue.precision === 'estimado' ? 'estimado' : prec('investimento'),
      caveats: ['ROAS compara receita e mídia; não é lucro.', ...(revenue.estimated ? ['Receita estimada.'] : []), ...cohort],
    });
  }

  const margin = effectiveMargin(a, m);
  if (margin) {
    out.push({
      id: 'roas_equilibrio',
      label: 'ROAS de equilíbrio (aproximado)',
      value: 1 / margin.rate,
      unit: 'razao',
      formula: '1 ÷ margem',
      inputs: margin.source === 'informada' ? ['margem_percentual'] : [],
      precision: margin.source === 'informada' ? prec('margem_percentual') : 'estimado',
      caveats: [
        MARGIN_CAVEAT[margin.definition],
        ...(margin.source === 'faixa' ? [`Margem estimada pelo ponto médio da faixa declarada (${Math.round(margin.rate * 100)}%).`] : []),
      ],
    });
    const ticket = effectiveTicket(a, m);
    if (ticket) {
      out.push({
        id: 'margem_por_venda',
        label: 'Margem por venda (aproximada)',
        value: ticket.value * margin.rate,
        unit: 'BRL',
        formula: 'ticket × margem',
        inputs: ticket.source === 'informado' ? ['ticket_medio'] : [],
        precision: 'estimado',
        caveats: [MARGIN_CAVEAT[margin.definition]],
      });
    }
  }
  const cpaC = out.find((x) => x.id === 'custo_midia_cliente');
  const mpvC = out.find((x) => x.id === 'margem_por_venda');
  if (cpaC && mpvC && mpvC.value > 0) {
    out.push({
      id: 'custo_sobre_margem',
      label: 'Custo de mídia por cliente ÷ margem por venda',
      value: cpaC.value / mpvC.value,
      unit: 'razao',
      formula: 'custo de mídia por cliente ÷ margem por venda',
      inputs: [...new Set([...cpaC.inputs, ...mpvC.inputs])],
      precision: 'estimado',
      caveats: ['Acima de 100%: a primeira venda não paga a mídia. A margem é aproximada.'],
    });
  }
  return out;
}

export const findCalc = (c: CalculatedMetric[], id: string) => c.find((x) => x.id === id);

/** Situação do custo de mídia por cliente frente à margem por venda — só com números plausíveis. */
export function marginStatus(c: CalculatedMetric[]): 'acima_da_margem' | 'apertado' | 'com_folga' | null {
  const cpa = findCalc(c, 'custo_midia_cliente');
  const mpv = findCalc(c, 'margem_por_venda');
  if (!cpa || !mpv || mpv.value <= 0) return null;
  const r = cpa.value / mpv.value;
  return r > 1 ? 'acima_da_margem' : r > 0.6 ? 'apertado' : 'com_folga';
}

/* ------------------------------ contradições ------------------------------ */

const BUDGET_RANGE: Record<string, [number, number]> = {
  ate_1k: [0, 1000],
  '1k_3k': [1001, 3000],
  '3k_10k': [3001, 10000],
  '10k_30k': [10001, 30000],
  acima_30k: [30001, Infinity],
};

/** Detecta inconsistências e pede revisão — nunca corrige valores silenciosamente. */
export function detectContradictions(a: Answers, m?: MetricsInput): Contradiction[] {
  const out: Contradiction[] = [];
  const v = m?.values ?? {};
  const n = (k: MetricKey) => (usable(v[k]) ? (v[k]!.value as number) : undefined);
  const push = (id: string, message: string, fields: string[]) => out.push({ id, message, fields });

  const vendas = n('vendas'), contatos = n('contatos');
  if (vendas !== undefined && contatos !== undefined && vendas > contatos)
    push('vendas_maior_contatos', 'Você informou mais vendas que contatos. Há recompra ou vendas de contatos de outros períodos?', ['vendas', 'contatos']);
  const comp = n('comparecimentos'), ag = n('agendamentos');
  if (comp !== undefined && ag !== undefined && comp > ag)
    push('comparecimento_maior_agendamento', 'Há mais comparecimentos que agendamentos. Encaixes ou atendimentos sem agendamento entraram na conta?', ['comparecimentos', 'agendamentos']);
  const q = n('contatos_qualificados');
  if (q !== undefined && contatos !== undefined && q > contatos)
    push('qualificados_maior_contatos', 'Há mais contatos qualificados que contatos no total. Os dois números são do mesmo período e origem?', ['contatos_qualificados', 'contatos']);
  const rec = n('receita'), t = n('ticket_medio');
  if (rec !== undefined && vendas !== undefined && t !== undefined && vendas > 0 && t > 0) {
    const ratio = rec / (vendas * t);
    if (ratio < 0.5 || ratio > 2)
      push('receita_ticket_divergente', 'Receita, vendas e ticket médio não batem entre si (receita ≠ vendas × ticket). Algum valor é de outro período ou inclui vendas que não vieram dos anúncios?', ['receita', 'vendas', 'ticket_medio']);
  }
  if (m?.period?.start && m.period.end && Date.parse(m.period.end) < Date.parse(m.period.start))
    push('periodo_invertido', 'A data final do período é anterior à inicial.', ['period']);
  const inv = n('investimento');
  const range = BUDGET_RANGE[str(a, 'orcamento') ?? ''];
  const days = periodDays(m?.period);
  if (inv !== undefined && inv > 0 && range && days) {
    const monthly = (inv / days) * 30;
    if (monthly < range[0] / 2 || monthly > range[1] * 2)
      push('investimento_fora_da_faixa', 'O investimento do período, convertido para 30 dias, não bate com a faixa mensal escolhida no diagnóstico. Qual dos dois está correto?', ['investimento', 'orcamento']);
  }
  if (is(a, 'vendas_origem', 'nao_acompanha') && v.vendas?.precision === 'exato')
    push('origem_vs_vendas_exatas', 'No diagnóstico você disse que não acompanha a origem das vendas, mas agora informou vendas atribuídas com precisão. De onde vem esse número?', ['vendas', 'vendas_origem']);
  return out;
}
