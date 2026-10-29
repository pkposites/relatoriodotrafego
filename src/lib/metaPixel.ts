import { APP_ENV } from '../config/env';

/**
 * Pixel da Meta, carregado SÓ depois do consentimento do visitante (LGPD).
 * - Sem correspondência avançada e sem coleta automática (autoConfig desligado):
 *   nenhum e-mail, telefone, resposta do diagnóstico ou texto de formulário vai à Meta.
 * - Compra (Purchase) NÃO é disparada aqui: o pagamento acontece na plataforma
 *   de pagamento, que tem o próprio pixel. Evita compra contada em dobro.
 */
export const PIXEL_ID = ((import.meta.env?.VITE_META_PIXEL_ID as string | undefined) ?? '').trim();
/** Gateway (Cloudflare Worker) que repassa os eventos à API de Conversões. Vazio = só o pixel. */
const CAPI_URL = ((import.meta.env?.VITE_CAPI_URL as string | undefined) ?? '').trim().replace(/\/$/, '');
const CONSENT_KEY = 'rdt:consent:v1';
export type Consent = 'granted' | 'denied' | null;

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue: unknown[][]; loaded: boolean; version: string; push: unknown };
declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

export function getConsent(): Consent {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

const listeners = new Set<(c: Consent) => void>();
export function onConsentChange(fn: (c: Consent) => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

export function setConsent(c: Consent) {
  try {
    if (c) localStorage.setItem(CONSENT_KEY, c);
    else localStorage.removeItem(CONSENT_KEY);
  } catch {
    /* armazenamento indisponível: vale só nesta visita */
  }
  if (c === 'granted') {
    loadPixel();
    pixelEvent('PageView');
  }
  if (c !== 'granted') window.fbq?.('consent', 'revoke');
  listeners.forEach((fn) => fn(c));
}

let loaded = false;

/** Injeta o script oficial da Meta. Não faz nada sem ID ou sem consentimento. O PageView sai na troca de página (App). */
export function loadPixel() {
  if (loaded || !PIXEL_ID || getConsent() !== 'granted' || typeof document === 'undefined') return;
  loaded = true;
  if (!window.fbq) {
    const q: unknown[][] = [];
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else q.push(args);
    } as Fbq;
    fbq.queue = q;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    window.fbq = fbq;
    window._fbq = fbq;
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(s);
  }
  window.fbq!('consent', 'grant');
  window.fbq!('set', 'autoConfig', false, PIXEL_ID);
  window.fbq!('init', PIXEL_ID);
}

const STANDARD = new Set(['PageView', 'ViewContent', 'Lead', 'AddToCart', 'Contact']);

function cookie(name: string) {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

function newEventId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

/**
 * Envia um evento ao pixel e, se configurado, à API de Conversões pelo gateway,
 * com o mesmo event_id (a Meta deduplica). Parâmetros só da lista permitida.
 */
export function pixelEvent(name: string, params: { value?: number; currency?: 'BRL'; content_name?: string } = {}) {
  if (!loaded || !window.fbq) return;
  const custom = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined));
  const eventID = newEventId();
  window.fbq(STANDARD.has(name) ? 'track' : 'trackCustom', name, { ...custom, environment: APP_ENV }, { eventID });
  if (!CAPI_URL) return;
  const body = JSON.stringify({
    event_name: name,
    event_id: eventID,
    event_source_url: `${location.origin}${location.pathname}`,
    custom_data: custom,
    fbp: cookie('_fbp'),
    fbc: cookie('_fbc'),
  });
  fetch(`${CAPI_URL}/capi/event`, { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {
    /* a API de Conversões é complementar ao pixel */
  });
}
