/**
 * Lógica do gateway (sem dependências da Cloudflare, testável em Node).
 *
 * 1. Webhook da Cakto: confere `X-Cakto-Signature` = v1=HMAC-SHA256(secret, "{timestamp}.{corpo cru}")
 *    (docs.cakto.com.br/conceitos/webhooks), traduz o evento e repassa ao site
 *    no formato assinado que a função `payment-webhook` já aceita.
 * 2. API de Conversões da Meta: eventos do site (com consentimento), sem dados pessoais.
 */

export interface Env {
  CAKTO_WEBHOOK_SECRET: string;
  /** Mesma chave de PAYMENT_WEBHOOK_SECRET no Netlify. */
  SITE_WEBHOOK_SECRET: string;
  /** Ex.: https://diagnostico.relatoriorda.com.br/.netlify/functions/payment-webhook */
  SITE_WEBHOOK_URL: string;
  /** Ofertas aceitas (ids da Cakto, separados por vírgula). Vazio = qualquer oferta. */
  CAKTO_ALLOWED_OFFERS?: string;
  META_PIXEL_ID: string;
  META_CAPI_TOKEN: string;
  META_API_VERSION?: string;
  META_TEST_EVENT_CODE?: string;
  /** Origem do site autorizada a chamar /capi/event. */
  ALLOWED_ORIGIN: string;
  /** "true" para o Worker enviar o Purchase. Deixe "false" se o pixel + token da API estiverem no produto da Cakto. */
  META_CAPI_PURCHASE?: string;
}

const enc = new TextEncoder();

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(value: string) {
  const d = await crypto.subtle.digest('SHA-256', enc.encode(value));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Comparação em tempo constante. */
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function caktoSignature(secret: string, timestamp: string, rawBody: string) {
  return `v1=${await hmacHex(secret, `${timestamp}.${rawBody}`)}`;
}

/** Valida a assinatura da Cakto. Aceita a lista "v1=...,v2=..." e compara só a v1. */
export async function verifyCakto(secret: string, rawBody: string, timestamp: string | null, signature: string | null, nowMs = Date.now(), toleranceS = 300) {
  if (!secret || !timestamp || !signature || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(nowMs / 1000 - Number(timestamp)) > toleranceS) return false;
  const expected = await caktoSignature(secret, timestamp, rawBody);
  return signature.split(',').map((s) => s.trim()).some((s) => s.startsWith('v1=') && safeEqual(s, expected));
}

export type SiteEventType = 'payment.approved' | 'payment.refused' | 'payment.refunded';
const EVENT_MAP: Record<string, SiteEventType> = {
  purchase_approved: 'payment.approved',
  purchase_refused: 'payment.refused',
  refund: 'payment.refunded',
  chargeback: 'payment.refunded',
};

export interface CaktoOrder {
  id: string;
  status?: string;
  callback?: string | null;
  amount?: number | null;
  offer?: { id?: string; price?: number } | null;
  product?: { short_id?: string } | null;
  customer?: { name?: string; email?: string; phone?: string } | null;
  fbc?: string | null;
  fbp?: string | null;
  checkoutUrl?: string | null;
  paidAt?: string | null;
}

export interface SiteEvent {
  event_id: string;
  type: SiteEventType;
  order_ref: string;
  amount_cents: number | null;
}

const ORDER_REF = /^rdt_[A-Za-z0-9_-]{6,40}$/;

/**
 * Traduz uma entrega da Cakto em eventos do site. Ignora eventos sem relação com
 * a liberação do pedido, pedidos sem `callback` nosso e ofertas fora da lista.
 * Webhook V2 manda `data` como lista; cada pedido vira um evento.
 */
export function translateCakto(payload: { event?: string; data?: unknown }, allowedOffers: string[] = []): { events: SiteEvent[]; orders: CaktoOrder[]; ignored: string[] } {
  const type = EVENT_MAP[payload.event ?? ''];
  const list = (Array.isArray(payload.data) ? payload.data : [payload.data]).filter(Boolean) as CaktoOrder[];
  const events: SiteEvent[] = [];
  const orders: CaktoOrder[] = [];
  const ignored: string[] = [];
  if (!type) return { events, orders, ignored: [`evento ${payload.event} sem efeito no pedido`] };
  for (const o of list) {
    if (!o?.id) { ignored.push('pedido sem id'); continue; }
    const offerId = o.offer?.id ?? '';
    if (allowedOffers.length && !allowedOffers.includes(offerId)) { ignored.push(`oferta ${offerId} fora da lista`); continue; }
    const ref = o.callback ?? '';
    if (!ORDER_REF.test(ref)) { ignored.push(`pedido ${o.id} sem referência do site`); continue; }
    // Preço da oferta (sem taxa de serviço do comprador); cai para o valor cobrado.
    const reais = typeof o.offer?.price === 'number' ? o.offer.price : typeof o.amount === 'number' ? o.amount : null;
    events.push({ event_id: `cakto_${o.id}_${payload.event}`, type, order_ref: ref, amount_cents: reais === null ? null : Math.round(reais * 100) });
    orders.push(o);
  }
  return { events, orders, ignored };
}

export async function signSiteEvent(secret: string, ev: SiteEvent) {
  const body = JSON.stringify(ev);
  return { body, signature: await hmacHex(secret, body) };
}

/* ------------------------------ Meta (API de Conversões) ------------------------------ */

export const SITE_EVENTS = ['PageView', 'ViewContent', 'Lead', 'AddToCart', 'Contact', 'DiagnosticoIniciado', 'InteresseEspecialista'] as const;

export interface BrowserEvent {
  event_name: string;
  event_id: string;
  event_source_url: string;
  custom_data?: { value?: number; currency?: string; content_name?: string };
  fbp?: string;
  fbc?: string;
}

/** Valida o que veio do navegador. Recusa nomes fora da lista e qualquer campo extra. */
export function parseBrowserEvent(raw: unknown, allowedOrigin: string): BrowserEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const name = String(r.event_name ?? '');
  if (!(SITE_EVENTS as readonly string[]).includes(name)) return null;
  const id = String(r.event_id ?? '');
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) return null;
  let url: URL;
  try {
    url = new URL(String(r.event_source_url ?? ''));
  } catch {
    return null;
  }
  if (url.origin !== allowedOrigin) return null;
  const cd = (r.custom_data ?? {}) as Record<string, unknown>;
  const custom: BrowserEvent['custom_data'] = {};
  if (typeof cd.value === 'number' && cd.value >= 0 && cd.value < 10000) custom.value = cd.value;
  if (cd.currency === 'BRL') custom.currency = 'BRL';
  if (typeof cd.content_name === 'string') custom.content_name = cd.content_name.slice(0, 80);
  const cookie = (v: unknown, prefix: string) => (typeof v === 'string' && v.startsWith(prefix) && v.length < 200 ? v : undefined);
  return { event_name: name, event_id: id, event_source_url: `${url.origin}${url.pathname}`, custom_data: custom, fbp: cookie(r.fbp, 'fb.'), fbc: cookie(r.fbc, 'fb.') };
}

