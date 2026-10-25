import type { Answers, LinkEvidence, MetricsInput } from '../domain/types';

/**
 * Persistência local (demo e progresso do quiz). Tolerante a falhas:
 * o app funciona sem armazenamento disponível. v3 = questionário fase A 3.0.
 */
const QUIZ_KEY = 'rdt:quiz:v3';
const ORDERS_KEY = 'rdt:orders:v1';
const CONSULT_KEY = 'rdt:consultoria:v1';

export interface QuizState {
  sessionId: string;
  answers: Answers;
  screen: number;
  startedAt: string;
  completedAt?: string;
}

/** Pedido no navegador. Em demo, simula todo o ciclo localmente; em produção guarda só id e token de acesso. */
export interface LocalOrder {
  id: string;
  accessToken?: string;
  product: 'plano' | 'especialista';
  environment: 'demo' | 'test' | 'production';
  diagnosticId: string;
  answers: Answers;
  deepening?: Answers;
  metrics?: MetricsInput;
  links?: LinkEvidence[];
  status: 'aguardando_pagamento' | 'aguardando_informacoes' | 'gerando' | 'concluido' | 'falha';
  createdAt: string;
  feedback?: { clarity?: string; specificity?: string };
}

function read<T>(k: string): T | undefined {
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}
function write(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* ignorado */
  }
}
function remove(k: string) {
  try {
    localStorage.removeItem(k);
  } catch {
    /* ignorado */
  }
}

export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const newQuiz = (): QuizState => ({ sessionId: newId('dx'), answers: {}, screen: 0, startedAt: new Date().toISOString() });
export const loadQuiz = (): QuizState | undefined => {
  const q = read<QuizState>(QUIZ_KEY);
  return q && typeof q === 'object' && q.answers ? q : undefined;
};
export const saveQuiz = (q: QuizState) => write(QUIZ_KEY, q);
export const clearQuiz = () => remove(QUIZ_KEY);

export const loadOrders = (): LocalOrder[] => read<LocalOrder[]>(ORDERS_KEY) ?? [];
export const getOrder = (id: string) => loadOrders().find((o) => o.id === id);
export function saveOrder(o: LocalOrder) {
  const list = loadOrders().filter((x) => x.id !== o.id);
  write(ORDERS_KEY, [o, ...list].slice(0, 20));
}

export interface ConsultingRequest {
  id: string;
  createdAt: string;
  diagnosticId?: string;
  /** Dados de contato: separados do diagnóstico e nunca enviados à IA. */
  contact: { name: string; company: string; channel: 'whatsapp' | 'email' | 'ligacao'; phone?: string; email?: string };
  budget: string;
  difficulty: string;
  message?: string;
  marketingOptIn: boolean;
}
export const loadConsulting = (): ConsultingRequest[] => read<ConsultingRequest[]>(CONSULT_KEY) ?? [];
export const saveConsulting = (r: ConsultingRequest) => write(CONSULT_KEY, [r, ...loadConsulting()].slice(0, 20));

export function clearAllLocal() {
  [QUIZ_KEY, ORDERS_KEY, CONSULT_KEY, 'rdt:events:v1', 'rdt:quiz:v1', 'rdt:quiz:v2', 'rdt:local-leads:v1', 'rdt:local-leads:v2'].forEach(remove);
}
