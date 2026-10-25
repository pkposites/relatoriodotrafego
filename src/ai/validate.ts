import type { ModelInput } from './modelInput';
import { PLAN_JSON_SCHEMA, type PlanOutput } from './outputSchema';

/**
 * Validação em duas camadas:
 * 1. Estrutura (subconjunto de JSON Schema usado no esquema estrito).
 * 2. Qualidade: números sem origem, referências inexistentes, promessas,
 *    alegação de acesso, escala sem mensuração, ações vagas, canal e restrições.
 * O mesmo validador roda sobre o plano determinístico (testes) e sobre a saída da IA.
 */

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/* ------------------------------ estrutura ------------------------------ */

type Schema = { type?: string | string[]; enum?: string[]; properties?: Record<string, Schema>; required?: string[]; additionalProperties?: boolean; items?: Schema };

function typeOk(t: string, v: unknown): boolean {
  if (t === 'null') return v === null;
  if (t === 'array') return Array.isArray(v);
  if (t === 'object') return typeof v === 'object' && v !== null && !Array.isArray(v);
  if (t === 'integer') return Number.isInteger(v);
  if (t === 'number') return typeof v === 'number' && Number.isFinite(v);
  return typeof v === t;
}

export function validateStructure(v: unknown, s: Schema = PLAN_JSON_SCHEMA as Schema, path = '$'): string[] {
  const errs: string[] = [];
  const types = s.type ? (Array.isArray(s.type) ? s.type : [s.type]) : [];
  if (types.length && !types.some((t) => typeOk(t, v))) return [`${path}: tipo inválido`];
  if (s.enum && !s.enum.includes(v as string)) errs.push(`${path}: valor fora da lista`);
  if (s.properties && typeOk('object', v)) {
    const o = v as Record<string, unknown>;
    for (const k of s.required ?? []) if (!(k in o)) errs.push(`${path}.${k}: ausente`);
    if (s.additionalProperties === false) for (const k of Object.keys(o)) if (!s.properties[k]) errs.push(`${path}.${k}: campo não permitido`);
    for (const [k, sub] of Object.entries(s.properties)) if (k in o) errs.push(...validateStructure(o[k], sub, `${path}.${k}`));
  }
  if (s.items && Array.isArray(v)) v.forEach((x, i) => errs.push(...validateStructure(x, s.items!, `${path}[${i}]`)));
  return errs;
}

/* ------------------------------ números ------------------------------ */

const NUM_RE = /\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?/g;
export function numbersIn(text: string): number[] {
  return (text.match(NUM_RE) ?? []).map((t) => {
    let n = t;
    if (n.includes(',')) n = n.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(n)) n = n.replace(/\./g, '');
    return Number(n);
  });
}

function allowedNumbers(source: unknown): number[] {
  const set = new Set<number>();
  const add = (n: number) => {
    if (!Number.isFinite(n)) return;
    for (const x of [n, n * 100, n / 100]) {
      set.add(Math.round(x * 100) / 100);
      set.add(Math.round(x * 10) / 10);
      set.add(Math.round(x));
    }
  };
  const walk = (v: unknown) => {
    if (typeof v === 'number') add(v);
    else if (typeof v === 'string') numbersIn(v).forEach(add);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(source);
  return [...set];
}

function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out));
  return out;
}

/* ------------------------------ qualidade ------------------------------ */

const PROMISES = /(garantimos|garantido|garantida|garante\s+(que|o|a|resultado|vendas|retorno)|dobr(ar|ará|ando)\s+(suas\s+|as\s+|o\s+)?(vendas|faturamento|resultado)|tripl\w*|multiplic\w*\s+(suas\s+)?vendas|vai\s+aumentar\s+(suas\s+)?vendas|vão\s+dobrar)/gi;
const ACCESS = /\b(acessei|analisei\s+(a|sua)\s+conta|analisei\s+(o|seu)\s+(site|pixel|perfil)|analisei\s+(a|sua)\s+página|verifiquei\s+(o|seu)\s+(pixel|site|gerenciador)|vi\s+(seus|os)\s+criativos|olhei\s+(sua|a)\s+conta)\b/i;
const VAGUE_ONLY = /^\s*(otimiz\w+\s+(as\s+)?campanhas|melhor\w+\s+(os\s+)?criativos|acompanh\w+\s+(as\s+)?métricas)\.?\s*$/i;
const SCALE = /(aument\w*|eleve|elevar|dobr\w*|escal\w*)\s+(o\s+|a\s+|seu\s+|sua\s+)?(orçamento|investimento|verba|campanhas?)/gi;
/** Ocorrência afirmativa: ignora trechos negados ("não aumentar", "antes de aumentar", "sem aumentar", "evite"). */
function affirmative(re: RegExp, text: string): boolean {
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const before = text.slice(Math.max(0, m.index - 22), m.index).toLowerCase();
    if (!/(não|nao|antes de|sem|evite|evitar|nunca|nem)\s*$/.test(before.trimEnd() + ' ') && !/(não|antes de|sem|evite|evitar|nunca)\s+\S*\s*$/.test(before)) return true;
  }
  return false;
}
const VISUAL = /\b(reels|stories|vídeo vertical|vídeos verticais|criativos visuais|carrossel|ugc)\b/i;

