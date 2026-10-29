import { capiPayload, capiUrl, parseBrowserEvent, purchasePayload, signSiteEvent, translateCakto, verifyCakto, type Env as CoreEnv, type SiteEvent } from './core';

/** Tipos mínimos da Cloudflare (evita depender de @cloudflare/workers-types). */
interface KV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(opts: { prefix: string; limit?: number }): Promise<{ keys: { name: string }[] }>;
}
interface Ctx {
  waitUntil(p: Promise<unknown>): void;
}
export interface Env extends CoreEnv {
  /** Fila de repasses que falharam (site fora do ar, modo demonstração). Opcional. */
  PENDING?: KV;
}

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

const MAX_ATTEMPTS = 288; // ~24 h com o cron a cada 5 min

async function forward(env: Env, ev: SiteEvent): Promise<boolean> {
  const { body, signature } = await signSiteEvent(env.SITE_WEBHOOK_SECRET, ev);
  try {
    const r = await fetch(env.SITE_WEBHOOK_URL, { method: 'POST', headers: { 'content-type': 'application/json', 'x-signature': signature }, body, signal: AbortSignal.timeout(5000) });
    // 2xx = aceito; 401 = segredo divergente (não adianta repetir, mas fica na fila para correção).
    return r.ok;
  } catch {
    return false;
  }
}

async function sendCapi(env: Env, payload: unknown) {
  if (!env.META_PIXEL_ID || !env.META_CAPI_TOKEN) return;
  const r = await fetch(capiUrl(env), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  if (!r.ok) console.error('[capi]', r.status, (await r.text()).slice(0, 300));
}

async function caktoWebhook(req: Request, env: Env, ctx: Ctx) {
  const raw = await req.text();
  const ok = await verifyCakto(env.CAKTO_WEBHOOK_SECRET, raw, req.headers.get('x-cakto-timestamp'), req.headers.get('x-cakto-signature'));
  if (!ok) return json(401, { error: 'assinatura inválida' });
  let payload: { event?: string; data?: unknown };
  try {
    payload = JSON.parse(raw);
  } catch {
    return json(400, { error: 'corpo inválido' });
  }
  const allowed = (env.CAKTO_ALLOWED_OFFERS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const { events, orders, ignored } = translateCakto(payload, allowed);
  const results: Record<string, string> = {};
  let lost = false;
  for (const ev of events) {
    if (await forward(env, ev)) results[ev.event_id] = 'entregue';
    else if (env.PENDING) {
      // A Cakto não reenvia quando respondemos: a fila garante a entrega.
      await env.PENDING.put(`pending:${ev.event_id}`, JSON.stringify({ ev, attempts: 1 }), { expirationTtl: 3 * 86400 });
      results[ev.event_id] = 'na_fila';
    } else {
      results[ev.event_id] = 'falhou';
      lost = true;
    }
  }
  if (payload.event === 'purchase_approved' && env.META_CAPI_PURCHASE === 'true') {
    const now = Math.floor(Date.now() / 1000);
    for (const o of orders) ctx.waitUntil(purchasePayload(o, now, env.META_TEST_EVENT_CODE).then((p) => sendCapi(env, p)));
  }
  // Sem fila: devolve erro para a entrega aparecer como falha no histórico da Cakto e ser reenviada de lá.
  if (lost) return json(503, { ok: false, results, ignored });
  return json(200, { ok: true, results, ignored });
}

function cors(env: Env, req: Request) {
  const origin = req.headers.get('origin');
  return origin === env.ALLOWED_ORIGIN ? { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST', 'access-control-allow-headers': 'content-type', vary: 'origin' } : null;
}

async function browserEvent(req: Request, env: Env, ctx: Ctx) {
  const headers = cors(env, req);
  if (!headers) return json(403, { error: 'origem não autorizada' });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  const text = await req.text();
  if (text.length > 4000) return json(413, { error: 'grande demais' }, headers);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return json(400, { error: 'corpo inválido' }, headers);
  }
  const ev = parseBrowserEvent(raw, env.ALLOWED_ORIGIN);
  if (!ev) return json(400, { error: 'evento inválido' }, headers);
  const payload = capiPayload(ev, req.headers.get('cf-connecting-ip'), req.headers.get('user-agent'), Math.floor(Date.now() / 1000), env.META_TEST_EVENT_CODE);
  ctx.waitUntil(sendCapi(env, payload));
  return new Response(null, { status: 204, headers });
}

export default {
  async fetch(req: Request, env: Env, ctx: Ctx): Promise<Response> {
    const { pathname } = new URL(req.url);
    if (pathname === '/health') return json(200, { ok: true });
    if (pathname === '/cakto/webhook' && req.method === 'POST') return caktoWebhook(req, env, ctx);
    if (pathname === '/capi/event' && (req.method === 'POST' || req.method === 'OPTIONS')) return browserEvent(req, env, ctx);
    return json(404, { error: 'não encontrado' });
  },

  /** Cron: reenvia ao site o que ficou na fila. */
  async scheduled(_c: unknown, env: Env): Promise<void> {
    if (!env.PENDING) return;
    const { keys } = await env.PENDING.list({ prefix: 'pending:', limit: 50 });
    for (const { name } of keys) {
      const item = JSON.parse((await env.PENDING.get(name)) ?? 'null') as { ev: SiteEvent; attempts: number } | null;
      if (!item) continue;
      if (await forward(env, item.ev)) await env.PENDING.delete(name);
      else if (item.attempts + 1 >= MAX_ATTEMPTS) {
        console.error('[fila] desistindo de', name);
        await env.PENDING.put(`failed:${item.ev.event_id}`, JSON.stringify(item), { expirationTtl: 30 * 86400 });
        await env.PENDING.delete(name);
      } else await env.PENDING.put(name, JSON.stringify({ ...item, attempts: item.attempts + 1 }), { expirationTtl: 3 * 86400 });
    }
  },
};
