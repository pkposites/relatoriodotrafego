/**
 * Contrato de dados do diagnóstico (ver docs/contrato-dados.md).
 * Separa: respostas declaradas, métricas informadas, cálculos derivados,
 * evidências observadas, hipóteses e recomendações.
 */

/* ------------------------------ Respostas ------------------------------ */

/** Resposta crua: id(s) de opção, texto livre ou número. */
export type RawValue = string | string[] | number;
export type Answers = Record<string, RawValue | undefined>;

/** Situação de uma resposta. Nunca confundir "não sei" com zero ou ausência. */
export type AnswerStatus = 'answered' | 'unknown' | 'not_applicable' | 'missing';

export interface AnswerEntry {
  field: string;
  status: AnswerStatus;
  value: RawValue | null;
  /** Rótulo legível — apenas para exibição; a lógica usa sempre `value`. */
  label: string | null;
}

/* ------------------------------ Questionário ------------------------------ */

export type FieldKind = 'single' | 'multi' | 'text' | 'number' | 'url';

export interface FieldOption {
  id: string;
  label: string;
  /** Opção que representa "não sei". */
  unknown?: boolean;
  /** Opção que representa "não se aplica". */
  notApplicable?: boolean;
  /** Em multi: desmarca as demais. */
  exclusive?: boolean;
  hint?: string;
}

export interface Field {
  id: string;
  kind: FieldKind;
  label: string | ((a: Answers) => string);
  help?: string;
  options?: FieldOption[] | ((a: Answers) => FieldOption[]);
  optional?: boolean;
  placeholder?: string;
  maxLength?: number;
  /** Campo aparece apenas quando a condição é verdadeira. */
  visible?: (a: Answers) => boolean;
}

export interface Screen {
  id: string;
  stage: string;
  title: string | ((a: Answers) => string);
  subtitle?: string | ((a: Answers) => string);
  fields: Field[];
  visible?: (a: Answers) => boolean;
  /** Mensagem mostrada após determinada resposta (empatia, sem diagnóstico). */
  note?: (a: Answers) => string | undefined;
}

/* ------------------------------ Métricas ------------------------------ */

export type MetricKey =
  | 'investimento'
  | 'contatos'
  | 'contatos_qualificados'
  | 'agendamentos'
  | 'propostas'
  | 'comparecimentos'
  | 'vendas'
  | 'receita'
  | 'ticket_medio'
  | 'margem_percentual'
  | 'estornos';

export type MetricPrecision = 'exato' | 'estimado' | 'nao_sei' | 'nao_se_aplica';
export type MetricSource = 'plataforma' | 'crm' | 'planilha' | 'sistema_vendas' | 'estimativa_pessoal';
export type MetricUnit = 'BRL' | 'quantidade' | 'percentual';

export interface MetricEntry {
  /** null quando "não sei" ou "não se aplica". Zero é um valor válido. */
  value: number | null;
  precision: MetricPrecision;
  source?: MetricSource;
}

export interface Period {
  start: string; // AAAA-MM-DD
  end: string;
}

export type MarginDefinition = 'contribuicao' | 'bruta' | 'nao_especificada';

export interface MetricsInput {
  period?: Period;
  values: Partial<Record<MetricKey, MetricEntry>>;
  marginDefinition?: MarginDefinition;
}

export interface CalculatedMetric {
  id: string;
  label: string;
  value: number;
  unit: MetricUnit | 'razao';
  formula: string;
  inputs: MetricKey[];
  /** "estimado" se qualquer entrada for estimada. */
  precision: 'exato' | 'estimado';
  caveats: string[];
}

/* ------------------------------ Evidências ------------------------------ */

export type EvidenceKind = 'resposta' | 'metrica' | 'calculo' | 'link' | 'arquivo' | 'texto_livre';

export interface EvidenceRef {
  id: string;
  kind: EvidenceKind;
  label: string;
  value: string;
}

export interface LinkEvidence {
  url: string;
  /** "informado": recebido mas não acessado. "analisado": lido com sucesso. */
  status: 'informado' | 'analisado';
  consideredPages?: string[];
}

export interface Contradiction {
  id: string;
  message: string;
  fields: string[];
}

/* ------------------------------ Pontuação ------------------------------ */

export type PillarId = 'mensuracao' | 'conversao' | 'gestao' | 'economia' | 'oferta';

