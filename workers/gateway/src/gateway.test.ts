import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../../../netlify/functions/_lib/config';
import { verifyAndParse } from '../../../netlify/functions/_lib/payment';
import { caktoSignature, parseBrowserEvent, purchasePayload, sha256Hex, translateCakto, verifyCakto } from './core';
import worker, { type Env } from './index';

const SECRET = 'segredo-cakto';
const NOW = 1_800_000_000_000;
const TS = String(NOW / 1000);
const ORIGIN = 'https://diagnostico.relatoriorda.com.br';

const order = (over: Record<string, unknown> = {}) => ({
  id: 'b3df956e-1998-4322-b091-ac0c54f7b4ba',
  status: 'paid',
  callback: 'rdt_AbC123xyz-_9',
  amount: 68.89,
  offer: { id: '4jcq93j', price: 67.9 },
  customer: { name: 'Maria da Silva', email: ' Maria@Exemplo.com ', phone: '+55 (11) 99999-0000' },
  fbp: 'fb.1.123.456',
  fbc: null,
  checkoutUrl: 'https://pay.cakto.com.br/4jcq93j_1257574?callback=rdt_AbC123xyz-_9',
  paidAt: '2026-10-29T10:00:00-03:00',
  ...over,
});

describe('assinatura da Cakto (docs.cakto.com.br/conceitos/webhooks)', () => {
  it('confere com o algoritmo documentado: HMAC-SHA256 de "{timestamp}.{corpo}"', async () => {
    const body = '{"event":"purchase_approved"}';
    const doc = 'v1=' + createHmac('sha256', SECRET).update(`${TS}.`).update(body).digest('hex');
    expect(await caktoSignature(SECRET, TS, body)).toBe(doc);
    expect(await verifyCakto(SECRET, body, TS, doc, NOW)).toBe(true);
    expect(await verifyCakto(SECRET, body, TS, `v2=xyz,${doc}`, NOW)).toBe(true);
  });
  it('recusa corpo alterado, segredo errado, assinatura ausente e entrega antiga', async () => {
    const body = '{"event":"purchase_approved"}';
    const sig = await caktoSignature(SECRET, TS, body);
    expect(await verifyCakto(SECRET, body + ' ', TS, sig, NOW)).toBe(false);
    expect(await verifyCakto('outro', body, TS, sig, NOW)).toBe(false);
    expect(await verifyCakto(SECRET, body, TS, null, NOW)).toBe(false);
    expect(await verifyCakto(SECRET, body, TS, sig, NOW + 10 * 60_000)).toBe(false);
  });
});

describe('tradução Cakto → site', () => {
  it('compra aprovada vira payment.approved com o pedido do callback e o preço da oferta', () => {
    const { events } = translateCakto({ event: 'purchase_approved', data: order() });
    expect(events).toEqual([{ event_id: 'cakto_b3df956e-1998-4322-b091-ac0c54f7b4ba_purchase_approved', type: 'payment.approved', order_ref: 'rdt_AbC123xyz-_9', amount_cents: 6790 }]);
  });
  it('reembolso e chargeback encerram; recusa avisa; outros eventos são ignorados', () => {
    expect(translateCakto({ event: 'refund', data: order() }).events[0].type).toBe('payment.refunded');
    expect(translateCakto({ event: 'chargeback', data: order({ status: 'MED' }) }).events[0].type).toBe('payment.refunded');
    expect(translateCakto({ event: 'purchase_refused', data: order() }).events[0].type).toBe('payment.refused');
    expect(translateCakto({ event: 'pix_gerado', data: order() }).events).toEqual([]);
  });
  it('ignora pedido sem callback nosso e oferta fora da lista', () => {
    expect(translateCakto({ event: 'purchase_approved', data: order({ callback: null }) }).events).toEqual([]);
    expect(translateCakto({ event: 'purchase_approved', data: order({ callback: '../admin' }) }).events).toEqual([]);
    expect(translateCakto({ event: 'purchase_approved', data: order() }, ['outra']).events).toEqual([]);
  });
  it('webhook V2 (data em lista) gera um evento por pedido', () => {
    const { events } = translateCakto({ event: 'purchase_approved', data: [order(), order({ id: 'x2', callback: null })] });
    expect(events).toHaveLength(1);
  });
});

