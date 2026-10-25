import { TEMPLATES } from '../domain/templates';

/**
 * Esquema da saída do plano pago (ver docs/esquema-saida-ia.md).
 * Compatível com Structured Outputs em modo estrito: todo objeto tem
 * additionalProperties=false e todas as propriedades em `required`;
 * campos opcionais são representados por null.
 */

export type MapStatus = 'medido' | 'estimado' | 'desconhecido' | 'nao_se_aplica';
export type PriorityKind = 'estrutural' | 'rapida' | 'investigacao';
export type Effort = 'baixo' | 'medio' | 'alto';

export interface PlanAction {
  what: string;
  why: string;
  how: string[];
  owner: string;
  effort: Effort;
  effort_estimate: string;
  dependencies: string[];
  done_criteria: string;
  indicator: string;
  review_when: string;
}

export interface PlanPriority {
  id: string;
  title: string;
  kind: PriorityKind;
  fact: string;
  hypothesis: string;
  possible_consequence: string;
  how_to_confirm: string;
  evidence_refs: string[];
  action: PlanAction;
}

export interface PlanOutput {
  executive_summary: {
    scenario: string;
    main_hypothesis: string;
    structural_priority: string;
    quick_win: string;
    main_limitation: string;
  };
  evidence_coverage: { operational: 'boa' | 'parcial' | 'limitada'; financial: string; statement: string };
  limitations: string[];
  conversion_map: { stage: string; status: MapStatus; note: string }[];
  indicators: { evidence_ref: string; label: string; value: string; formula: string; caveat: string | null }[];
  pillar_assessments: { pillar: string; score: number | null; evidence_refs: string[]; interpretation: string; to_confirm: string }[];
  priorities: PlanPriority[];
  quick_win: { priority_id: string | null; rationale: string };
  action_plan: { day: string; task: string; owner: string; minutes: number; priority_id: string | null }[];
  selected_templates: { template_id: string; reason: string }[];
  avoid_now: { decision: string; why: string }[];
  measurement_plan: {
    review_in_days: number;
    metrics: { name: string; how: string }[];
    continue_if: string;
    adjust_if: string;
    execution_vs_results_note: string;
  };
  assumptions: string[];
  evidence_references: { id: string; kind: string; label: string; value: string }[];
}

/* ------------------------------ JSON Schema ------------------------------ */

const S = { type: 'string' } as const;
const SN = { type: ['string', 'null'] } as const;
const ARR = (items: object) => ({ type: 'array', items });
const OBJ = (properties: Record<string, object>) => ({
  type: 'object',
  additionalProperties: false,
  properties,
  required: Object.keys(properties),
});

const ACTION = OBJ({
  what: S,
  why: S,
  how: ARR(S),
  owner: S,
  effort: { type: 'string', enum: ['baixo', 'medio', 'alto'] },
  effort_estimate: S,
  dependencies: ARR(S),
  done_criteria: S,
  indicator: S,
  review_when: S,
});

export const PLAN_JSON_SCHEMA = OBJ({
  executive_summary: OBJ({ scenario: S, main_hypothesis: S, structural_priority: S, quick_win: S, main_limitation: S }),
  evidence_coverage: OBJ({ operational: { type: 'string', enum: ['boa', 'parcial', 'limitada'] }, financial: S, statement: S }),
  limitations: ARR(S),
  conversion_map: ARR(OBJ({ stage: S, status: { type: 'string', enum: ['medido', 'estimado', 'desconhecido', 'nao_se_aplica'] }, note: S })),
  indicators: ARR(OBJ({ evidence_ref: S, label: S, value: S, formula: S, caveat: SN })),
  pillar_assessments: ARR(OBJ({ pillar: S, score: { type: ['integer', 'null'] }, evidence_refs: ARR(S), interpretation: S, to_confirm: S })),
  // Limites de quantidade (máx. 3 prioridades, 3 itens em "evitar") são verificados no validador,
  // pois palavras-chave como maxItems podem não ser aceitas no modo estrito.
  priorities: {
    type: 'array',
    items: OBJ({
      id: S,
      title: S,
      kind: { type: 'string', enum: ['estrutural', 'rapida', 'investigacao'] },
      fact: S,
      hypothesis: S,
      possible_consequence: S,
      how_to_confirm: S,
      evidence_refs: ARR(S),
      action: ACTION,
    }),
  },
  quick_win: OBJ({ priority_id: SN, rationale: S }),
  action_plan: ARR(OBJ({ day: S, task: S, owner: S, minutes: { type: 'integer' }, priority_id: SN })),
  selected_templates: ARR(OBJ({ template_id: { type: 'string', enum: Object.keys(TEMPLATES) }, reason: S })),
  avoid_now: ARR(OBJ({ decision: S, why: S })),
  measurement_plan: OBJ({
    review_in_days: { type: 'integer' },
    metrics: ARR(OBJ({ name: S, how: S })),
    continue_if: S,
    adjust_if: S,
    execution_vs_results_note: S,
  }),
  assumptions: ARR(S),
  evidence_references: ARR(OBJ({ id: S, kind: S, label: S, value: S })),
});

export const PLAN_SCHEMA_NAME = 'plano_de_acao_do_trafego';
