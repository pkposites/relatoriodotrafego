import type { Diagnostic } from '../domain/diagnostic';
import { buildPlan } from '../domain/plan';
import { advertises, is, list, looksLikeInstruction, neverAdvertised, searchOnly } from '../domain/questionnaire';
import type { Answers } from '../domain/types';
import type { PlanOutput } from './outputSchema';

/**
 * Monta a entrada enviada ao modelo. Regras:
 * - dados de contato (nome, telefone, e-mail) NUNCA entram — o diagnóstico não os contém;
 * - texto livre do cliente vai isolado e marcado como não confiável;
 * - cálculos vão prontos (o modelo não recalcula).
 */

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
export function sanitizeFreeText(s: string, max = 600): string {
  return s.replace(CONTROL, ' ').replace(/\s{3,}/g, '  ').trim().slice(0, max);
}

const FREE_TEXT_FIELDS = (a: Answers) => Object.keys(a).filter((k) => typeof a[k] === 'string' && (k === 'produto' || k === 'link' || k.startsWith('b_')) && String(a[k]).length > 0 && !/^[a-z0-9_]+$/.test(String(a[k])));

export interface ModelInput {
  payload: Record<string, unknown>;
  draft: PlanOutput;
  flags: { weakMeasurement: boolean; searchOnly: boolean; noExtraBudget: boolean; linksAnalyzed: boolean };
  allowedRefIds: string[];
}

export function buildModelInput(d: Diagnostic, a: Answers): ModelInput {
  const draft = buildPlan(d, a);
  const free = FREE_TEXT_FIELDS(a);
  const structured = d.record.answers.filter((e) => !free.includes(e.field)).filter((e) => e.status !== 'not_applicable');
  const untrusted = Object.fromEntries(free.map((k) => [k, looksLikeInstruction(String(a[k])) ? '[texto desconsiderado: continha instruções, endereços ou código]' : sanitizeFreeText(String(a[k]))]));
  const r = d.record;
  const payload = {
    versoes: {
      contrato: r.contract_version,
      questionario: r.questionnaire_version,
      aprofundamento: r.deepening_version,
      pontuacao: r.scoring_version,
      metodologia: r.methodology_version,
      prompt: r.prompt_version,
      relatorio: r.report_version,
    },
    perfil: r.business_profile,
    caminho_de_conversao: r.conversion_path,
    respostas: structured.map((e) => ({ campo: e.field, situacao: e.status, valor: e.value, rotulo: e.label })),
    conteudo_do_cliente_nao_confiavel: untrusted,
    metricas: r.metrics,
    calculos: r.calculated_metrics,
    contradicoes: r.contradictions,
    restricoes: r.constraints,
    lacunas: r.missing_fields,
    avaliacao: r.assessment,
    evidencias_externas: r.evidence,
    rascunho_deterministico: draft,
    nivel_de_linguagem: is(a, 'b_nivel', 'tecnico') ? 'tecnico' : 'iniciante',
  };
  return {
    payload,
    draft,
    flags: {
      weakMeasurement: neverAdvertised(a) || !advertises(a) || !is(a, 'vendas_origem', 'registrada') || is(a, 'acompanhamento_compras', 'so_compras', 'nao_acompanha', 'nao_sei'),
      searchOnly: searchOnly(a),
      noExtraBudget: list(a, 'restricoes').includes('verba') || is(a, 'b_orcamento_adicional', 'zero'),
      linksAnalyzed: r.evidence.links.some((l) => l.status === 'analisado'),
    },
    allowedRefIds: draft.evidence_references.map((e) => e.id),
  };
}