describe('API de Conversões', () => {
  it('evento do site: só nomes da lista, só a origem do site, sem query string', () => {
    const ok = parseBrowserEvent({ event_name: 'Lead', event_id: 'abcdef12-3456', event_source_url: `${ORIGIN}/resultado?x=1`, custom_data: { value: 67.9, currency: 'BRL', email: 'a@b.co' }, fbp: 'fb.1.2.3' }, ORIGIN);
    expect(ok).toEqual({ event_name: 'Lead', event_id: 'abcdef12-3456', event_source_url: `${ORIGIN}/resultado`, custom_data: { value: 67.9, currency: 'BRL' }, fbp: 'fb.1.2.3', fbc: undefined });
    expect(parseBrowserEvent({ event_name: 'Purchase', event_id: 'abcdef12', event_source_url: `${ORIGIN}/` }, ORIGIN)).toBeNull();
    expect(parseBrowserEvent({ event_name: 'Lead', event_id: 'abcdef12', event_source_url: 'https://outro.site/' }, ORIGIN)).toBeNull();
  });
  it('Purchase pelo servidor manda dados do comprador só em hash e normalizados', async () => {
    const p = await purchasePayload(order() as never, Math.floor(NOW / 1000));
    const ud = p.data[0].user_data as Record<string, string[]>;
    expect(ud.em).toEqual([await sha256Hex('maria@exemplo.com')]);
    expect(ud.ph).toEqual([await sha256Hex('5511999990000')]);
    expect(ud.fn).toEqual([await sha256Hex('maria')]);
    expect(ud.ln).toEqual([await sha256Hex('silva')]);
    expect(JSON.stringify(p)).not.toMatch(/maria|exemplo|9999/i);
    expect(p.data[0].event_id).toBe('cakto_b3df956e-1998-4322-b091-ac0c54f7b4ba');
  });
});

/* ------------------------------ Worker de ponta a ponta ------------------------------ */

function memKV() {
  const m = new Map<string, string>();
  return {
    m,
    get: async (k: string) => m.get(k) ?? null,
    put: async (k: string, v: string) => void m.set(k, v),
    delete: async (k: string) => void m.delete(k),
    list: async ({ prefix }: { prefix: string }) => ({ keys: [...m.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })) }),
  };
}

function env(over: Partial<Env> = {}): Env {
  return {
    CAKTO_WEBHOOK_SECRET: SECRET,
    SITE_WEBHOOK_SECRET: 'segredo-site',
    SITE_WEBHOOK_URL: `${ORIGIN}/.netlify/functions/payment-webhook`,
    META_PIXEL_ID: '2018578222100683',
    META_CAPI_TOKEN: 'token-meta',
    ALLOWED_ORIGIN: ORIGIN,
    PENDING: memKV(),
    ...over,
  };
}
const ctx = () => {
  const tasks: Promise<unknown>[] = [];
  return { tasks, waitUntil: (p: Promise<unknown>) => void tasks.push(p) };
};

