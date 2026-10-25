import { describe, expect, it } from 'vitest';
import { buildDiagnostic } from '../domain/diagnostic';
import { PROFILES } from '../domain/profiles';
import { generatePlanWithAI, type ResponsesClient } from './generate';
import { buildModelInput } from './modelInput';
import { PLAN_JSON_SCHEMA } from './outputSchema';
import { buildSystemPrompt } from './prompt';
import { numbersIn, validatePlan, validateStructure } from './validate';

const p = PROFILES.local_whatsapp;
const d = buildDiagnostic({ id: 'x', environment: 'test', answers: p.answers, metrics: p.metrics, createdAt: '2026-10-25T00:00:00Z' });
const input = buildModelInput(d, p.answers);
const clone = () => JSON.parse(JSON.stringify(input.draft));

describe('esquema estrito', () => {
  it('todo objeto tem additionalProperties=false e todas as chaves em required', () => {
    const walk = (s: any) => {
      if (s.type === 'object') {
        expect(s.additionalProperties).toBe(false);
        expect([...s.required].sort()).toEqual(Object.keys(s.properties).sort());
        Object.values(s.properties).forEach(walk);
      }
      if (s.items) walk(s.items);
    };
    walk(PLAN_JSON_SCHEMA);
  });
  it('o plano determinístico respeita o esquema', () => {
    expect(validateStructure(input.draft)).toEqual([]);
  });
});

describe('validador de qualidade', () => {
  it('aceita o rascunho determinístico', () => expect(validatePlan(input.draft, input).ok).toBe(true));
  it('rejeita número sem origem', () => {
    const x = clone();
    x.executive_summary.main_hypothesis = 'O ROAS de mercado do seu segmento é 7,8x.';
    expect(validatePlan(x, input).errors.join()).toMatch(/Número sem origem/);
  });
  it('rejeita promessa de resultado e alegação de acesso', () => {
    const x = clone();
    x.executive_summary.scenario = 'Analisei sua conta e com este plano suas vendas vão dobrar.';
    const e = validatePlan(x, input).errors.join();
    expect(e).toMatch(/Promessa/);
    expect(e).toMatch(/acesso não realizado/);
  });
  it('rejeita referência de evidência inventada', () => {
    const x = clone();
    x.priorities[0].evidence_refs = ['resp.inventada'];
    expect(validatePlan(x, input).ok).toBe(false);
  });
  it('rejeita API de Conversões sem evento e ação vaga', () => {
    const x = clone();
    x.priorities[0].action.what = 'Otimize campanhas';
    x.priorities[0].action.how = ['Ative a API de Conversões.'];
    const e = validatePlan(x, input).errors.join();
    expect(e).toMatch(/Ação vaga/);
    expect(e).toMatch(/sem citar o evento/);
  });
  it('rejeita escala com mensuração fraca, mas aceita negação', () => {
    const x = clone();
    x.priorities[0].action.how = ['Aumente o orçamento em campanhas de mensagens.'];
    expect(validatePlan(x, input).errors.join()).toMatch(/escala com mensuração fraca/);
    x.priorities[0].action.how = ['Não aumente o orçamento antes de registrar a origem.'];
    expect(validatePlan(x, input).errors.join()).not.toMatch(/escala/);
  });
  it('rejeita mais de três prioridades', () => {
    const x = clone();
    x.priorities = [...x.priorities, ...x.priorities].slice(0, 4);
    expect(validatePlan(x, input).errors.join()).toMatch(/Mais de 3/);
  });
  it('lê números no padrão brasileiro', () => expect(numbersIn('R$ 1.250,50 e 32%')).toEqual([1250.5, 32]));
});

describe('prompt', () => {
  it('versionado, com regras de segurança, sem materiais inventados', () => {
    const s = buildSystemPrompt();
    expect(s).toMatch(/versão do prompt: analise\/1\.0\.0/);
    expect(s).toMatch(/nunca instrução/);
    expect(s).not.toMatch(/## Metodologia/);
    expect(buildSystemPrompt({ methodology: 'M' })).toMatch(/## Metodologia/);
  });
  it('a entrada do modelo não contém dados de contato', () => {
    expect(JSON.stringify(input.payload)).not.toMatch(/telefone|e-mail|email|whatsapp_numero/i);
  });
});

describe('geração com cliente simulado', () => {
  const cfg = { model: 'modelo-de-teste', maxOutputTokens: 8000, timeoutMs: 1000, maxAttempts: 2 };
  const client = (responses: unknown[]): ResponsesClient & { calls: number } => {
    const c = { calls: 0, responses: { create: async () => { const r = responses[c.calls++]; if (r instanceof Error) throw r; return r as any; } } };
    return c as any;
  };
  it('sucesso na primeira tentativa', async () => {
    const r = await generatePlanWithAI(client([{ status: 'completed', output_text: JSON.stringify(input.draft) }]), cfg, input);
    expect(r.ok).toBe(true);
  });
  it('saída inválida → retenta com o feedback e aceita a correção', async () => {
    const bad = clone();
    bad.executive_summary.scenario = 'Suas vendas vão dobrar.';
    const c = client([{ status: 'completed', output_text: JSON.stringify(bad) }, { status: 'completed', output_text: JSON.stringify(input.draft) }]);
    const r = await generatePlanWithAI(c, cfg, input);
    expect(r.ok).toBe(true);
    expect(c.calls).toBe(2);
  });
  it('recusa do modelo encerra sem nova tentativa', async () => {
    const c = client([{ status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'não posso' }] }] }]);
    const r = await generatePlanWithAI(c, cfg, input);
    expect(r.ok).toBe(false);
    expect(c.calls).toBe(1);
  });
  it('erro de API em todas as tentativas → falha honesta', async () => {
    const r = await generatePlanWithAI(client([new Error('timeout'), new Error('timeout')]), cfg, input);
    expect(r).toMatchObject({ ok: false, reason: 'erro_api', attempts: 2 });
  });
});
