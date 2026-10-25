import { calculate, detectContradictions } from './calculations';
import { buildCtx, generateFindings, prioritize } from './findings';
import { ALL_FIELDS, fieldOptions, getField, isFilled, isUnknownAnswer, list, num, optionLabel, safeText, str, visibleFields, visibleScreens } from './questionnaire';
import { BLOCKS } from './deepening';
import { assess, PILLARS } from './scoring';
import type { AnswerEntry, Answers, AppEnvironment, DiagnosticRecord, Finding, LinkEvidence, MarginDefinition, MetricsInput, Prioritized } from './types';
import { VERSIONS } from './versions';

export interface DiagnosticInput {
  id: string;
  environment: AppEnvironment;
  createdAt?: string;
  answers: Answers;
  metrics?: MetricsInput;
  /** Links informados. Nesta versão nunca são acessados → status "informado". */
  links?: LinkEvidence[];
  hasDeepening?: boolean;
}

export interface Diagnostic {
  record: DiagnosticRecord;
  findings: Finding[];
  prioritized: Prioritized;
}

function answerEntries(a: Answers): AnswerEntry[] {
  const visible = new Set(visibleScreens(a).flatMap((s) => visibleFields(s, a)).map((f) => f.id));
  const entries: AnswerEntry[] = ALL_FIELDS.map((f) => {
    if (!visible.has(f.id)) return { field: f.id, status: 'not_applicable', value: null, label: null };
    if (!isFilled(f, a)) return { field: f.id, status: 'missing', value: null, label: null };
    const unknown = isUnknownAnswer(f.id, a);
    const notApplicable = list(a, f.id).some((id) => fieldOptions(f, a).find((o) => o.id === id)?.notApplicable);
    return { field: f.id, status: notApplicable ? 'not_applicable' : unknown ? 'unknown' : 'answered', value: a[f.id] ?? null, label: optionLabel(f.id, a[f.id], a) };
  });
  // Fase B: somente o que foi respondido.
  for (const b of BLOCKS)
    for (const f of b.fields) {
      const v = a[f.id];
      if (v === undefined || v === '' || (Array.isArray(v) && !v.length)) continue;
      const opts = typeof f.options === 'function' ? f.options(a) : f.options ?? [];
      const ids = Array.isArray(v) ? v : [String(v)];
      const unknown = ids.some((id) => opts.find((o) => o.id === id)?.unknown);
      const label = f.kind === 'text' ? String(v).trim() : ids.map((id) => opts.find((o) => o.id === id)?.label).filter(Boolean).join(', ') || null;
      entries.push({ field: f.id, status: unknown ? 'unknown' : 'answered', value: v, label });
    }
  return entries;
}

export function buildDiagnostic(input: DiagnosticInput): Diagnostic {
  const { answers: a, metrics: m } = input;
  const extra = { ciclo: str(a, 'b_ciclo') };
  const calc = calculate(a, m, extra);
  const contradictions = detectContradictions(a, m);
  const assessment = assess(a, m);
  const ctx = buildCtx(a, calc, contradictions, m);
  const findings = generateFindings(ctx);
  const prioritized = prioritize(findings, ctx);
  const answers = answerEntries(a);
  const marginDef = (m?.marginDefinition ?? str(a, 'margem_tipo') ?? null) as MarginDefinition | null;

  const record: DiagnosticRecord = {
    diagnostic_id: input.id,
    environment: input.environment,
    created_at: input.createdAt ?? new Date().toISOString(),
    contract_version: VERSIONS.contract,
    questionnaire_version: VERSIONS.questionnaire,
    deepening_version: input.hasDeepening ? VERSIONS.deepening : null,
    scoring_version: VERSIONS.scoring,
    methodology_version: VERSIONS.methodology,
    prompt_version: VERSIONS.prompt,
    report_version: VERSIONS.report,
    business_profile: {
      campaign_status: str(a, 'campanhas_status') ?? null,
      business_type: str(a, 'tipo_negocio') ?? null,
      product: safeText(a, 'b_produto_prioritario') ?? safeText(a, 'produto') ?? null,
      customer_type: str(a, 'tipo_cliente') ?? null,
      region: str(a, 'regiao') ?? null,
      budget_range: str(a, 'orcamento') ?? null,
      platforms: list(a, 'plataformas'),
      manager: str(a, 'gestor') ?? null,
      ticket_range: str(a, 'ticket_faixa') ?? null,
      ticket_exact: num(a, 'ticket_exato') ?? null,
      margin_range: str(a, 'margem_faixa') ?? null,
      margin_definition: marginDef === 'contribuicao' || marginDef === 'bruta' ? marginDef : marginDef ? 'nao_especificada' : null,
      main_problem: str(a, 'dor') ?? null,
      priority: str(a, 'prioridade') ?? null,
      offer: str(a, 'oferta') ?? null,
    },
    conversion_path: str(a, 'caminho_venda') ?? null,
    answers,
    metrics: { period: m?.period ?? null, margin_definition: m?.marginDefinition ?? null, values: m?.values ?? {} },
    evidence: { links: input.links ?? [], files: [] },
    constraints: list(a, 'restricoes').filter((r) => r !== 'nenhuma'),
    missing_fields: answers.filter((e) => e.status === 'missing' || e.status === 'unknown').map((e) => e.field),
    contradictions,
    calculated_metrics: calc,
    assessment,
  };
  return { record, findings, prioritized };
}

