import type { Answers, FreeContext, LeadRecord, OptionalMetricsInput } from '../types';
import type { MetricField } from './metrics';

/**
 * Persistência APENAS local (localStorage) para demonstração.
 * Nada é enviado a servidores. Todas as leituras/escritas toleram falhas
 * (modo privado, armazenamento bloqueado) e o app funciona sem elas.
 */
// v2: novo questionário (23 perguntas). Dados v1 são ignorados.
const QUIZ_KEY = 'rdt:quiz:v2';
const LEADS_KEY = 'rdt:local-leads:v2';

export interface QuizState {
  sessionId: string;
  answers: Answers;
  /** 0..N-1 perguntas; N = dados opcionais. */
  step: number;
  metricsRaw: Record<MetricField, string>;
  metrics?: OptionalMetricsInput;
  metricsSkipped?: boolean;
  context?: FreeContext;
  completedAt?: string;
  startedAt: string;
}

export const EMPTY_METRICS_RAW: Record<MetricField, string> = { investment: '', leads: '', sales: '', avgTicket: '' };

function read<T>(key: string): T | undefined {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* armazenamento indisponível — segue apenas em memória */
  }
}

function remove(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignorado */
  }
}

export function newId(prefix = 'loc'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function newQuizState(): QuizState {
  return {
    sessionId: newId('sim'),
    answers: {},
    step: 0,
    metricsRaw: { ...EMPTY_METRICS_RAW },
    startedAt: new Date().toISOString(),
  };
}

export function loadQuiz(): QuizState | undefined {
  const s = read<QuizState>(QUIZ_KEY);
  if (!s || typeof s !== 'object' || !s.answers) return undefined;
  return { ...newQuizState(), ...s, metricsRaw: { ...EMPTY_METRICS_RAW, ...s.metricsRaw } };
}

export function saveQuiz(state: QuizState) {
  write(QUIZ_KEY, state);
}

export function clearQuiz() {
  remove(QUIZ_KEY);
}

export function loadLocalLeads(): LeadRecord[] {
  const list = read<LeadRecord[]>(LEADS_KEY);
  return Array.isArray(list) ? list : [];
}

/** Cria ou atualiza o registro local de uma simulação (mesmo id = mesma simulação). */
export function upsertLocalLead(patch: Partial<LeadRecord> & { id: string }): LeadRecord {
  const list = loadLocalLeads();
  const idx = list.findIndex((l) => l.id === patch.id);
  const base: LeadRecord =
    idx >= 0
      ? list[idx]
      : {
          id: patch.id,
          source: 'local',
          createdAt: new Date().toISOString(),
          company: 'Simulação neste navegador',
          answers: {},
          status: 'Novo',
        };
  const next: LeadRecord = { ...base, ...patch, source: 'local' };
  if (idx >= 0) list[idx] = next;
  else list.unshift(next);
  write(LEADS_KEY, list.slice(0, 20));
  return next;
}

/** Limpa toda a demonstração: progresso do quiz e simulações locais. */
export function clearDemo() {
  remove(QUIZ_KEY);
  remove(LEADS_KEY);
}