async function caktoRequest(payload: unknown, nowS = Math.floor(Date.now() / 1000)) {
  const body = JSON.stringify(payload);
  return new Request('https://rdt-gateway.exemplo.workers.dev/cakto/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-cakto-timestamp': String(nowS), 'x-cakto-signature': await caktoSignature(SECRET, String(nowS), body) },
    body,
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('Worker', () => {
  it('repassa a compra ao site num formato que a função payment-webhook aceita', async () => {
    const sent: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      sent.push({ url, init });
      return new Response('{}', { status: 200 });
    });
    const r = await worker.fetch(await caktoRequest({ secret: SECRET, event: 'purchase_approved', data: order() }), env(), ctx());
    expect(r.status).toBe(200);
    expect(sent).toHaveLength(1);
    // A função do Netlify, com o mesmo segredo, aceita e entende o evento.
    const cfg = loadConfig({ APP_MODE: 'test', PUBLIC_BASE_URL: ORIGIN, OPENAI_API_KEY: 'k', OPENAI_MODEL: 'm', PAYMENT_WEBHOOK_SECRET: 'segredo-site', CHECKOUT_URL_PLANO: 'https://pay.cakto.com.br/4jcq93j_1257574', DOWNLOAD_SIGNING_SECRET: 'd', INTERNAL_TASK_SECRET: 'i' }).payment;
    const ev = verifyAndParse(String(sent[0].init.body), new Headers(sent[0].init.headers as Record<string, string>), cfg);
    expect(ev).toEqual({ eventId: 'cakto_b3df956e-1998-4322-b091-ac0c54f7b4ba_purchase_approved', type: 'pago', orderRef: 'rdt_AbC123xyz-_9', amountCents: 6790 });
  });

  it('recusa entrega sem assinatura válida', async () => {
    const req = new Request('https://w/cakto/webhook', { method: 'POST', headers: { 'x-cakto-timestamp': '1', 'x-cakto-signature': 'v1=00' }, body: '{}' });
    expect((await worker.fetch(req, env(), ctx())).status).toBe(401);
  });

  it('site fora do ar: guarda na fila e o cron entrega depois', async () => {
    let up = false;
    vi.stubGlobal('fetch', async () => new Response('{}', { status: up ? 200 : 404 }));
    const e = env();
    const r = await worker.fetch(await caktoRequest({ event: 'purchase_approved', data: order() }), e, ctx());
    expect(((await r.json()) as { results: Record<string, string> }).results).toEqual({ 'cakto_b3df956e-1998-4322-b091-ac0c54f7b4ba_purchase_approved': 'na_fila' });
    await worker.scheduled({}, e);
    expect((e.PENDING as ReturnType<typeof memKV>).m.size).toBe(1);
    up = true;
    await worker.scheduled({}, e);
    expect((e.PENDING as ReturnType<typeof memKV>).m.size).toBe(0);
  });

  it('sem fila configurada, responde erro para a Cakto registrar a falha', async () => {
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 404 }));
    const r = await worker.fetch(await caktoRequest({ event: 'purchase_approved', data: order() }), env({ PENDING: undefined }), ctx());
    expect(r.status).toBe(503);
  });

  it('Purchase pela API só sai com META_CAPI_PURCHASE=true', async () => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      urls.push(url);
      return new Response('{}', { status: 200 });
    });
    const c1 = ctx();
    await worker.fetch(await caktoRequest({ event: 'purchase_approved', data: order() }), env(), c1);
    await Promise.all(c1.tasks);
    expect(urls.some((u) => u.includes('graph.facebook.com'))).toBe(false);
    const c2 = ctx();
    await worker.fetch(await caktoRequest({ event: 'purchase_approved', data: order() }), env({ META_CAPI_PURCHASE: 'true' }), c2);
    await Promise.all(c2.tasks);
    expect(urls.filter((u) => u.startsWith('https://graph.facebook.com/v24.0/2018578222100683/events'))).toHaveLength(1);
  });

  it('/capi/event: aceita só a origem do site e repassa IP e navegador à Meta', async () => {
    const bodies: unknown[] = [];
    vi.stubGlobal('fetch', async (_u: string, init: RequestInit) => {
      bodies.push(JSON.parse(String(init.body)));
      return new Response('{}', { status: 200 });
    });
    const mk = (origin: string) =>
      new Request('https://w/capi/event', {
        method: 'POST',
        headers: { origin, 'cf-connecting-ip': '200.1.2.3', 'user-agent': 'Teste/1.0' },
        body: JSON.stringify({ event_name: 'AddToCart', event_id: 'evt_12345678', event_source_url: `${ORIGIN}/planos`, custom_data: { value: 67.9, currency: 'BRL' } }),
      });
    expect((await worker.fetch(mk('https://outro.site'), env(), ctx())).status).toBe(403);
    const c = ctx();
    const r = await worker.fetch(mk(ORIGIN), env(), c);
    await Promise.all(c.tasks);
    expect(r.status).toBe(204);
    expect(r.headers.get('access-control-allow-origin')).toBe(ORIGIN);
    expect(bodies[0]).toMatchObject({ data: [{ event_name: 'AddToCart', event_id: 'evt_12345678', action_source: 'website', user_data: { client_ip_address: '200.1.2.3', client_user_agent: 'Teste/1.0' } }] });
  });
});
