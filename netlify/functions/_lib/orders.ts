import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { GenerateResult } from '../../../src/ai/generate';
import { buildModelInput, type ModelInput } from '../../../src/ai/modelInput';
import type { PlanOutput } from '../../../src/ai/outputSchema';
import { validatePlan } from '../../../src/ai/validate';
import { buildDiagnostic } from '../../../src/domain/diagnostic';
import { isComplete } from '../../../src/domain/questionnaire';
import type { Answers, LinkEvidence, MetricsInput } from '../../../src/domain/types';
import { VERSIONS } from '../../../src/domain/versions';
import { buildPlanDocument } from '../../../src/pdf/planDocument';
import { businessLabel } from '../../../src/lib/planBuilder';
import type { ServerConfig } from './config';
import type { PaymentEvent } from './payment';
import type { KV } from './store';

export type OrderStatus = 'aguardando_pagamento' | 'aguardando_informacoes' | 'gerando' | 'concluido' | 'falha';
export type Product = 'plano' | 'especialista';

export interface Order {
  id: string;
  env: 'test' | 'production';
  product: Product;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  tokenHash: string;
  expectedCents: number;
  diagnostic: { id: string; answers: Answers; links: LinkEvidence[] };
  deepening?: Answers;
  metrics?: MetricsInput;
  paymentEventIds: string[];
  generation: { runs: number; lockUntil?: string; mode?: 'ia' | 'deterministico'; model?: string; promptVersion?: string; warnings?: string[]; lastError?: string };
  pdfKey?: string;
  message?: string;
  history: { at: string; status: OrderStatus; note?: string }[];
}

export interface Deps {
  kv: KV;
  cfg: ServerConfig;
  /** Geração com IA (injetada). */
  generate: (input: ModelInput) => Promise<GenerateResult>;
  renderPdf: (doc: ReturnType<typeof buildPlanDocument>) => Promise<Uint8Array>;
  /** Cria o link de pagamento do pedido no provedor (Mercado Pago). Sem ele, usa o link fixo da configuração. */
  createCheckout?: (input: { orderId: string; product: Product; amountCents: number; email: string }) => Promise<string>;
  now?: () => Date;
}

export const PRODUCT_TITLES: Record<Product, string> = {
  plano: 'Plano de Ação do Tráfego',
  especialista: 'Diagnóstico com Especialista',
};

export const MAX_GENERATION_RUNS = 3;
const LOCK_MS = 15 * 60 * 1000;
const env = (d: Deps): Order['env'] => (d.cfg.mode === 'production' ? 'production' : 'test');
const now = (d: Deps) => (d.now ? d.now() : new Date());
const k = {
  order: (d: Deps, id: string) => `${env(d)}/orders/${id}`,
  event: (d: Deps, id: string) => `${env(d)}/payment-events/${id}`,
  contact: (d: Deps, id: string) => `${env(d)}/contacts/${id}`,
  pdf: (d: Deps, id: string) => `${env(d)}/pdf/${id}.pdf`,
};
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

export class OrderError extends Error {
  constructor(public code: 'nao_encontrado' | 'nao_autorizado' | 'estado_invalido' | 'dados_invalidos', message: string) {
    super(message);
  }
}

/* ------------------------------ leitura e escrita ------------------------------ */

export async function getOrder(d: Deps, id: string): Promise<Order | null> {
  return (await d.kv.getJSON<Order>(k.order(d, id)))?.value ?? null;
}

/** Atualização com concorrência otimista (ETag). Retorna null se `fn` decidir não alterar. */
async function updateOrder(d: Deps, id: string, fn: (o: Order) => Order | null): Promise<Order | null> {
  for (let i = 0; i < 6; i++) {
    const cur = await d.kv.getJSON<Order>(k.order(d, id));
    if (!cur) throw new OrderError('nao_encontrado', 'Pedido não encontrado.');
    const next = fn(structuredClone(cur.value));
    if (!next) return null;
    next.updatedAt = now(d).toISOString();
    if (await d.kv.setJSON(k.order(d, id), next, { ifMatch: cur.etag })) return next;
  }
  throw new Error('Conflito ao atualizar o pedido.');
}

