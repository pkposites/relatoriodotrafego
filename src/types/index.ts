export type PillarId = 'mensuracao' | 'rentabilidade' | 'estrategia' | 'criativos' | 'conversao';

export type QuestionId =
  // Etapa 1 — negócio
  | 'segmento' | 'ticket' | 'margem' | 'ciclo'
  // Etapa 2 — investimento, gestão e objetivos
  | 'orcamento' | 'gestor' | 'plataformas' | 'tempo_anuncio' | 'dor' | 'objetivo'
  // Etapa 3 — mensuração e sinal
  | 'vendas_origem' | 'rastreamento' | 'cac' | 'analise'
  // Etapa 4 — campanhas, criativos e oferta
  | 'otimizacao' | 'estrutura' | 'criativos_volume' | 'formatos' | 'testes' | 'oferta'
  // Etapa 5 — conversão e atendimento
  | 'destino' | 'tempo_resposta' | 'acompanhamento';

/** Contribuição de uma resposta para um pilar. */
export interface PillarContribution {
  /** Nota da resposta para o pilar, 0–100. */
  value: number;
  /** Peso da evidência (1 = evidência plena da pergunta para esse pilar). */
  weight: number;
}

export interface QuestionOption {
  id: string;
  label: string;
  /** Contribuições para pilares. Perguntas de contexto não têm. */
  scores?: Partial<Record<PillarId, PillarContribution>>;
  /** Resposta do tipo "não sei": reduz a evidência disponível. */
  uncertain?: boolean;
  /** Texto curto exibido após a seleção (empatia, sem diagnóstico). */
  note?: string;
  /** Múltipla escolha: pontos que a opção soma no pilar da pergunta. */
  points?: number;
  /** Múltipla escolha: opção que desmarca as demais (ex.: "Não sei"). */
  exclusive?: boolean;
}

export type QuestionRole = 'contexto' | 'qualificacao' | 'dor' | 'diagnostico' | 'objetivo';

export interface Question {
  id: QuestionId;
  stage: 1 | 2 | 3 | 4 | 5;
  title: string;
  subtitle: string;
  role: QuestionRole;
  options: QuestionOption[];
  /** Permite marcar várias opções. A nota é a soma de `points` (máx. 100). */
  multi?: boolean;
  /** Para perguntas `multi`: em quais pilares a soma entra e com que peso. */
  multiWeights?: Partial<Record<PillarId, number>>;
}

export interface Stage {
  id: 1 | 2 | 3 | 4 | 5;
  name: string;
  /** Frase de transição exibida ao entrar na etapa (exceto a primeira). */
  intro: string;
}

export type AnswerValue = string | string[];
export type Answers = Partial<Record<QuestionId, AnswerValue>>;

/** Contexto livre e opcional para a análise com IA (sem dados pessoais). */
export interface FreeContext {
  produto?: string;
  observacoes?: string;
}

/** Dados complementares opcionais — últimos 30 dias. */
export interface OptionalMetricsInput {
  investment?: number;
  leads?: number;
  sales?: number;
  avgTicket?: number;
}

export interface ComputedMetrics {
  cpl?: number;
  cpa?: number;
  leadToSale?: number;
  revenue?: number;
  roas?: number;
  warnings: string[];
  hasAny: boolean;
}

export type EvidenceLevel = 'plena' | 'parcial' | 'limitada';

export interface PillarResult {
  id: PillarId;
  name: string;
  weight: number;
  score: number;
  /** 0–1: quanto da evidência esperada para o pilar foi obtida. */
  evidence: number;
  evidenceLevel: EvidenceLevel;
}

export type BandId = 'critica' | 'potencial' | 'desenvolvimento' | 'organizada';

export interface Band {
  id: BandId;
  min: number;
  max: number;
  label: string;
  tone: 'bad' | 'warn' | 'brand' | 'ok';
}

export type ConfidenceLevel = 'alta' | 'media' | 'baixa';

/** Ajuste realista aplicado à nota: trava (teto) ou piso justificado por dados. */
export interface ScoreAdjustment {
  kind: 'cap' | 'floor';
  scope: PillarId | 'geral';
  limit: number;
  /** Nota antes do ajuste. */
  before: number;
  reason: string;
}

export interface ScoreResult {
  overall: number;
  adjustments: ScoreAdjustment[];
  band: Band;
  pillars: PillarResult[];
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  complete: boolean;
}

export interface Insight {
  pillar: PillarId;
  title: string;
  declared: string;
  hypothesis: string;
  action: string;
}

export type AlertSeverity = 'alta' | 'media' | 'baixa';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  text: string;
}

export interface UnitEconomics {
  ticket?: number;
  marginRate?: number;
  grossProfitPerSale?: number;
  breakevenRoas?: number;
  cpa?: number;
  roas?: number;
  /** CPA comparado ao lucro bruto por venda. */
  status?: 'acima_da_margem' | 'apertado' | 'saudavel';
}

export interface Report {
  profile: string;
  segmentTip: string;
  alerts: Alert[];
  economics: UnitEconomics;
  score: ScoreResult;
  mainGap: Insight;
  gaps: Insight[];
  strength: { title: string; text: string };
  firstStep: string;
  painContext?: string;
  metrics: ComputedMetrics;
}

export type PlanId = 'express' | 'especialista' | 'consultoria';

export interface Plan {
  id: PlanId;
  name: string;
  price: string;
  /** Preço praticado anteriormente, exibido riscado. */
  oldPrice?: string;
  priceNote?: string;
  tagline: string;
  features: string[];
  excludes: string[];
  cta: string;
  href: string;
  highlight?: string;
}

export interface ConsultingRequest {
  name: string;
  company: string;
  budget: string;
  difficulty: string;
  channel: string;
  message?: string;
  marketingOptIn: boolean;
}

export type LeadStatus = 'Novo' | 'Em análise' | 'Contato agendado' | 'Proposta enviada' | 'Sem fit no momento';

export interface LeadRecord {
  id: string;
  source: 'exemplo' | 'local';
  createdAt: string;
  company: string;
  answers: Answers;
  metrics?: OptionalMetricsInput;
  context?: FreeContext;
  plan?: PlanId;
  consulting?: ConsultingRequest;
  status: LeadStatus;
}

export type CommercialTier = 'alto' | 'medio' | 'baixo';

export interface CommercialFactor {
  label: string;
  points: number;
}

export interface CommercialScore {
  score: number;
  tier: CommercialTier;
  factors: CommercialFactor[];
}
