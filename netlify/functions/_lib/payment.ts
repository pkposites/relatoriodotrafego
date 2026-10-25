import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ServerConfig } from './config';

/**
 * Notificações de pagamento. Nenhuma notificação é aceita sem verificação de
 * autenticidade. O provedor "hmac_generico" espera HMAC-SHA256 (hex) do corpo
 * bruto no cabeçalho configurado. O adaptador da Kiwify NÃO está implementado:
 * o mecanismo de assinatura precisa ser confirmado na documentação oficial
 * (pendência em docs/pendencias-externas.md).
 */

export interface PaymentEvent {
  eventId: string;
  type: 'pago' | 'recusado' | 'reembolsado' | 'outro';
  orderRef: string;
  amountCents: number | null;
}

export class SignatureError extends Error {}
export class ProviderNotConfigured extends Error {}

export function hmacHex(secret: string, body: string) {
  return createHmac('sha256', secret).update(body, 'utf8').digest('hex');
}

function safeEqualHex(a: string, b: string) {
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

export function verifyAndParse(rawBody: string, headers: Headers, cfg: ServerConfig['payment']): PaymentEvent {
  if (cfg.provider === 'kiwify') throw new ProviderNotConfigured('Adaptador Kiwify pendente: confirmar esquema de assinatura e formato do evento na documentação oficial.');
  const sig = (headers.get(cfg.signatureHeader) ?? '').replace(/^sha256=/, '').trim();
  if (!cfg.webhookSecret || !sig || !safeEqualHex(sig, hmacHex(cfg.webhookSecret, rawBody))) throw new SignatureError('Assinatura inválida.');
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    throw new SignatureError('Corpo inválido.');
  }
  const map: Record<string, PaymentEvent['type']> = { 'payment.approved': 'pago', 'payment.refused': 'recusado', 'payment.refunded': 'reembolsado' };
  const eventId = String(body.event_id ?? '');
  const orderRef = String(body.order_ref ?? '');
  if (!eventId || !orderRef) throw new SignatureError('Evento sem identificador.');
  return { eventId, orderRef, type: map[String(body.type)] ?? 'outro', amountCents: typeof body.amount_cents === 'number' ? body.amount_cents : null };
}
