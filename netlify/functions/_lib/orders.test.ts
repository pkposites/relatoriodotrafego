import { describe, expect, it } from 'vitest';
import type { GenerateResult } from '../../../src/ai/generate';
import type { ModelInput } from '../../../src/ai/modelInput';
import { PROFILES } from '../../../src/domain/profiles';
import { renderPdfNode } from '../../../src/pdf/renderNode';
import { loadConfig, ConfigError } from './config';
import { createOrder, getOrder, handlePayment, MAX_GENERATION_RUNS, needsRetry, runGeneration, statusView, submitDeepening, verifyDownload, type Deps } from './orders';
import { hmacHex, SignatureError, ProviderNotConfigured, verifyAndParse } from './payment';
import { MemoryKV } from './store';

/** Perfil de aceitação 10: falha de pagamento, falha da IA e notificação duplicada. */
const ENV = {
  APP_MODE: 'test', PUBLIC_BASE_URL: 'https://exemplo.netlify.app', OPENAI_API_KEY: 'sk-teste', OPENAI_MODEL: 'modelo-teste',
  PAYMENT_WEBHOOK_SECRET: 'segredo-webhook', CHECKOUT_URL_PLANO: 'https://pagamento.exemplo/checkout', DOWNLOAD_SIGNING_SECRET: 'segredo-download', INTERNAL_TASK_SECRET: 'segredo-interno',
};
const answers = PROFILES.local_whatsapp.answers;

function deps(over: Partial<Deps> = {}, env: Record<string, string> = {}): Deps & { aiCalls: number } {
  const d = {
    kv: new MemoryKV(),
    cfg: loadConfig({ ...ENV, ...env }),
    aiCalls: 0,
    generate: async (input: ModelInput): Promise<GenerateResult> => {
      d.aiCalls++;
      return { ok: true, plan: input.draft, attempts: 1, promptVersion: 'analise/1.0.0', warnings: [], usage: [] };
    },
    renderPdf: async (doc: Parameters<Deps['renderPdf']>[0]) => new Uint8Array(await renderPdfNode(doc)),
    ...over,
  };
  return d as Deps & { aiCalls: number };
}

const paidEvent = (ref: string, id = 'ev-1', amount: number | null = 6790) => ({ eventId: id, type: 'pago' as const, orderRef: ref, amountCents: amount });

async function paidOrder(d: Deps) {
  const r = await createOrder(d, { product: 'plano', diagnosticId: 'dx-1', answers, links: [{ url: 'https://exemplo.com.br', status: 'informado' }], email: 'cliente@exemplo.com' });
  await handlePayment(d, paidEvent(r.order.id));
  return r;
}

describe('configuração', () => {
  it('lista o que falta, sem valores padrão para segredos', () => {
    expect(() => loadConfig({ APP_MODE: 'production' })).toThrow(ConfigError);
    try { loadConfig({ APP_MODE: 'production' }); } catch (e) { expect((e as ConfigError).missing).toEqual(expect.arrayContaining(['OPENAI_API_KEY', 'PAYMENT_WEBHOOK_SECRET', 'DOWNLOAD_SIGNING_SECRET'])); }
    expect(loadConfig({}).mode).toBe('demo');
  });
});

describe('webhook', () => {
  const cfg = loadConfig(ENV).payment;
  const body = JSON.stringify({ event_id: 'ev-9', type: 'payment.approved', order_ref: 'rdt_x', amount_cents: 6790 });
  it('aceita assinatura válida', () => {
    const ev = verifyAndParse(body, new Headers({ 'x-signature': hmacHex('segredo-webhook', body) }), cfg);
    expect(ev).toMatchObject({ eventId: 'ev-9', type: 'pago', orderRef: 'rdt_x', amountCents: 6790 });
  });
  it('rejeita assinatura ausente, errada ou de outro corpo', () => {
    expect(() => verifyAndParse(body, new Headers(), cfg)).toThrow(SignatureError);
    expect(() => verifyAndParse(body, new Headers({ 'x-signature': 'ab'.repeat(32) }), cfg)).toThrow(SignatureError);
    expect(() => verifyAndParse(body + ' ', new Headers({ 'x-signature': hmacHex('segredo-webhook', body) }), cfg)).toThrow(SignatureError);
  });
  it('Kiwify não é aceito até o adaptador ser confirmado', () => {
    expect(() => verifyAndParse(body, new Headers(), { ...cfg, provider: 'kiwify' })).toThrow(ProviderNotConfigured);
  });
});