export function validatePlan(plan: unknown, input: ModelInput): ValidationResult {
  const errors = validateStructure(plan);
  const warnings: string[] = [];
  if (errors.length) return { ok: false, errors, warnings };
  const p = plan as PlanOutput;

  if (p.priorities.length > 3) errors.push('Mais de 3 prioridades.');
  if (p.avoid_now.length > 3) errors.push('Mais de 3 itens em "o que evitar".');
  if (input.draft.priorities.length > 0 && p.priorities.length === 0) errors.push('Nenhuma prioridade, embora haja achados com evidência.');
  if (!p.action_plan.length) errors.push('Plano de sete dias vazio.');

  // Referências
  const allowed = new Set(input.allowedRefIds);
  const declared = new Set(p.evidence_references.map((e) => e.id));
  for (const e of p.evidence_references) if (!allowed.has(e.id)) errors.push(`Referência de evidência desconhecida: ${e.id}`);
  for (const pr of p.priorities) {
    for (const id of pr.evidence_refs) if (!declared.has(id) || !allowed.has(id)) errors.push(`Prioridade "${pr.title}" cita referência inexistente: ${id}`);
    if (!pr.evidence_refs.length && pr.kind !== 'investigacao') errors.push(`Prioridade "${pr.title}" sem evidência.`);
    const a = pr.action;
    for (const [k, v] of Object.entries({ what: a.what, why: a.why, owner: a.owner, done_criteria: a.done_criteria, indicator: a.indicator, review_when: a.review_when }))
      if (!v.trim()) errors.push(`Prioridade "${pr.title}": campo ${k} vazio.`);
    if (!a.how.length) errors.push(`Prioridade "${pr.title}": sem passos de execução.`);
    if (VAGUE_ONLY.test(a.what)) errors.push(`Ação vaga: "${a.what}".`);
    const actionText = [a.what, ...a.how].join(' ');
    if (/api de conversões/i.test(actionText) && !/evento/i.test(actionText)) errors.push(`Prioridade "${pr.title}" recomenda API de Conversões sem citar o evento.`);
    if (input.flags.weakMeasurement && affirmative(SCALE, actionText)) errors.push(`Prioridade "${pr.title}" sugere escala com mensuração fraca.`);
    if (input.flags.noExtraBudget && affirmative(SCALE, actionText)) errors.push(`Prioridade "${pr.title}" pede verba adicional, mas não há verba disponível.`);
    if (input.flags.searchOnly && VISUAL.test(actionText)) errors.push(`Prioridade "${pr.title}" sugere formato visual em operação só de Pesquisa.`);
  }
  const ids = new Set(p.priorities.map((x) => x.id));
  if (p.quick_win.priority_id && !ids.has(p.quick_win.priority_id)) errors.push('Ação rápida aponta para prioridade inexistente.');
  for (const t of p.action_plan) if (t.priority_id && !ids.has(t.priority_id)) errors.push(`Tarefa "${t.day}" aponta para prioridade inexistente.`);

  // Texto: promessas, acesso, números sem origem
  const texts = strings({ ...p, evidence_references: [] });
  const okNumbers = allowedNumbers({ payload: input.payload, draft: input.draft });
  for (const t of texts) {
    if (affirmative(PROMISES, t)) errors.push(`Promessa de resultado: "${t.slice(0, 80)}"`);
    if (!input.flags.linksAnalyzed && ACCESS.test(t)) errors.push(`Alega acesso não realizado: "${t.slice(0, 80)}"`);
    for (const n of numbersIn(t)) {
      if (Number.isInteger(n) && n <= 31) continue; // dias, passos, contagens pequenas
      const known = okNumbers.some((k) => Math.abs(k - n) <= Math.max(0.011, Math.abs(k) * 0.005));
      if (!known) errors.push(`Número sem origem nos dados: ${n} em "${t.slice(0, 80)}"`);
    }
  }

  if (input.payload.contradicoes && (input.payload.contradicoes as unknown[]).length && !p.limitations.some((l) => /revis/i.test(l)))
    warnings.push('Há contradições nos dados, mas as limitações não pedem revisão.');
  return { ok: errors.length === 0, errors: [...new Set(errors)], warnings };
}
