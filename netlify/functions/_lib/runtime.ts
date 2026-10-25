import OpenAI from 'openai';
import { generatePlanWithAI, type ResponsesClient } from '../../../src/ai/generate';
import { renderPdfNode } from '../../../src/pdf/renderNode';
import { loadConfig, type ServerConfig } from './config';
import type { Deps } from './orders';
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
  };
}