describe('pedido e pagamento', () => {
  it('cria pedido com contato separado e checkout com referência', async () => {
    const d = deps();
    const r = await createOrder(d, { product: 'plano', diagnosticId: 'dx', answers, links: [], email: 'a@b.co' });
    expect(r.checkoutUrl).toBe(`https://pagamento.exemplo/checkout?ref=${r.order.id}`);
    expect(JSON.stringify(r.order)).not.toMatch(/a@b\.co/);
    expect(r.order.status).toBe('aguardando_pagamento');
  });
  it('rejeita diagnóstico incompleto', async () => {
    await expect(createOrder(deps(), { product: 'plano', diagnosticId: 'dx', answers: { campanhas_status: 'ativas' }, links: [], email: 'a@b.co' })).rejects.toThrow(/incompleto/);
  });
  it('notificação duplicada é processada uma única vez', async () => {
    const d = deps();
    const r = await createOrder(d, { product: 'plano', diagnosticId: 'dx', answers, links: [], email: 'a@b.co' });
    expect((await handlePayment(d, paidEvent(r.order.id))).result).toBe('atualizado');
    expect((await handlePayment(d, paidEvent(r.order.id))).result).toBe('duplicado');
    const o = (await getOrder(d, r.order.id))!;
    expect(o.status).toBe('aguardando_informacoes');
    expect(o.history.filter((h) => h.status === 'aguardando_informacoes')).toHaveLength(1);
  });
  it('pagamento recusado não libera o pedido', async () => {
    const d = deps();
    const r = await createOrder(d, { product: 'plano', diagnosticId: 'dx', answers, links: [], email: 'a@b.co' });
    await handlePayment(d, { eventId: 'ev-r', type: 'recusado', orderRef: r.order.id, amountCents: 6790 });
    const o = (await getOrder(d, r.order.id))!;
    expect(o.status).toBe('aguardando_pagamento');
    expect(o.message).toMatch(/não foi aprovado/);
    await expect(submitDeepening(d, r.order.id, r.accessToken, {})).rejects.toThrow(/Aguardando confirmação/);
  });
  it('valor divergente não libera e pede verificação', async () => {
    const d = deps();
    const r = await createOrder(d, { product: 'plano', diagnosticId: 'dx', answers, links: [], email: 'a@b.co' });
    await handlePayment(d, paidEvent(r.order.id, 'ev-v', 100));
    expect((await getOrder(d, r.order.id))!.status).toBe('aguardando_pagamento');
  });
  it('evento de pedido desconhecido é ignorado', async () => {
    expect((await handlePayment(deps(), paidEvent('rdt_inexistente', 'ev-z'))).result).toBe('ignorado');
  });
  it('token errado não acessa o pedido', async () => {
    const d = deps();
    const r = await paidOrder(d);
    await expect(submitDeepening(d, r.order.id, 'token-errado', {})).rejects.toThrow(/não autorizado/);
  });
});

