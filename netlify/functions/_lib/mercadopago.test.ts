import { describe, expect, it } from 'vitest';
import { PROFILES } from '../../../src/domain/profiles';
import { loadConfig, ConfigError } from './config';
import { createPreference, fetchPaymentEvent, mpManifest, mpSign, verifyMercadoPago, type FetchLike, type MercadoPagoConfig } from './mercadopago';
import { createOrder, getOrder, handlePayment, type Deps } from './orders';
import { SignatureError } from './payment';
import { MemoryKV } from './store';

const mp: MercadoPagoConfig = { accessToken: 'TEST-token', webhookSecret: 'segredo-mp', toleranceSeconds: 600 };
const NOW = 1_800_000_000_000;
const TS = String(NOW / 1000);
const url = (id = '123456', type = 'payment') => new URL(`https://exemplo.netlify.app/.netlify/functions/payment-webhook?data.id=${id}&type=${type}`);
const body = (id = '123456', type = 'payment') => JSON.stringify({ action: 'payment.updated', type, data: { id } });
const signed = (id = '123456', ts = TS, secret = mp.webhookSecret, requestId = 'req-1') =>
  new Headers({ 'x-signature': `ts=${ts},v1=${mpSign(secret, id.toLowerCase(), requestId, ts)}`, 'x-request-id': requestId });

/** Resposta falsa da API do Mercado Pago, registrando as chamadas. */
function fakeApi(payment: Record<string, unknown>, status = 200) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fn: FetchLike = async (u, init) => {
    calls.push({ url: u, init });
    return new Response(JSON.stringify(payment), { status });
  };
  return { fn, calls };
}

describe('Mercado Pago: assinatura do aviso', () => {
  it('monta o manifesto como o SDK oficial (pares ausentes omitidos)', () => {
    expect(mpManifest('123', 'req-1', '99')).toBe('id:123;request-id:req-1;ts:99;');
    expect(mpManifest(null, 'req-1', '99')).toBe('request-id:req-1;ts:99;');
    expect(mpManifest('123', null, '99')).toBe('id:123;ts:99;');
  });
  it('aceita aviso assinado e devolve o id do pagamento', () => {
    expect(verifyMercadoPago(url(), signed(), body(), mp, NOW)).toBe('123456');
  });
  it('recusa assinatura ausente, malformada, de outro segredo ou de outro id', () => {
    expect(() => verifyMercadoPago(url(), new Headers(), body(), mp, NOW)).toThrow(SignatureError);
    expect(() => verifyMercadoPago(url(), new Headers({ 'x-signature': 'v1=abc' }), body(), mp, NOW)).toThrow(SignatureError);
    expect(() => verifyMercadoPago(url(), signed('123456', TS, 'outro-segredo'), body(), mp, NOW)).toThrow(SignatureError);
    expect(() => verifyMercadoPago(url('999'), signed('123456'), body('999'), mp, NOW)).toThrow(SignatureError);
  });
  it('recusa aviso antigo (reenvio malicioso)', () => {
    const old = String(NOW / 1000 - 3600);
    expect(() => verifyMercadoPago(url(), signed('123456', old), body(), mp, NOW)).toThrow(/janela/);
  });
  it('ignora avisos que não são de pagamento, depois de conferir a assinatura', () => {
    expect(verifyMercadoPago(url('77', 'merchant_order'), signed('77'), body('77', 'merchant_order'), mp, NOW)).toBeNull();
  });
});

describe('Mercado Pago: estado do pagamento vem da API', () => {
  it('converte pagamento aprovado em evento "pago" com valor em centavos', async () => {
    const api = fakeApi({ id: 123456, status: 'approved', external_reference: 'rdt_abc', transaction_amount: 67.9, live_mode: false });
    const ev = await fetchPaymentEvent(api.fn, mp, '123456', false);
    expect(ev).toEqual({ eventId: 'mp_123456_approved', type: 'pago', orderRef: 'rdt_abc', amountCents: 6790 });
    expect(api.calls[0].url).toBe('https://api.mercadopago.com/v1/payments/123456');
    expect(new Headers(api.calls[0].init?.headers).get('authorization')).toBe('Bearer TEST-token');
  });
  it('reembolso e contestação viram "reembolsado"; recusa vira "recusado"', async () => {
    for (const [status, type] of [['refunded', 'reembolsado'], ['charged_back', 'reembolsado'], ['rejected', 'recusado'], ['pending', 'outro']] as const) {
      const ev = await fetchPaymentEvent(fakeApi({ id: 1, status, external_reference: 'rdt_x', transaction_amount: 67.9, live_mode: true }).fn, mp, '1', true);
      expect(ev?.type).toBe(type);
    }
  });
  it('pagamento de teste não libera pedido de produção', async () => {
    expect(await fetchPaymentEvent(fakeApi({ id: 1, status: 'approved', external_reference: 'rdt_x', transaction_amount: 67.9, live_mode: false }).fn, mp, '1', true)).toBeNull();
  });
  it('pagamento sem referência de pedido é ignorado', async () => {
    expect(await fetchPaymentEvent(fakeApi({ id: 1, status: 'approved', transaction_amount: 67.9 }).fn, mp, '1', false)).toBeNull();
  });
  it('erro da API não confirma nada', async () => {
    await expect(fetchPaymentEvent(fakeApi({}, 500).fn, mp, '1', false)).rejects.toThrow(/500/);
  });
});