export function capiPayload(ev: BrowserEvent, ip: string | null, userAgent: string | null, nowS: number, testCode?: string) {
  const user_data: Record<string, string> = {};
  if (ip) user_data.client_ip_address = ip;
  if (userAgent) user_data.client_user_agent = userAgent;
  if (ev.fbp) user_data.fbp = ev.fbp;
  if (ev.fbc) user_data.fbc = ev.fbc;
  return {
    data: [{ event_name: ev.event_name, event_time: nowS, event_id: ev.event_id, action_source: 'website', event_source_url: ev.event_source_url, user_data, custom_data: ev.custom_data ?? {} }],
    ...(testCode ? { test_event_code: testCode } : {}),
  };
}

const norm = {
  email: (v?: string) => (v ?? '').trim().toLowerCase(),
  phone: (v?: string) => (v ?? '').replace(/\D/g, ''),
  name: (v?: string) => (v ?? '').trim().toLowerCase(),
};

/** Purchase pelo servidor, com dados do comprador em hash SHA-256 (exigência da Meta). */
export async function purchasePayload(o: CaktoOrder, nowS: number, testCode?: string) {
  const user_data: Record<string, unknown> = { country: [await sha256Hex('br')] };
  const email = norm.email(o.customer?.email);
  const phone = norm.phone(o.customer?.phone);
  const [first, ...rest] = norm.name(o.customer?.name).split(/\s+/).filter(Boolean);
  if (email) user_data.em = [await sha256Hex(email)];
  if (phone) user_data.ph = [await sha256Hex(phone)];
  if (first) user_data.fn = [await sha256Hex(first)];
  if (rest.length) user_data.ln = [await sha256Hex(rest[rest.length - 1])];
  user_data.external_id = [await sha256Hex(o.id)];
  if (o.fbp) user_data.fbp = o.fbp;
  if (o.fbc) user_data.fbc = o.fbc;
  const value = typeof o.amount === 'number' ? o.amount : o.offer?.price ?? 0;
  const paid = o.paidAt ? Math.floor(Date.parse(o.paidAt) / 1000) : nowS;
  return {
    data: [
      {
        event_name: 'Purchase',
        event_time: Number.isFinite(paid) && paid <= nowS ? paid : nowS,
        event_id: `cakto_${o.id}`,
        action_source: 'website',
        event_source_url: o.checkoutUrl ?? undefined,
        user_data,
        custom_data: { currency: 'BRL', value, content_name: 'Plano de Ação do Tráfego', order_id: o.id },
      },
    ],
    ...(testCode ? { test_event_code: testCode } : {}),
  };
}

export function capiUrl(env: Env) {
  return `https://graph.facebook.com/${env.META_API_VERSION || 'v24.0'}/${env.META_PIXEL_ID}/events?access_token=${encodeURIComponent(env.META_CAPI_TOKEN)}`;
}
