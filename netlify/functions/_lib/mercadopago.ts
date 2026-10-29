import { createHmac, timingSafeEqual } from 'node:crypto';
import { SignatureError, type PaymentEvent } from './payment';

/**
 * Mercado Pago (Checkout Pro + Webhooks).
 *
 * Esquema de assinatura conferido no SDK oficial `mercadopago` 3.6.1
 * (utils/webhook): cabeçalho `x-signature` = `ts=<segundos>,v1=<hex>`, onde
 * v1 = HMAC-SHA256(segredo, "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"),
 * com `data.id` vindo da query string. Pares ausentes são omitidos do manifesto.
 *
 * A assinatura só prova a origem do aviso. O estado do pagamento é sempre lido
 * de novo na API (`GET /v1/payments/:id`) com o token do servidor.
 */

export const MP_API = 'https://api.mercadopago.com';
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface MercadoPagoConfig {
  accessToken: string;
  webhookSecret: string;
  /** Tolerância do carimbo de tempo do aviso, em segundos. */
  toleranceSeconds: number;
}

export function mpManifest(dataId: string | null, requestId: string | null, ts: string) {
  return `${dataId ? `id:${dataId};` : ''}${requestId ? `request-id:${requestId};` : ''}ts:${ts};`;
}

export function mpSign(secret: string, dataId: string | null, requestId: string | null, ts: string) {
  return createHmac('sha256', secret).update(mpManifest(dataId, requestId, ts)).digest('hex');
}

function parseSignature(header: string) {
  let ts: string | undefined;
  let v1: string | undefined;
  for (const part of header.split(',')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const key = part.slice(0, i).trim().toLowerCase();
    const value = part.slice(i + 1).trim();
    if (key === 'ts') ts = value;
    if (key === 'v1') v1 = value;
  }
  return { ts, v1 };
}

/** Confere a assinatura e devolve o id do pagamento, ou null se o aviso não for de pagamento. */
export function verifyMercadoPago(url: URL, headers: Headers, rawBody: string, cfg: MercadoPagoConfig, nowMs = Date.now()): string | null {
  const { ts, v1 } = parseSignature(headers.get('x-signature') ?? '');
  if (!cfg.webhookSecret || !ts || !/^\d+$/.test(ts) || !v1) throw new SignatureError('Assinatura ausente ou malformada.');
  let body: { type?: string; data?: { id?: unknown } } = {};
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    throw new SignatureError('Corpo inválido.');
  }
  const rawId = url.searchParams.get('data.id') ?? (body.data?.id != null ? String(body.data.id) : null);
  // Ids alfanuméricos entram no manifesto em minúsculas (documentação do Mercado Pago).
  const dataId = rawId ? rawId.toLowerCase() : null;
  const expected = Buffer.from(mpSign(cfg.webhookSecret, dataId, headers.get('x-request-id'), ts));
  const received = Buffer.from(v1);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) throw new SignatureError('Assinatura inválida.');
  if (Math.abs(nowMs - Number(ts) * 1000) > cfg.toleranceSeconds * 1000) throw new SignatureError('Aviso fora da janela de tempo.');
  const type = url.searchParams.get('type') ?? body.type;
  if (type !== 'payment' || !rawId) return null;
  return rawId;
}

const STATUS: Record<string, PaymentEvent['type']> = {
  approved: 'pago',
  rejected: 'recusado',
  cancelled: 'recusado',
  refunded: 'reembolsado',
  charged_back: 'reembolsado',
};

/** Lê o pagamento na API e converte em evento interno. */
export async function fetchPaymentEvent(fetchFn: FetchLike, cfg: MercadoPagoConfig, paymentId: string, expectLive: boolean): Promise<PaymentEvent | null> {
  const r = await fetchFn(`${MP_API}/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { authorization: `Bearer ${cfg.accessToken}` } });
  if (!r.ok) throw new Error(`Mercado Pago respondeu ${r.status} ao consultar o pagamento.`);
  const p = (await r.json()) as { id?: number | string; status?: string; external_reference?: string; transaction_amount?: number; live_mode?: boolean };
  if (!p.external_reference) return null;
  // Pagamento de teste nunca libera pedido de produção, e vice-versa.
  if (typeof p.live_mode === 'boolean' && p.live_mode !== expectLive) return null;
  const status = p.status ?? 'desconhecido';
  return {
    eventId: `mp_${p.id ?? paymentId}_${status}`,
    type: STATUS[status] ?? 'outro',
    orderRef: p.external_reference,
    amountCents: typeof p.transaction_amount === 'number' ? Math.round(p.transaction_amount * 100) : null,
  };
}

export interface PreferenceInput {
  orderId: string;
  title: string;
  amountCents: number;
  baseUrl: string;
  email: string;
  useSandbox: boolean;
}

/** Cria a preferência do Checkout Pro e devolve o link de pagamento. */
export async function createPreference(fetchFn: FetchLike, cfg: MercadoPagoConfig, input: PreferenceInput): Promise<string> {
  const back = `${input.baseUrl.replace(/\/$/, '')}/pedido/${input.orderId}`;
  const r = await fetchFn(`${MP_API}/checkout/preferences`, {
    method: 'POST',
    headers: { authorization: `Bearer ${cfg.accessToken}`, 'content-type': 'application/json', 'x-idempotency-key': `pref-${input.orderId}` },
    body: JSON.stringify({
      items: [{ id: input.orderId, title: input.title, quantity: 1, unit_price: input.amountCents / 100, currency_id: 'BRL' }],
      payer: { email: input.email },
      external_reference: input.orderId,
      back_urls: { success: back, pending: back, failure: back },
      auto_return: 'approved',
      statement_descriptor: 'RELATORIOTRAFEGO',
    }),
  });
  if (!r.ok) throw new Error(`Mercado Pago respondeu ${r.status} ao criar o pagamento.`);
  const pref = (await r.json()) as { init_point?: string; sandbox_init_point?: string };
  const url = input.useSandbox ? pref.sandbox_init_point ?? pref.init_point : pref.init_point;
  if (!url) throw new Error('Mercado Pago não devolveu o link de pagamento.');
  return url;
}
