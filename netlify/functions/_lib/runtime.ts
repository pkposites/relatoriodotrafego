import OpenAI from 'openai';
import { generatePlanWithAI, type ResponsesClient } from '../../../src/ai/generate';
import { renderPdfNode } from '../../../src/pdf/renderNode';
import { loadConfig, type ServerConfig } from './config';
import { createPreference, type MercadoPagoConfig } from './mercadopago';
import { PRODUCT_TITLES, type Deps } from './orders';
import { blobsKV } from './store';

/** Dependências reais, só no servidor. A chave da OpenAI vem do ambiente da Netlify. */
export async function runtimeDeps(cfg: ServerConfig = loadConfig()): Promise<Deps> {
  const kv = await blobsKV('relatorio-do-trafego');
  const client = new OpenAI({ apiKey: cfg.openai.apiKey }) as unknown as ResponsesClient;
  return {
    kv,
    cfg,
    generate: (input) =>
      generatePlanWithAI(client, { model: cfg.openai.model, maxOutputTokens: cfg.openai.maxOutputTokens, timeoutMs: cfg.openai.timeoutMs, maxAttempts: cfg.openai.maxAttempts }, input),
    renderPdf: async (doc) => new Uint8Array(await renderPdfNode(doc)),
    createCheckout:
      cfg.payment.provider === 'mercadopago'
        ? (o) =>
            createPreference(fetch, mpConfig(cfg), {
              orderId: o.orderId,
              title: PRODUCT_TITLES[o.product],
              amountCents: o.amountCents,
              email: o.email,
              baseUrl: cfg.publicBaseUrl,
              useSandbox: cfg.mode === 'test',
            })
        : undefined,
  };
}

export function mpConfig(cfg: ServerConfig): MercadoPagoConfig {
  return { accessToken: cfg.payment.mpAccessToken, webhookSecret: cfg.payment.webhookSecret, toleranceSeconds: 600 };
}
