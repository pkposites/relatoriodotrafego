import { API_BASE, APP_ENV } from '../config/env';
import { pixelEvent } from './metaPixel';

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

const PRICE: Record<string, number> = { plano: 67.9, especialista: 197 };
const PRODUCT_NAME: Record<string, string> = { plano: 'Plano de Ação do Tráfego', especialista: 'Diagnóstico com Especialista' };

/** Espelho no pixel da Meta (só com consentimento). Sem respostas nem dados pessoais. */
function mirrorToPixel(name: EventName, props: Props) {
  const plan = String(props.plan ?? '');
  const product = PRICE[plan] ? { value: PRICE[plan], currency: 'BRL' as const, content_name: PRODUCT_NAME[plan] } : {};
  if (name === 'diagnostico_inicio') pixelEvent('DiagnosticoIniciado');
  else if (name === 'diagnostico_concluido') pixelEvent('Lead', { content_name: 'Diagnóstico gratuito' });
  else if (name === 'resultado_visto') pixelEvent('ViewContent', { content_name: 'Resultado gratuito' });
  else if (name === 'oferta_clique' && PRICE[plan]) pixelEvent('AddToCart', product);
  else if (name === 'oferta_clique' && plan === 'consultoria') pixelEvent('Contact', { content_name: 'Consultoria' });
  // InitiateCheckout e Purchase saem do checkout da Cakto (pixel + API de Conversões configurados lá).
  else if (name === 'interesse_especialista') pixelEvent('InteresseEspecialista');
}

export function track(name: EventName, props: Props = {}) {
  const clean: Props = {};
  for (const k of ALLOWED_PROPS) if (props[k] !== undefined) clean[k] = props[k];
  mirrorToPixel(name, clean);
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
