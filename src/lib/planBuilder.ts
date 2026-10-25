import type { PlanOutput } from '../ai/outputSchema';
import { buildDiagnostic, type Diagnostic } from '../domain/diagnostic';
import { buildPlan } from '../domain/plan';
import { safeText } from '../domain/questionnaire';
import type { Answers, AppEnvironment, LinkEvidence, MetricsInput } from '../domain/types';
import { VERSIONS } from '../domain/versions';
import type { PdfMeta } from '../pdf/planDocument';

const TYPE_LABEL: Record<string, string> = {
  servicos_locais: 'Serviços locais',
  varejo_ecommerce: 'Varejo / e-commerce',
  servicos_b2b: 'Serviços B2B',
  educacao: 'Educação',
  alto_valor: 'Bem de alto valor',
  outro: 'Negócio',
};

export function businessLabel(a: Answers): string {
  return safeText(a, 'b_produto_prioritario') ?? safeText(a, 'produto') ?? TYPE_LABEL[String(a.tipo_negocio)] ?? 'Seu negócio';
}

export function buildAll(input: { id: string; environment: AppEnvironment; answers: Answers; metrics?: MetricsInput; links?: LinkEvidence[]; hasDeepening?: boolean; createdAt?: string }): { d: Diagnostic; plan: PlanOutput } {
  const d = buildDiagnostic(input);
  return { d, plan: buildPlan(d, input.answers) };
}

export function pdfMeta(d: Diagnostic, a: Answers, opts: { sampleLabel?: string; mode?: 'deterministico' | 'ia'; model?: string; support?: string | null }): PdfMeta {
  return {
    businessLabel: businessLabel(a),
    generatedAt: d.record.created_at,
    period: d.record.metrics.period,
    versions: { report: VERSIONS.report, scoring: VERSIONS.scoring, prompt: VERSIONS.prompt, questionnaire: VERSIONS.questionnaire },
    generation: { mode: opts.mode ?? 'deterministico', model: opts.model },
    environment: d.record.environment,
    sampleLabel: opts.sampleLabel,
    supportContact: opts.support ?? undefined,
  };
}