export interface PillarScore {
  id: PillarId;
  name: string;
  weight: number;
  /** null quando não há evidência suficiente para pontuar. */
  score: number | null;
  /** 0–1: quanto da evidência aplicável foi respondida de forma definida. */
  coverage: number;
  evidence: EvidenceRef[];
}

export interface Adjustment {
  scope: PillarId | 'geral';
  limit: number;
  before: number;
  reason: string;
}

export type CoverageLevel = 'boa' | 'parcial' | 'limitada';

export interface Assessment {
  mode: 'maturidade' | 'prontidao';
  scoringVersion: string;
  /** Maturidade declarada (0–100) — apenas para quem já anuncia ou anunciou. */
  maturity: number | null;
  band: { id: string; label: string; tone: 'bad' | 'warn' | 'brand' | 'ok' } | null;
  pillars: PillarScore[];
  adjustments: Adjustment[];
  /** Cobertura das informações operacionais (respostas definidas ÷ aplicáveis). */
  coverage: { ratio: number; level: CoverageLevel; unknownFields: string[] };
  /** Confiabilidade das métricas numéricas (fase B). */
  metricReliability: { level: 'sem_metricas' | 'estimadas' | 'mistas' | 'precisas'; detail: string };
  /** Frase composta — substitui o rótulo único "confiança alta". */
  confidenceStatement: string;
  readiness?: ReadinessItem[];
}

export interface ReadinessItem {
  id: string;
  label: string;
  status: 'pronto' | 'parcial' | 'pendente';
  detail: string;
}

/* ------------------------------ Recomendações ------------------------------ */

export type FindingKind = 'estrutural' | 'rapida' | 'investigacao';
export type Effort = 'baixo' | 'medio' | 'alto';
export type Resource = 'tempo' | 'equipe' | 'verba' | 'capacidade' | 'acesso_tecnico';

export interface ActionDetail {
  what: string;
  why: string;
  how: string[];
  owner: string;
  effort: Effort;
  effortHours: string;
  dependencies: string[];
  doneCriteria: string;
  indicator: string;
  reviewWhen: string;
}

export interface Finding {
  id: string;
  pillar: PillarId;
  kind: FindingKind;
  severity: 1 | 2 | 3;
  evidenceStrength: 'calculado' | 'declarado' | 'lacuna';
  title: string;
  fact: string;
  hypothesis: string;
  consequence: string;
  howToConfirm: string;
  evidence: EvidenceRef[];
  action: ActionDetail;
  needs: Resource[];
  templates: string[];
  /** Ids de outros achados que precisam vir antes. */
  after?: string[];
}

export interface Prioritized {
  ordered: (Finding & { priorityScore: number; constraintNote?: string })[];
  structural?: Finding;
  quickWin?: Finding;
  investigation?: Finding;
  /** Explica por que a ação rápida vem antes da prioridade estrutural. */
  quickWinRationale?: string;
  avoidNow: { decision: string; why: string }[];
}

/* ------------------------------ Diagnóstico ------------------------------ */

export type AppEnvironment = 'demo' | 'test' | 'production';

export interface BusinessProfile {
  campaign_status: string | null;
  business_type: string | null;
  product: string | null;
  customer_type: string | null;
  region: string | null;
  budget_range: string | null;
  platforms: string[];
  manager: string | null;
  ticket_range: string | null;
  ticket_exact: number | null;
  margin_range: string | null;
  margin_definition: MarginDefinition | null;
  main_problem: string | null;
  priority: string | null;
  offer: string | null;
}

export interface DiagnosticRecord {
  diagnostic_id: string;
  environment: AppEnvironment;
  created_at: string;
  contract_version: string;
  questionnaire_version: string;
  deepening_version: string | null;
  scoring_version: string;
  methodology_version: string;
  prompt_version: string;
  report_version: string;
  business_profile: BusinessProfile;
  conversion_path: string | null;
  answers: AnswerEntry[];
  metrics: { period: Period | null; margin_definition: MarginDefinition | null; values: Partial<Record<MetricKey, MetricEntry>> };
  evidence: { links: LinkEvidence[]; files: never[] };
  constraints: string[];
  missing_fields: string[];
  contradictions: Contradiction[];
  calculated_metrics: CalculatedMetric[];
  assessment: Assessment;
}
