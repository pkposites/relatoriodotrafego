import { PILLARS, QUESTIONS, STAGES, getOptionLabel } from '../data/questions';
import type { Answers, FreeContext, OptionalMetricsInput } from '../types';
import { buildReport } from './report';

/**
 * Pacote estruturado com tudo o que a IA precisa para gerar o relatório
 * completo. Nada é enviado nesta fase — o objeto apenas fica pronto para a
 * futura integração (função no servidor, com a chave fora do navegador).
 */
export function buildAiContext(answers: Answers, metrics?: OptionalMetricsInput, context?: FreeContext) {
  const r = buildReport(answers, metrics);
  const round2 = (n?: number) => (n === undefined ? null : Math.round(n * 100) / 100);

  return {
    versao: 'rdt-ai-context/1',
    perfil: r.profile,
    respostas: STAGES.map((s) => ({
      etapa: s.name,
      itens: QUESTIONS.filter((q) => q.stage === s.id).map((q) => ({
        id: q.id,
        pergunta: q.title,
        resposta: getOptionLabel(q.id, answers[q.id]) ?? null,
      })),
    })),
    numeros_30_dias: {
      informados: metrics ?? null,
      cpl: round2(r.metrics.cpl),
      cpa: round2(r.metrics.cpa),
      conversao_lead_venda: round2(r.metrics.leadToSale),
      receita_estimada: round2(r.metrics.revenue),
      roas_estimado: round2(r.metrics.roas),
      avisos: r.metrics.warnings,
    },
    economia_da_unidade: {
      margem_estimada: round2(r.economics.marginRate),
      lucro_bruto_por_venda: round2(r.economics.grossProfitPerSale),
      roas_de_equilibrio: round2(r.economics.breakevenRoas),
      status: r.economics.status ?? null,
    },
    indice: {
      geral: r.score.overall,
      faixa: r.score.band.label,
      confianca: r.score.confidenceLevel,
      pilares: r.score.pillars.map((p) => ({
        pilar: PILLARS[p.id].name,
        nota: p.score,
        peso: p.weight,
        evidencia: p.evidenceLevel,
      })),
      ajustes: r.score.adjustments.map((a) => ({
        tipo: a.kind === 'cap' ? 'teto' : 'piso',
        escopo: a.scope === 'geral' ? 'índice geral' : PILLARS[a.scope].name,
        de: a.before,
        para: a.limit,
        motivo: a.reason,
      })),
    },
    prioridades: r.gaps.map((g) => ({
      pilar: PILLARS[g.pillar].name,
      titulo: g.title,
      fato_declarado: g.declared,
      hipotese: g.hypothesis,
      acao_sugerida: g.action,
    })),
    alertas: r.alerts.map((a) => ({ gravidade: a.severity, titulo: a.title, texto: a.text })),
    ponto_forte: r.strength,
    dica_do_segmento: r.segmentTip,
    contexto_livre: {
      produto_e_publico: context?.produto?.trim() || null,
      observacoes: context?.observacoes?.trim() || null,
    },
    instrucoes_para_ia: [
      'Use apenas os dados acima; não invente métricas, benchmarks ou resultados.',
      'Separe fato declarado, hipótese e ação recomendada.',
      'Não prometa aumento garantido de vendas, ROAS ou lucro.',
      'Linguagem simples, em português do Brasil, voltada ao dono do negócio.',
      'Plano de ação de 7 dias, um passo por dia, começando pela prioridade 1.',
    ],
  };
}

export type AiContext = ReturnType<typeof buildAiContext>;
