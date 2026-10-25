import type { PillarId, Question, Stage } from '../types';

/**
 * Pilares do índice indicativo de maturidade. Pesos estratégicos somam 100.
 * O índice é derivado apenas das respostas — não é auditoria técnica.
 */
export const PILLARS: Record<PillarId, { name: string; weight: number; short: string }> = {
  mensuracao: { name: 'Mensuração', weight: 25, short: 'Saber de onde vêm as vendas' },
  rentabilidade: { name: 'Eficiência e rentabilidade', weight: 25, short: 'Custo por cliente versus margem' },
  estrategia: { name: 'Estratégia de campanha', weight: 20, short: 'Destino do clique e coerência do processo' },
  criativos: { name: 'Criativos e testes', weight: 15, short: 'Rotina de testes e aprendizado' },
  conversao: { name: 'Conversão e atendimento', weight: 15, short: 'Como o contato vira venda' },
};

export const PILLAR_ORDER: PillarId[] = ['mensuracao', 'rentabilidade', 'estrategia', 'criativos', 'conversao'];

export const STAGES: Stage[] = [
  { id: 1, name: 'Perfil da operação', intro: 'Primeiro, vamos entender o contexto da sua operação.' },
  { id: 2, name: 'Dores e resultados', intro: 'Agora vamos olhar para os resultados que você percebe hoje.' },
  { id: 3, name: 'Estrutura de marketing', intro: 'Agora vamos entender como os contatos viram vendas.' },
  { id: 4, name: 'Otimização e prioridades', intro: 'Para terminar, vamos falar de testes, custos e prioridades.' },
];

