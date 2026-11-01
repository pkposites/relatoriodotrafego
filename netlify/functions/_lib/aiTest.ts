import { generatePlanWithAI, type ResponsesClient } from '../../../src/ai/generate';
import { METHOD_MATERIALS } from '../../../src/ai/method';
import { buildModelInput } from '../../../src/ai/modelInput';
import { buildDiagnostic } from '../../../src/domain/diagnostic';
import { PROFILES } from '../../../src/domain/profiles';
import { VERSIONS } from '../../../src/domain/versions';
import { businessLabel } from '../../../src/lib/planBuilder';
import { buildPlanDocument } from '../../../src/pdf/planDocument';
import type { KV } from './store';

/**
 * Teste da IA com perfis FICTÍCIOS, sem pedido nem pagamento. Serve para conferir
 * a integração com a OpenAI, o custo e a qualidade antes de abrir as vendas.
 * Só roda com o segredo interno e grava o resultado em `ai-test/<run>`.
 */
export interface AiTestEnv {
  apiKey: string;
  model: string;
  internalSecret: string;
  maxOutputTokens: number;
  timeoutMs: number;
  maxAttempts: number;
}

export function aiTestEnv(env: Record<string, string | undefined> = process.env): AiTestEnv | null {
  if (!env.OPENAI_API_KEY || !env.OPENAI_MODEL || !env.INTERNAL_TASK_SECRET) return null;
  return {
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    internalSecret: env.INTERNAL_TASK_SECRET,
    maxOutputTokens: Number(env.OPENAI_MAX_OUTPUT_TOKENS ?? 12000),
    timeoutMs: Number(env.OPENAI_TIMEOUT_MS ?? 120000),
    maxAttempts: Math.min(3, Number(env.OPENAI_MAX_ATTEMPTS ?? 2)),
  };
}

export const RUN_ID = /^[a-z0-9-]{4,40}$/;

export async function runAiTest(
  kv: KV,
  client: ResponsesClient,
  cfg: AiTestEnv,
  profileId: string,
  runId: string,
  renderPdf: (doc: ReturnType<typeof buildPlanDocument>) => Promise<Uint8Array>,
) {
  const key = `ai-test/${runId}`;
  const profile = PROFILES[profileId];
  if (!profile) return kv.setJSON(key, { status: 'erro', detail: `Perfil desconhecido: ${profileId}`, perfis: Object.keys(PROFILES) });
  await kv.setJSON(key, { status: 'gerando', perfil: profileId, model: cfg.model, startedAt: new Date().toISOString() });
  const started = Date.now();
  const dx = buildDiagnostic({ id: `teste-${runId}`, environment: 'test', answers: profile.answers, metrics: profile.metrics, links: [], hasDeepening: true, createdAt: new Date().toISOString() });
  const input = buildModelInput(dx, profile.answers);
  const ai = await generatePlanWithAI(client, { model: cfg.model, maxOutputTokens: cfg.maxOutputTokens, timeoutMs: cfg.timeoutMs, maxAttempts: cfg.maxAttempts, materials: METHOD_MATERIALS }, input);
  const seconds = Math.round((Date.now() - started) / 100) / 10;
  if (!ai.ok) return kv.setJSON(key, { status: 'falha', perfil: profileId, model: cfg.model, seconds, reason: ai.reason, detail: ai.detail, attempts: ai.attempts, usage: ai.usage });
  const doc = buildPlanDocument(ai.plan, {
    businessLabel: businessLabel(profile.answers),
    generatedAt: new Date().toISOString(),
    period: dx.record.metrics.period,
    versions: { report: VERSIONS.report, scoring: VERSIONS.scoring, prompt: VERSIONS.prompt, questionnaire: VERSIONS.questionnaire },
    generation: { mode: 'ia', model: cfg.model },
    environment: 'test',
    sampleLabel: 'TESTE DA IA — perfil fictício',
  });
  const pdf = await renderPdf(doc);
  await kv.setBytes(`${key}.pdf`, pdf);
  return kv.setJSON(key, { status: 'concluido', perfil: profileId, model: cfg.model, seconds, attempts: ai.attempts, warnings: ai.warnings, usage: ai.usage, pdfBytes: pdf.byteLength, plan: ai.plan });
}

export function authorized(req: Request, secret: string) {
  const got = req.headers.get('x-internal-secret') ?? '';
  if (!secret || got.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}
