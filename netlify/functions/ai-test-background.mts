import OpenAI from 'openai';
import type { ResponsesClient } from '../../src/ai/generate';
import { renderPdfNode } from '../../src/pdf/renderNode';
import { aiTestEnv, authorized, RUN_ID, runAiTest } from './_lib/aiTest';
import { blobsKV } from './_lib/store';

/** POST { perfil, run } com x-internal-secret. Gera um plano de teste com a IA (segundo plano, até 15 min). */
export default async (req: Request) => {
  const cfg = aiTestEnv();
  if (!cfg || req.method !== 'POST' || !authorized(req, cfg.internalSecret)) return;
  const { perfil, run } = (await req.json()) as { perfil?: string; run?: string };
  if (!run || !RUN_ID.test(run)) return;
  const kv = await blobsKV('relatorio-do-trafego');
  const client = new OpenAI({ apiKey: cfg.apiKey }) as unknown as ResponsesClient;
  try {
    await runAiTest(kv, client, cfg, String(perfil ?? 'local_whatsapp'), run, async (doc) => new Uint8Array(await renderPdfNode(doc)));
  } catch (e) {
    await kv.setJSON(`ai-test/${run}`, { status: 'erro', detail: e instanceof Error ? e.message : String(e) });
  }
};
