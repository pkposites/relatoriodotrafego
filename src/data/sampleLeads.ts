import type { LeadRecord } from '../types';

/**
 * Registros FICTÍCIOS para demonstração do painel. Empresas inventadas,
 * marcadas como EXEMPLO em toda a interface. Não representam clientes reais.
 */
export const SAMPLE_LEADS: LeadRecord[] = [
  {
    id: 'ex-1',
    source: 'exemplo',
    createdAt: '2026-10-20T14:10:00.000Z',
    company: 'Clínica Exemplo Sorriso',
    answers: { q1: 'servicos_locais', q2: '3k_10k', q3: 'freelancer', q4: 'nao_fecha', q5: 'so_leads', q6: 'atendimento', q7: 'meta', q8: 'whats_sem_processo', q9: 'so_whats', q10: 'mensal', q11: 'estimativa', q12: 'vender_mais' },
    metrics: { investment: 4500, leads: 180, sales: 12, avgTicket: 900 },
    plan: 'especialista',
    status: 'Em análise',
  },
  {
    id: 'ex-2',
    source: 'exemplo',
    createdAt: '2026-10-19T10:30:00.000Z',
    company: 'Loja Exemplo Casa & Decor',
    answers: { q1: 'comercio', q2: 'acima_10k', q3: 'agencia', q4: 'custo_alto', q5: 'confiavel', q6: 'vale_a_pena', q7: 'ambas', q8: 'pagina_medida', q9: 'crm', q10: 'semanal', q11: 'sem_margem', q12: 'reduzir_custo' },
    metrics: { investment: 18000, sales: 410, avgTicket: 160 },
    plan: 'consultoria',
    status: 'Contato agendado',
  },
  {
    id: 'ex-3',
    source: 'exemplo',
    createdAt: '2026-10-18T19:05:00.000Z',
    company: 'Studio Exemplo Pilates',
    answers: { q1: 'servicos_locais', q2: 'ate_1k', q3: 'eu', q4: 'poucos_leads', q5: 'nao_identifica', q6: 'nao_sabe', q7: 'meta', q8: 'nao_sabe', q9: 'nenhum', q10: 'sem_rotina', q11: 'nao_sabe', q12: 'mais_contatos' },
    status: 'Novo',
  },
  {
    id: 'ex-4',
    source: 'exemplo',
    createdAt: '2026-10-17T08:45:00.000Z',
    company: 'Exemplo Contabilidade B2B',
    answers: { q1: 'b2b', q2: '1k_3k', q3: 'funcionario', q4: 'inconsistente', q5: 'estimativa', q6: 'relatorios', q7: 'google', q8: 'pagina_sem_medir', q9: 'planilha', q10: 'quando_piora', q11: 'estimativa', q12: 'organizar_metricas' },
    metrics: { investment: 2200, leads: 40 },
    plan: 'express',
    status: 'Novo',
  },
  {
    id: 'ex-5',
    source: 'exemplo',
    createdAt: '2026-10-15T16:20:00.000Z',
    company: 'Escola Exemplo Idiomas',
    answers: { q1: 'educacao', q2: '3k_10k', q3: 'ninguem', q4: 'nao_sabe', q5: 'so_leads', q6: 'vale_a_pena', q7: 'ambas', q8: 'whats_organizado', q9: 'planilha', q10: 'nao_sabe', q11: 'nao_sabe', q12: 'avaliar_gestao' },
    plan: 'consultoria',
    status: 'Proposta enviada',
  },
  {
    id: 'ex-6',
    source: 'exemplo',
    createdAt: '2026-10-12T12:00:00.000Z',
    company: 'Exemplo Moda Online',
    answers: { q1: 'comercio', q2: 'nao_informar', q3: 'freelancer', q4: 'inconsistente', q5: 'estimativa', q6: 'criativos', q7: 'meta', q8: 'pagina_medida', q9: 'so_whats', q10: 'quando_piora', q11: 'sem_margem', q12: 'vender_mais' },
    metrics: { investment: 6000, sales: 95, avgTicket: 140 },
    status: 'Sem fit no momento',
  },
];