describe('Mercado Pago: criação do pagamento', () => {
  it('cria a preferência ligada ao pedido e volta para a página do pedido', async () => {
    const api = fakeApi({ init_point: 'https://mp/prod', sandbox_init_point: 'https://mp/sandbox' });
    const link = await createPreference(api.fn, mp, { orderId: 'rdt_abc', title: 'Plano de Ação do Tráfego', amountCents: 6790, baseUrl: 'https://site.exemplo/', email: 'a@b.co', useSandbox: false });
    expect(link).toBe('https://mp/prod');
    const sent = JSON.parse(String(api.calls[0].init?.body));
    expect(sent.external_reference).toBe('rdt_abc');
    expect(sent.items[0]).toMatchObject({ unit_price: 67.9, quantity: 1, currency_id: 'BRL' });
    expect(sent.back_urls.success).toBe('https://site.exemplo/pedido/rdt_abc');
  });
  it('no modo teste usa o link de sandbox', async () => {
    const link = await createPreference(fakeApi({ init_point: 'https://mp/prod', sandbox_init_point: 'https://mp/sandbox' }).fn, mp, { orderId: 'x', title: 't', amountCents: 100, baseUrl: 'https://s', email: 'a@b.co', useSandbox: true });
    expect(link).toBe('https://mp/sandbox');
  });
});

describe('Mercado Pago: configuração e fluxo do pedido', () => {
  const ENV = {
    APP_MODE: 'test', PUBLIC_BASE_URL: 'https://exemplo.netlify.app', OPENAI_API_KEY: 'sk-teste', OPENAI_MODEL: 'modelo-teste',
    PAYMENT_PROVIDER: 'mercadopago', MP_ACCESS_TOKEN: 'TEST-token', MP_WEBHOOK_SECRET: 'segredo-mp', DOWNLOAD_SIGNING_SECRET: 'd', INTERNAL_TASK_SECRET: 'i',
  };
  it('exige token e segredo do Mercado Pago, mas não link fixo de checkout', () => {
    expect(loadConfig(ENV).payment.provider).toBe('mercadopago');
    try {
      loadConfig({ ...ENV, MP_ACCESS_TOKEN: undefined as unknown as string, MP_WEBHOOK_SECRET: undefined as unknown as string });
      expect.unreachable();
    } catch (e) {
      expect((e as ConfigError).missing).toEqual(['MP_WEBHOOK_SECRET', 'MP_ACCESS_TOKEN']);
    }
  });
  it('pedido usa o link criado no Mercado Pago e é liberado pelo pagamento aprovado', async () => {
    const created: unknown[] = [];
    const d: Deps = {
      kv: new MemoryKV(),
      cfg: loadConfig(ENV),
      generate: async () => { throw new Error('não usado'); },
      renderPdf: async () => new Uint8Array(),
      createCheckout: async (o) => { created.push(o); return 'https://mp/checkout'; },
    };
    const r = await createOrder(d, { product: 'plano', diagnosticId: 'dx', answers: PROFILES.local_whatsapp.answers, links: [], email: 'a@b.co' });
    expect(r.checkoutUrl).toBe('https://mp/checkout');
    expect(created[0]).toEqual({ orderId: r.order.id, product: 'plano', amountCents: 6790, email: 'a@b.co' });
    const ev = await fetchPaymentEvent(fakeApi({ id: 9, status: 'approved', external_reference: r.order.id, transaction_amount: 67.9, live_mode: false }).fn, mp, '9', false);
    expect((await handlePayment(d, ev!)).result).toBe('atualizado');
    expect((await getOrder(d, r.order.id))?.status).toBe('aguardando_informacoes');
    // O mesmo aviso de novo não muda nada.
    expect((await handlePayment(d, ev!)).result).toBe('duplicado');
  });
});
