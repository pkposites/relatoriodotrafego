import type { ModelInput } from './modelInput';
import { PLAN_JSON_SCHEMA, PLAN_SCHEMA_NAME, type PlanOutput } from './outputSchema';
import { buildSystemPrompt, PROMPT_VERSION, type MethodologyMaterials } from './prompt';
import { validatePlan } from './validate';

/**
 * Chamada à OpenAI (Responses API + Structured Outputs). Executa SOMENTE no
 * servidor. O cliente é injetado para permitir testes sem rede e sem chave.
 * Formato verificado nos tipos do SDK oficial `openai` 7.43.0:
 *   responses.create({ model, instructions, input, text: { format: { type: 'json_schema', name, schema, strict } }, max_output_tokens })
 *   → response.output_text; recusas aparecem como conteúdo do tipo "refusal".
 */

export interface ResponsesClient {
  responses: {
    create(
      body: Record<string, unknown>,
      options?: { timeout?: number; maxRetries?: number },
    ): Promise<{ status?: string; output_text?: string; output?: { type: string; content?: { type: string; refusal?: string }[] }[]; usage?: unknown; incomplete_details?: unknown }>;
  };
}

export interface GenerateConfig {
  model: string;
  maxOutputTokens: number;
  timeoutMs: number;
  /** Tentativas totais (inclui a primeira). Mantenha baixo para controlar custo. */
  maxAttempts: number;
  materials?: MethodologyMaterials;
}

export type GenerateResult =
  | { ok: true; plan: PlanOutput; attempts: number; promptVersion: string; warnings: string[]; usage: unknown[] }
  | { ok: false; reason: 'recusa' | 'incompleta' | 'invalida' | 'erro_api'; detail: string; attempts: number; usage: unknown[] };

export async function generatePlanWithAI(client: ResponsesClient, cfg: GenerateConfig, input: ModelInput): Promise<GenerateResult> {
  const instructions = buildSystemPrompt(cfg.materials);
  const usage: unknown[] = [];
  let feedback: string | null = null;
  let last: GenerateResult | null = null;

  for (let attempt = 1; attempt <= cfg.maxAttempts; attempt++) {
    const userContent = JSON.stringify(input.payload);
    const messages: { role: 'user'; content: string }[] = [{ role: 'user', content: userContent }];
    if (feedback) messages.push({ role: 'user', content: `A resposta anterior foi rejeitada pelo validador. Corrija apenas estes pontos, mantendo as regras: ${feedback}` });
    let res;
    try {
      res = await client.responses.create(
        {
          model: cfg.model,
          instructions,
          input: messages,
          max_output_tokens: cfg.maxOutputTokens,
          text: { format: { type: 'json_schema', name: PLAN_SCHEMA_NAME, schema: PLAN_JSON_SCHEMA, strict: true } },
          store: false,
          metadata: { prompt_version: PROMPT_VERSION },
        },
        { timeout: cfg.timeoutMs, maxRetries: 0 },
      );
    } catch (e) {
      last = { ok: false, reason: 'erro_api', detail: e instanceof Error ? e.message : String(e), attempts: attempt, usage };
      continue;
    }
    usage.push(res.usage ?? null);
    const refusal = res.output?.flatMap((o) => o.content ?? []).find((c) => c.type === 'refusal');
    if (refusal) return { ok: false, reason: 'recusa', detail: refusal.refusal ?? 'recusa', attempts: attempt, usage };
    if (res.status === 'incomplete') {
      last = { ok: false, reason: 'incompleta', detail: JSON.stringify(res.incomplete_details ?? {}), attempts: attempt, usage };
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(res.output_text ?? '');
    } catch {
      last = { ok: false, reason: 'invalida', detail: 'Saída não é JSON.', attempts: attempt, usage };
      feedback = 'A saída precisa ser JSON válido no esquema.';
      continue;
    }
    const v = validatePlan(parsed, input);
    if (v.ok) return { ok: true, plan: parsed as PlanOutput, attempts: attempt, promptVersion: PROMPT_VERSION, warnings: v.warnings, usage };
    last = { ok: false, reason: 'invalida', detail: v.errors.slice(0, 10).join(' | '), attempts: attempt, usage };
    feedback = v.errors.slice(0, 10).join(' | ');
  }
  return last ?? { ok: false, reason: 'erro_api', detail: 'Sem tentativas.', attempts: 0, usage };
}
