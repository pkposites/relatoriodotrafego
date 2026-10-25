export type PillarId = 'mensuracao' | 'rentabilidade' | 'estrategia' | 'criativos' | 'conversao';

export type QuestionId =
  | 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6'
  | 'q7' | 'q8' | 'q9' | 'q10' | 'q11' | 'q12';

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
}

export type QuestionRole = 'contexto' | 'qualificacao' | 'dor' | 'diagnostico' | 'objetivo';

export interface Question {
  id: QuestionId;
  stage: 1 | 2 | 3 | 4;
  title: string;
  subtitle: string;
  role: QuestionRole;
  options: QuestionOption[];
}

export interface Stage {
  id: 1 | 2 | 3 | 4;
  name: string;
  /** Frase de transição exibida ao entrar na etapa (exceto a primeira). */
  intro: string;
}

export type Answers = Partial<Record<QuestionId, string>>;

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

export interface ScoreResult {
  overall: number;
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

export interface Report {
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