export const QUESTIONS: Question[] = [
  // ETAPA 1 — PERFIL DA OPERAÇÃO
  {
    id: 'q1',
    stage: 1,
    role: 'contexto',
    title: 'Qual é o segmento principal da sua empresa?',
    subtitle: 'Isso ajuda a contextualizar as recomendações.',
    options: [
      { id: 'servicos_locais', label: 'Serviços locais (clínica, estética, academia etc.)' },
      { id: 'comercio', label: 'Comércio ou e-commerce' },
      { id: 'b2b', label: 'Serviços profissionais / B2B' },
      { id: 'educacao', label: 'Educação / infoprodutos' },
      { id: 'outro', label: 'Outro' },
    ],
  },
  {
    id: 'q2',
    stage: 1,
    role: 'qualificacao',
    title: 'Quanto sua empresa investe por mês em anúncios?',
    subtitle: 'Uma faixa aproximada é suficiente. Não afeta sua nota.',
    options: [
      { id: 'ate_1k', label: 'Até R$ 1.000' },
      { id: '1k_3k', label: 'R$ 1.001 a R$ 3.000' },
      { id: '3k_10k', label: 'R$ 3.001 a R$ 10.000' },
      { id: 'acima_10k', label: 'Acima de R$ 10.000' },
      { id: 'nao_informar', label: 'Prefiro não informar' },
    ],
  },
  {
    id: 'q3',
    stage: 1,
    role: 'contexto',
    title: 'Quem cuida das campanhas hoje?',
    subtitle: 'Não há resposta certa — cada formato tem seus desafios.',
    options: [
      { id: 'eu', label: 'Eu mesmo(a)' },
      { id: 'funcionario', label: 'Um funcionário da empresa' },
      { id: 'freelancer', label: 'Um gestor de tráfego / freelancer' },
      { id: 'agencia', label: 'Uma agência' },
      { id: 'ninguem', label: 'Não há responsável definido' },
    ],
  },

  // ETAPA 2 — PRINCIPAIS DORES E RESULTADOS
  {
    id: 'q4',
    stage: 2,
    role: 'dor',
    title: 'Qual é o principal problema que você enfrenta com os anúncios?',
    subtitle: 'Escolha o que mais pesa hoje.',
    options: [
      { id: 'poucos_leads', label: 'Recebo poucos contatos / leads' },
      {
        id: 'nao_fecha',
        label: 'Recebo contatos, mas quase não fecho vendas',
        note: 'Vamos observar também o atendimento: nem todo gargalo começa no anúncio.',
      },
      { id: 'custo_alto', label: 'O custo dos resultados está muito alto' },
      { id: 'inconsistente', label: 'Resultados inconsistentes, variam demais' },
      { id: 'nao_sabe', label: 'Não consigo saber o que está funcionando' },
    ],
  },
  {
    id: 'q5',
    stage: 2,
    role: 'diagnostico',
    title: 'Você sabe quantas vendas vieram dos anúncios no último mês?',
    subtitle: 'Pense nas vendas, não apenas nos cliques ou mensagens.',
    options: [
      {
        id: 'confiavel',
        label: 'Sim, acompanho com números confiáveis',
        scores: { mensuracao: { value: 100, weight: 1 }, estrategia: { value: 90, weight: 0.4 } },
      },
      {
        id: 'estimativa',
        label: 'Tenho uma estimativa aproximada',
        scores: { mensuracao: { value: 55, weight: 1 }, estrategia: { value: 60, weight: 0.4 } },
      },
      {
        id: 'so_leads',
        label: 'Acompanho leads, mas não vendas',
        scores: { mensuracao: { value: 35, weight: 1 }, estrategia: { value: 45, weight: 0.4 } },
      },
      {
        id: 'nao_identifica',
        label: 'Não consigo identificar',
        scores: { mensuracao: { value: 5, weight: 1 }, estrategia: { value: 25, weight: 0.4 } },
      },
    ],
  },
  {
    id: 'q6',
    stage: 2,
    role: 'dor',
    title: 'O que mais incomoda na operação atual?',
    subtitle: 'Sua resposta orienta as prioridades do relatório.',
    options: [
      { id: 'vale_a_pena', label: 'Não consigo avaliar se o investimento vale a pena' },
      { id: 'relatorios', label: 'Falta de clareza nos relatórios e métricas' },
      { id: 'criativos', label: 'Criativos/anúncios parecem não funcionar' },
      { id: 'atendimento', label: 'Atendimento não converte os contatos' },
      { id: 'nao_sabe', label: 'Não sei exatamente o que deve melhorar' },
    ],
  },

  // ETAPA 3 — ESTRUTURA DE MARKETING
  {
    id: 'q7',
    stage: 3,
    role: 'contexto',
    title: 'Onde você anuncia atualmente?',
    subtitle: 'Considere onde vai a maior parte do investimento.',
    options: [
      { id: 'meta', label: 'Principalmente Instagram / Facebook' },
      { id: 'google', label: 'Principalmente Google Ads' },
      { id: 'ambas', label: 'Nas duas plataformas' },
      { id: 'outras', label: 'Em outras plataformas / combinação diferente' },
    ],
  },
  {
    id: 'q8',
    stage: 3,
    role: 'diagnostico',
    title: 'Para onde vai a maioria das pessoas que clicam nos anúncios?',
    subtitle: 'O destino do clique influencia o que dá para medir e converter.',
    options: [
      {
        id: 'pagina_medida',
        label: 'Página própria com conversão medida',
        scores: {
          estrategia: { value: 95, weight: 1 },
          mensuracao: { value: 90, weight: 0.5 },
          conversao: { value: 75, weight: 0.5 },
        },
      },
      {
        id: 'pagina_sem_medir',
        label: 'Site ou landing page, sem saber se mede conversões',
        scores: {
          estrategia: { value: 55, weight: 1 },
          mensuracao: { value: 30, weight: 0.5 },
          conversao: { value: 55, weight: 0.5 },
        },
      },
      {
        id: 'whats_organizado',
        label: 'WhatsApp ou direct com atendimento organizado',
        scores: {
          estrategia: { value: 80, weight: 1 },
          mensuracao: { value: 55, weight: 0.5 },
          conversao: { value: 85, weight: 0.5 },
        },
      },
      {
        id: 'whats_sem_processo',
        label: 'WhatsApp ou direct sem processo definido',
        scores: {
          estrategia: { value: 40, weight: 1 },
          mensuracao: { value: 25, weight: 0.5 },
          conversao: { value: 25, weight: 0.5 },
        },
      },
      {
        id: 'nao_sabe',
        label: 'Não sei dizer',
        uncertain: true,
        scores: {
          estrategia: { value: 20, weight: 0.5 },
          mensuracao: { value: 10, weight: 0.5 },
          conversao: { value: 30, weight: 0.25 },
        },
      },
    ],
  },
  {
    id: 'q9',
    stage: 3,
    role: 'diagnostico',
    title: 'Como você acompanha os contatos até a venda?',
    subtitle: 'Do primeiro contato até o fechamento.',
    options: [
      {
        id: 'crm',
        label: 'CRM ou sistema com etapas e status',
        scores: { conversao: { value: 100, weight: 1 }, estrategia: { value: 90, weight: 0.3 } },
      },
      {
        id: 'planilha',
        label: 'Planilha ou registro atualizado manualmente',
        scores: { conversao: { value: 70, weight: 1 }, estrategia: { value: 70, weight: 0.3 } },
      },
      {
        id: 'so_whats',
        label: 'Apenas pelo WhatsApp/direct, sem organização formal',
        scores: { conversao: { value: 35, weight: 1 }, estrategia: { value: 40, weight: 0.3 } },
      },
      {
        id: 'nenhum',
        label: 'Não tenho acompanhamento estruturado',
        scores: { conversao: { value: 10, weight: 1 }, estrategia: { value: 25, weight: 0.3 } },
      },
    ],
  },

  // ETAPA 4 — OTIMIZAÇÃO E PRIORIDADES
  {
    id: 'q10',
    stage: 4,
    role: 'diagnostico',
    title: 'Com que frequência vocês testam novos criativos ou abordagens?',
    subtitle: 'Imagens, vídeos, textos, ofertas ou públicos.',
    options: [
      {
        id: 'semanal',
        label: 'Toda semana, com aprendizado registrado',
        scores: { criativos: { value: 100, weight: 1 } },
      },
      { id: 'mensal', label: 'Aproximadamente uma vez por mês', scores: { criativos: { value: 65, weight: 1 } } },
      {
        id: 'quando_piora',
        label: 'Somente quando os resultados pioram',
        scores: { criativos: { value: 30, weight: 1 } },
      },
      { id: 'sem_rotina', label: 'Não temos rotina de testes', scores: { criativos: { value: 10, weight: 1 } } },
      {
        id: 'nao_sabe',
        label: 'Não sei informar',
        uncertain: true,
        scores: { criativos: { value: 25, weight: 0.4 } },
      },
    ],
  },
  {
    id: 'q11',
    stage: 4,
    role: 'diagnostico',
    title: 'Você sabe seu custo por cliente adquirido e se ele cabe na margem?',
    subtitle: 'Custo por cliente = investimento ÷ clientes conquistados.',
    options: [
      { id: 'ambos', label: 'Sim, acompanho ambos', scores: { rentabilidade: { value: 100, weight: 1 } } },
      {
        id: 'sem_margem',
        label: 'Sei o custo por cliente, mas não comparo à margem',
        scores: { rentabilidade: { value: 60, weight: 1 } },
      },
      { id: 'estimativa', label: 'Tenho só uma estimativa', scores: { rentabilidade: { value: 35, weight: 1 } } },
      { id: 'nao_sabe', label: 'Não sei calcular', scores: { rentabilidade: { value: 5, weight: 1 } } },
    ],
  },
  {
    id: 'q12',
    stage: 4,
    role: 'objetivo',
    title: 'Qual resultado você mais gostaria de melhorar nos próximos 30 dias?',
    subtitle: 'Vamos priorizar o primeiro passo com base nisso.',
    options: [
      { id: 'mais_contatos', label: 'Aumentar a quantidade de contatos qualificados' },
      { id: 'vender_mais', label: 'Vender mais com o investimento atual' },
      { id: 'reduzir_custo', label: 'Diminuir o custo de aquisição' },
      { id: 'organizar_metricas', label: 'Organizar as métricas para tomar decisões' },
      { id: 'avaliar_gestao', label: 'Entender se a estratégia/gestão atual é adequada' },
    ],
  },
];

export const TOTAL_QUESTIONS = QUESTIONS.length;

export function getQuestion(id: string): Question | undefined {
  return QUESTIONS.find((q) => q.id === id);
}

export function getOptionLabel(questionId: string, optionId: string | undefined): string | undefined {
  if (!optionId) return undefined;
  return getQuestion(questionId)?.options.find((o) => o.id === optionId)?.label;
}