/* ------------------------------ textos de perfil ------------------------------ */

const TYPE: Record<string, string> = {
  servicos_locais: 'Negócio de serviços locais',
  varejo_ecommerce: 'Loja (varejo / e-commerce)',
  servicos_b2b: 'Empresa de serviços profissionais / B2B',
  educacao: 'Negócio de educação ou infoprodutos',
  alto_valor: 'Negócio de bem de alto valor',
  outro: 'Empresa',
};
const PATH: Record<string, string> = {
  site: 'venda direto no site',
  whatsapp_direct: 'venda pelo WhatsApp ou Direct',
  formulario: 'formulário seguido de atendimento',
  agendamento: 'venda por agendamento',
  ligacao_visita: 'venda por ligação ou visita',
  outro: 'outro caminho de venda',
};
const STATUS: Record<string, string> = { ativas: 'com campanhas ativas', pausadas: 'com campanhas pausadas', nunca: 'que ainda não anuncia' };

/** Minúscula só na primeira letra, preservando siglas e "R$". */
const lowerFirst = (s: string) => (/^(R\$|[A-Z]{2})/.test(s) ? s : s[0].toLowerCase() + s.slice(1));

export function profileText(a: Answers): string {
  const parts = [TYPE[str(a, 'tipo_negocio') ?? ''] ?? 'Empresa', STATUS[str(a, 'campanhas_status') ?? ''], PATH[str(a, 'caminho_venda') ?? '']].filter(Boolean);
  let t = parts.join(', ') + '.';
  const product = safeText(a, 'b_produto_prioritario') ?? safeText(a, 'produto');
  if (product) t += ` Produto principal: ${product}.`;
  const plat = optionLabel('plataformas', a.plataformas, a);
  const budget = optionLabel('orcamento', a.orcamento, a);
  if (plat || budget) t += ` ${[budget && `Investimento: ${lowerFirst(budget)}`, plat && `canais: ${plat}`].filter(Boolean).join('; ')}.`;
  const prio = optionLabel('prioridade', a.prioridade, a);
  if (prio) t += ` Prioridade declarada: ${lowerFirst(prio)}.`;
  return t;
}

/** Ponto forte só com evidência: pilar ≥ 80 com boa cobertura. Nunca inventado. */
export function strengthOf(d: Diagnostic): { pillar: string; text: string } | null {
  const best = d.record.assessment.pillars.filter((p) => p.score !== null && p.score >= 80 && p.coverage >= 0.8).sort((x, y) => (y.score ?? 0) - (x.score ?? 0))[0];
  if (!best) return null;
  return { pillar: PILLARS[best.id].name, text: `Respostas que sustentam: ${best.evidence.map((e) => `${e.label} — “${e.value}”`).join('; ')}.` };
}

export { getField };