describe('geração e entrega', () => {
  it('fluxo completo: aprofundamento → geração → PDF válido → link assinado', async () => {
    const d = deps();
    const r = await paidOrder(d);
    await submitDeepening(d, r.order.id, r.accessToken, { b_tempo_semanal: '1_3h', campo_invalido: 'x' } as never, { values: { investimento: { value: 1800, precision: 'exato' } } });
    const o = (await runGeneration(d, r.order.id))!;
    expect(o.status).toBe('concluido');
    expect(o.deepening).toEqual({ b_tempo_semanal: '1_3h' });
    const pdf = await d.kv.getBytes(o.pdfKey!);
    expect(Buffer.from(pdf!.subarray(0, 5)).toString()).toBe('%PDF-');
    const v = statusView(d, o);
    const u = new URL(v.downloadUrl!, 'https://x');
    expect(verifyDownload(d.cfg.downloadSecret, o.id, Number(u.searchParams.get('exp')), u.searchParams.get('sig')!, new Date())).toBe(true);
    expect(verifyDownload(d.cfg.downloadSecret, o.id, Number(u.searchParams.get('exp')), 'adulterada', new Date())).toBe(false);
    expect(verifyDownload(d.cfg.downloadSecret, o.id, 1, u.searchParams.get('sig')!, new Date())).toBe(false);
  });
  it('"pronto" só depois do PDF existir: PDF inválido não conclui', async () => {
    const d = deps({ renderPdf: async () => new Uint8Array([1, 2, 3]) });
    const r = await paidOrder(d);
    await submitDeepening(d, r.order.id, r.accessToken, {});
    const o = (await runGeneration(d, r.order.id))!;
    expect(o.status).toBe('gerando');
    expect(o.generation.lastError).toMatch(/PDF inválido/);
    expect(statusView(d, o).downloadUrl).toBeUndefined();
  });
  it('falha da IA: tentativas limitadas e mensagem honesta, sem fallback silencioso', async () => {
    const d = deps({ generate: async () => ({ ok: false, reason: 'erro_api', detail: 'timeout', attempts: 2, usage: [] }) });
    const r = await paidOrder(d);
    await submitDeepening(d, r.order.id, r.accessToken, {});
    let o = (await getOrder(d, r.order.id))!;
    for (let i = 0; i < MAX_GENERATION_RUNS + 1; i++) o = (await runGeneration(d, r.order.id)) ?? o;
    expect(o.status).toBe('falha');
    expect(o.message).toMatch(/nenhuma cobrança adicional/);
    expect(o.generation.runs).toBe(MAX_GENERATION_RUNS);
  });
  it('fallback por regras só quando autorizado em configuração', async () => {
    const d = deps({ generate: async () => ({ ok: false, reason: 'erro_api', detail: 'x', attempts: 1, usage: [] }) }, { ALLOW_DETERMINISTIC_FALLBACK: 'true' });
    const r = await paidOrder(d);
    await submitDeepening(d, r.order.id, r.accessToken, {});
    const o = (await runGeneration(d, r.order.id))!;
    expect(o.status).toBe('concluido');
    expect(o.generation.mode).toBe('deterministico');
  });
  it('geração idempotente: chamadas concorrentes não repetem o processamento', async () => {
    const d = deps();
    const r = await paidOrder(d);
    await submitDeepening(d, r.order.id, r.accessToken, {});
    await Promise.all([runGeneration(d, r.order.id), runGeneration(d, r.order.id), runGeneration(d, r.order.id)]);
    expect(d.aiCalls).toBe(1);
    expect((await runGeneration(d, r.order.id))?.status ?? 'sem mudança').not.toBe('gerando');
    expect(d.aiCalls).toBe(1);
  });
  it('recuperação: geração parada sem trava pode ser retomada', async () => {
    const d = deps({ renderPdf: async () => new Uint8Array() });
    const r = await paidOrder(d);
    await submitDeepening(d, r.order.id, r.accessToken, {});
    const o = (await runGeneration(d, r.order.id))!;
    expect(needsRetry(o, new Date())).toBe(true);
  });
  it('a entrada enviada à IA não contém o e-mail do comprador', async () => {
    let seen = '';
    const d = deps({ generate: async (input) => { seen = JSON.stringify(input.payload); return { ok: true, plan: input.draft, attempts: 1, promptVersion: 'x', warnings: [], usage: [] }; } });
    const r = await paidOrder(d);
    await submitDeepening(d, r.order.id, r.accessToken, {});
    await runGeneration(d, r.order.id);
    expect(seen).not.toMatch(/cliente@exemplo\.com/);
    expect(seen).toMatch(/informado/);
  });
});
