import { API_BASE, APP_ENV } from '../config/env';

/**
 * Instrumentação sem dados sensíveis: só nomes de eventos e propriedades da
 * lista abaixo. Respostas, textos livres e contatos nunca são enviados.
 * Demo/test: eventos ficam no navegador (rdt:events:v1). Produção: enviados à função "events".
 */
export const EVENTS = [
  'diagnostico_inicio',
  'tela_vista',
  'diagnostico_concluido',
  'resultado_visto',
  'oferta_clique',
  'checkout_inicio',
  'pagamento_confirmado',
  'aprofundamento_concluido',
  'geracao_concluida',
  'geracao_falha',
  'download',
  'avaliacao_utilidade',
  'interesse_especialista',
] as const;
export type EventName = (typeof EVENTS)[number];

const ALLOWED_PROPS = ['screen_id', 'screen_index', 'plan', 'duration_s', 'clarity', 'specificity', 'mode', 'source'] as const;
type Props = Partial<Record<(typeof ALLOWED_PROPS)[number], string | number>>;
const KEY = 'rdt:events:v1';

export function track(name: EventName, props: Props = {}) {
  const clean: Props = {};
  for (const k of ALLOWED_PROPS) if (props[k] !== undefined) clean[k] = props[k];
  const event = { name, props: clean, env: APP_ENV, at: new Date().toISOString() };
  if (APP_ENV === 'production') {
    try {
      navigator.sendBeacon?.(`${API_BASE}/events`, JSON.stringify(event));
    } catch {
      /* ignorado */
    }
    return;
  }
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown[];
    list.push(event);
    localStorage.setItem(KEY, JSON.stringify(list.slice(-300)));
  } catch {
    /* armazenamento indisponível */
  }
}

export function localEvents(): { name: EventName; props: Props; env: string; at: string }[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}