function setStatus(o: Order, status: OrderStatus, at: Date, note?: string): Order {
  o.status = status;
  o.history.push({ at: at.toISOString(), status, note });
  return o;
}

export function authorize(o: Order, token: string) {
  const a = Buffer.from(o.tokenHash, 'hex');
  const b = Buffer.from(sha(token ?? ''), 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new OrderError('nao_autorizado', 'Acesso não autorizado.');
}

/* ------------------------------ criação ------------------------------ */

const MAX_PAYLOAD = 60_000;

export async function createOrder(d: Deps, input: { product: Product; diagnosticId: string; answers: Answers; links: LinkEvidence[]; email: string }) {
  if (!['plano', 'especialista'].includes(input.product)) throw new OrderError('dados_invalidos', 'Produto inválido.');
  if (!input.answers || !isComplete(input.answers)) throw new OrderError('dados_invalidos', 'Diagnóstico incompleto.');
  if (JSON.stringify(input.answers).length > MAX_PAYLOAD) throw new OrderError('dados_invalidos', 'Respostas grandes demais.');
  if (!/^\S+@\S+\.\S+$/.test(input.email ?? '') || input.email.length > 200) throw new OrderError('dados_invalidos', 'E-mail inválido.');
  const checkoutBase = d.cfg.payment.checkoutUrls[input.product];
  if (!d.createCheckout && !checkoutBase) throw new OrderError('dados_invalidos', 'Produto indisponível no momento.');
  // Links: só registrados como "informado". Nunca são acessados pelo servidor.
  const links = (input.links ?? []).slice(0, 3).filter((l) => /^https?:\/\//i.test(l.url) && l.url.length <= 300).map((l) => ({ url: l.url, status: 'informado' as const }));
  const id = `rdt_${randomBytes(9).toString('base64url')}`;
  const token = randomBytes(24).toString('base64url');
  const t = now(d);
  const order: Order = {
    id,
    env: env(d),
    product: input.product,
    createdAt: t.toISOString(),
    updatedAt: t.toISOString(),
    status: 'aguardando_pagamento',
    tokenHash: sha(token),
    expectedCents: d.cfg.payment.expectedCents[input.product],
    diagnostic: { id: String(input.diagnosticId).slice(0, 80), answers: input.answers, links },
    paymentEventIds: [],
    generation: { runs: 0 },
    history: [{ at: t.toISOString(), status: 'aguardando_pagamento' }],
  };
  await d.kv.setJSON(k.order(d, id), order, { onlyIfNew: true });
  // Contato separado da análise; nunca vai para a IA.
  await d.kv.setJSON(k.contact(d, id), { email: input.email, createdAt: order.createdAt });
  if (d.createCheckout) {
    const checkoutUrl = await d.createCheckout({ orderId: id, product: input.product, amountCents: order.expectedCents, email: input.email });
    return { order, accessToken: token, checkoutUrl };
  }
  const url = new URL(checkoutBase);
  url.searchParams.set(d.cfg.payment.refParam, id);
  return { order, accessToken: token, checkoutUrl: url.toString() };
}

/* ------------------------------ pagamento ------------------------------ */

export async function handlePayment(d: Deps, ev: PaymentEvent): Promise<{ result: 'duplicado' | 'ignorado' | 'atualizado' | 'sem_mudanca'; order?: Order }> {
  // Idempotência: cada evento é processado uma única vez.
  const first = await d.kv.setJSON(k.event(d, ev.eventId), { at: now(d).toISOString(), type: ev.type, orderRef: ev.orderRef }, { onlyIfNew: true });
  if (!first) return { result: 'duplicado' };
  const existing = await getOrder(d, ev.orderRef);
  if (!existing) return { result: 'ignorado' };
  const t = now(d);
  const updated = await updateOrder(d, ev.orderRef, (o) => {
    if (o.paymentEventIds.includes(ev.eventId)) return null;
    o.paymentEventIds.push(ev.eventId);
    if (ev.type === 'pago') {
      if (ev.amountCents !== null && ev.amountCents !== o.expectedCents) {
        o.history.push({ at: t.toISOString(), status: o.status, note: `Valor divergente: recebido ${ev.amountCents}, esperado ${o.expectedCents}. Verificação manual.` });
        o.message = 'Pagamento recebido com valor diferente do esperado. O suporte vai verificar.';
        return o;
      }
      if (o.status === 'aguardando_pagamento') return setStatus(o, 'aguardando_informacoes', t, 'Pagamento confirmado pelo provedor.');
      return o;
    }
    if (ev.type === 'recusado') {
      o.message = 'O pagamento não foi aprovado. Você pode tentar novamente pelo mesmo link.';
      o.history.push({ at: t.toISOString(), status: o.status, note: 'Pagamento recusado.' });
      return o;
    }
    if (ev.type === 'reembolsado') {
      o.message = 'Pedido reembolsado.';
      return setStatus(o, 'falha', t, 'Reembolso registrado.');
    }
    return o;
  });
  return updated ? { result: 'atualizado', order: updated } : { result: 'sem_mudanca' };
}

/* ------------------------------ aprofundamento ------------------------------ */

function sanitizeDeepening(a: Answers): Answers {
  const out: Answers = {};
  for (const [key, v] of Object.entries(a ?? {})) {
    if (!/^b_[a-z_]{2,40}$/.test(key)) continue;
    if (typeof v === 'string') out[key] = v.slice(0, 600);
    else if (Array.isArray(v)) out[key] = v.filter((x) => typeof x === 'string').slice(0, 10).map((x) => x.slice(0, 40));
  }
  return out;
}

export async function submitDeepening(d: Deps, id: string, token: string, deepening: Answers, metrics?: MetricsInput) {
  const o = await getOrder(d, id);
  if (!o) throw new OrderError('nao_encontrado', 'Pedido não encontrado.');
  authorize(o, token);
  if (o.product !== 'plano') throw new OrderError('estado_invalido', 'Este produto não usa aprofundamento automático.');
  const clean = sanitizeDeepening(deepening);
  if (JSON.stringify({ clean, metrics }).length > MAX_PAYLOAD) throw new OrderError('dados_invalidos', 'Informações grandes demais.');
  const t = now(d);
  const updated = await updateOrder(d, id, (x) => {
    if (x.status !== 'aguardando_informacoes') return null;
    x.deepening = clean;
    x.metrics = metrics;
    return setStatus(x, 'gerando', t, 'Informações recebidas.');
  });
  if (!updated) throw new OrderError('estado_invalido', o.status === 'aguardando_pagamento' ? 'Aguardando confirmação do pagamento.' : 'As informações já foram recebidas.');
  return updated;
}

/* ------------------------------ geração ------------------------------ */

/**
 * Gera o plano de forma idempotente: só uma execução por vez (trava com prazo),
 * no máximo MAX_GENERATION_RUNS execuções, e "concluído" só depois de o PDF
 * existir e o plano passar na validação.
 */
export async function runGeneration(d: Deps, id: string): Promise<Order | null> {
  const t = now(d);
  const locked = await updateOrder(d, id, (o) => {
    if (o.status !== 'gerando') return null;
    if (o.generation.lockUntil && Date.parse(o.generation.lockUntil) > t.getTime()) return null;
    if (o.generation.runs >= MAX_GENERATION_RUNS) {
      o.message = `Não conseguimos gerar o plano após ${MAX_GENERATION_RUNS} tentativas. O pedido segue registrado e o suporte foi acionado; nenhuma cobrança adicional será feita.`;
      return setStatus(o, 'falha', t, 'Limite de tentativas.');
    }
    o.generation.runs += 1;
    o.generation.lockUntil = new Date(t.getTime() + LOCK_MS).toISOString();
    return o;
  });
  if (!locked || locked.status !== 'gerando') return locked;

  try {
    const answers: Answers = { ...locked.diagnostic.answers, ...(locked.deepening ?? {}) };
    const dx = buildDiagnostic({ id: locked.diagnostic.id, environment: locked.env, answers, metrics: locked.metrics, links: locked.diagnostic.links, hasDeepening: !!locked.deepening && Object.keys(locked.deepening).length > 0, createdAt: locked.createdAt });
    const input = buildModelInput(dx, answers);
    const ai = await d.generate(input);
    let plan: PlanOutput;
    let mode: 'ia' | 'deterministico' = 'ia';
    let warnings: string[] = [];
    if (ai.ok) {
      plan = ai.plan;
      warnings = ai.warnings;
    } else if (d.cfg.allowDeterministicFallback) {
      plan = input.draft;
      mode = 'deterministico';
      warnings = [`IA indisponível (${ai.reason}); entregue versão por regras do sistema.`];
    } else {
      throw new Error(`Geração com IA falhou: ${ai.reason} — ${ai.detail}`.slice(0, 500));
    }
    const check = validatePlan(plan, input);
    if (!check.ok) throw new Error(`Plano reprovado na validação final: ${check.errors.slice(0, 3).join(' | ')}`);
    const doc = buildPlanDocument(plan, {
      businessLabel: businessLabel(answers),
      generatedAt: now(d).toISOString(),
      period: dx.record.metrics.period,
      versions: { report: VERSIONS.report, scoring: VERSIONS.scoring, prompt: VERSIONS.prompt, questionnaire: VERSIONS.questionnaire },
      generation: { mode, model: mode === 'ia' ? d.cfg.openai.model : undefined },
      environment: locked.env,
      sampleLabel: locked.env === 'test' ? 'AMBIENTE DE TESTE' : undefined,
      supportContact: d.cfg.supportContact ?? undefined,
    });
    const pdf = await d.renderPdf(doc);
    if (!pdf || pdf.byteLength < 1000 || Buffer.from(pdf.subarray(0, 5)).toString() !== '%PDF-') throw new Error('PDF inválido.');
    await d.kv.setBytes(k.pdf(d, id), pdf);
    await d.kv.setJSON(`${k.order(d, id)}/plan`, plan);
    return await updateOrder(d, id, (o) => {
      o.pdfKey = k.pdf(d, id);
      o.generation = { ...o.generation, lockUntil: undefined, mode, model: mode === 'ia' ? d.cfg.openai.model : undefined, promptVersion: VERSIONS.prompt, warnings, lastError: undefined };
      o.message = undefined;
      return setStatus(o, 'concluido', now(d), mode === 'ia' ? 'Plano gerado e validado.' : 'Plano gerado por regras (fallback autorizado).');
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return updateOrder(d, id, (o) => {
      o.generation.lockUntil = undefined;
      o.generation.lastError = msg.slice(0, 500);
      if (o.generation.runs >= MAX_GENERATION_RUNS) {
        o.message = 'Não conseguimos gerar o plano com a qualidade exigida. O pedido segue registrado e o suporte foi acionado; nenhuma cobrança adicional será feita.';
        return setStatus(o, 'falha', now(d), 'Falha na geração.');
      }
      o.message = 'Houve um problema na geração; vamos tentar novamente automaticamente.';
      return o;
    });
  }
}

/** Uma geração parada (sem trava ativa) pode ser retomada — recuperação da entrega. */
export function needsRetry(o: Order, at: Date): boolean {
  return o.status === 'gerando' && o.generation.runs < MAX_GENERATION_RUNS && (!o.generation.lockUntil || Date.parse(o.generation.lockUntil) <= at.getTime());
}

/* ------------------------------ download ------------------------------ */

export function signDownload(secret: string, id: string, exp: number) {
  return createHmac('sha256', secret).update(`${id}.${exp}`).digest('base64url');
}
export function verifyDownload(secret: string, id: string, exp: number, sig: string, at: Date) {
  if (!secret || !Number.isFinite(exp) || exp < at.getTime() / 1000) return false;
  const a = Buffer.from(signDownload(secret, id, exp));
  const b = Buffer.from(sig ?? '');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function statusView(d: Deps, o: Order) {
  const view: { status: OrderStatus; message?: string; downloadUrl?: string } = { status: o.status, message: o.message };
  if (o.status === 'concluido' && o.pdfKey) {
    const exp = Math.floor(now(d).getTime() / 1000) + 24 * 3600;
    view.downloadUrl = `/.netlify/functions/download?id=${encodeURIComponent(o.id)}&exp=${exp}&sig=${signDownload(d.cfg.downloadSecret, o.id, exp)}`;
  }
  return view;
}

export async function getPdf(d: Deps, o: Order) {
  return o.pdfKey ? d.kv.getBytes(o.pdfKey) : null;
}
