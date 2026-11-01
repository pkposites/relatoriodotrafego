import { describe, expect, it } from 'vitest';
import type { ResponsesClient } from '../../../src/ai/generate';
import { buildModelInput } from '../../../src/ai/modelInput';
import { buildDiagnostic } from '../../../src/domain/diagnostic';
import { PROFILES } from '../../../src/domain/profiles';
import { renderPdfNode } from '../../../src/pdf/renderNode';
import { aiTestEnv, authorized, runAiTest } from './aiTest';
import { MemoryKV } from './store';

const cfg = { apiKey: 'sk-teste', model: 'modelo-teste', internalSecret: 'segredo', maxOutputTokens: 1000, timeoutMs: 1000, maxAttempts: 2 };

/** Cliente falso que devolve o rascunho do próprio sistema como se fosse a IA. */
function fakeClient(answer: (body: Record<string, unknown>) => string): ResponsesClient & { bodies: Record<string, unknown>[] } {
  const bodies: Record<string, unknown>[] = [];
  return { bodies, responses: { create: async (body) => { bodies.push(body); return { status: 'completed', output_text: answer(body), usage: { total_tokens: 1 } }; } } };
}

describe('teste da IA com perfil fictício', () => {
  it('exige chave, modelo e segredo interno', () => {
    expect(aiTestEnv({})).toBeNull();
    expect(aiTestEnv({ OPENAI_API_KEY: 'k', OPENAI_MODEL: 'm', INTERNAL_TASK_SECRET: 's' })?.model).toBe('m');
  });
  it('só aceita o segredo exato', () => {
    expect(authorized(new Request('https://x', { headers: { 'x-internal-secret': 'segredo' } }), 'segredo')).toBe(true);
    expect(authorized(new Request('https://x', { headers: { 'x-internal-secret': 'segredO' } }), 'segredo')).toBe(false);
    expect(authorized(new Request('https://x'), 'segredo')).toBe(false);
  });
  it('gera, valida e grava o resultado e o PDF, sem guardar a resposta na OpenAI', async () => {
    const p = PROFILES.local_whatsapp;
    const draft = buildModelInput(buildDiagnostic({ id: 'x', environment: 'test', answers: p.answers, metrics: p.metrics, links: [], hasDeepening: true, createdAt: new Date().toISOString() }), p.answers).draft;
    const kv = new MemoryKV();
    const client = fakeClient(() => JSON.stringify(draft));
    await runAiTest(kv, client, cfg, 'local_whatsapp', 'run-1', async (doc) => new Uint8Array(await renderPdfNode(doc)));
    const r = (await kv.getJSON<{ status: string; model: string }>('ai-test/run-1'))!.value;
    expect(r).toMatchObject({ status: 'concluido', model: 'modelo-teste' });
    const pdf = await kv.getBytes('ai-test/run-1.pdf');
    expect(Buffer.from(pdf!.subarray(0, 5)).toString()).toBe('%PDF-');
    expect(client.bodies[0]).toMatchObject({ model: 'modelo-teste', store: false });
  }, 30000);
  it('registra a falha quando a IA devolve algo inválido', async () => {
    const kv = new MemoryKV();
    await runAiTest(kv, fakeClient(() => 'isto não é json'), cfg, 'local_whatsapp', 'run-2', async () => new Uint8Array());
    expect((await kv.getJSON<{ status: string; attempts: number }>('ai-test/run-2'))!.value).toMatchObject({ status: 'falha', attempts: 2 });
  });
});
