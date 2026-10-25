import type { AnswerValue, Answers, PillarId, Question, QuestionId, Stage } from '../types';

/**
 * Pilares do índice indicativo de maturidade (pesos somam 100), alinhados ao
 * tráfego pago atual: qualidade do sinal (pixel + API de Conversões), criativo
 * como principal alavanca de segmentação, otimização para o evento certo,
 * velocidade de atendimento e custo por cliente comparado à margem.
 * O índice deriva apenas das respostas — não é auditoria técnica.
 */
export const PILLARS: Record<PillarId, { name: string; weight: number; short: string }> = {
  mensuracao: { name: 'Mensuração e sinal', weight: 25, short: 'Saber de onde vêm as vendas e alimentar o algoritmo' },
  rentabilidade: { name: 'Eficiência e rentabilidade', weight: 25, short: 'Custo por cliente versus margem' },
  estrategia: { name: 'Estratégia de campanha', weight: 20, short: 'Objetivo, estrutura e rotina de otimização' },
  criativos: { name: 'Criativos e oferta', weight: 15, short: 'Volume, variedade, testes e oferta' },
  conversao: { name: 'Conversão e atendimento', weight: 15, short: 'Como o contato vira venda' },
};

export const PILLAR_ORDER: PillarId[] = ['mensuracao', 'rentabilidade', 'estrategia', 'criativos', 'conversao'];

export const STAGES: Stage[] = [
  { id: 1, name: 'Seu negócio', intro: 'Primeiro, vamos entender o seu negócio.' },
  { id: 2, name: 'Investimento e objetivos', intro: 'Agora, como você investe e o que espera dos anúncios.' },
  { id: 3, name: 'Mensuração e sinal', intro: 'Vamos ver o quanto você (e as plataformas) sabem sobre os resultados.' },
  { id: 4, name: 'Campanhas e criativos', intro: 'Agora, como as campanhas e os anúncios são construídos.' },
  { id: 5, name: 'Conversão e atendimento', intro: 'Por fim, como os contatos viram vendas.' },
];

export const QUESTIONS: Question[] = [
  // ETAPA 1 — SEU NEGÓCIO
  {
    id: 'segmento',
    stage: 1,
    role: 'contexto',
    title: 'Qual é o segmento principal da sua empresa?',
    subtitle: 'As recomendações mudam bastante de um segmento para outro.',
    options: [
      { id: 'servicos_locais', label: 'Serviços locais (saúde, estética, academia, beleza etc.)' },
      { id: 'ecommerce', label: 'Varejo ou e-commerce' },
      { id: 'b2b', label: 'Serviços profissionais / B2B' },
      { id: 'educacao', label: 'Educação, cursos ou infoprodutos' },
      { id: 'alto_valor', label: 'Imóveis, veículos ou outros bens de alto valor' },
      { id: 'outro', label: 'Outro' },
    ],
  },
  {
    id: 'ticket',
    stage: 1,
    role: 'contexto',
    title: 'Qual é o valor médio de uma venda?',
    subtitle: 'Ticket médio aproximado. Ajuda a calibrar quanto pode custar um cliente.',
    options: [
      { id: 'ate_100', label: 'Até R$ 100' },
      { id: '100_500', label: 'R$ 101 a R$ 500' },
      { id: '500_2k', label: 'R$ 501 a R$ 2.000' },
      { id: '2k_10k', label: 'R$ 2.001 a R$ 10.000' },
      { id: 'acima_10k', label: 'Acima de R$ 10.000' },
      { id: 'nao_sabe', label: 'Varia muito / não sei' },
    ],
  },
  {
    id: 'margem',
    stage: 1,
    role: 'diagnostico',
    title: 'Qual é a sua margem aproximada em cada venda?',
    subtitle: 'O que sobra depois do custo do produto ou serviço, antes dos anúncios.',
    options: [
      { id: 'ate_20', label: 'Até 20%', scores: { rentabilidade: { value: 80, weight: 0.4 } } },
      { id: '20_40', label: 'De 21% a 40%', scores: { rentabilidade: { value: 80, weight: 0.4 } } },
      { id: '40_60', label: 'De 41% a 60%', scores: { rentabilidade: { value: 80, weight: 0.4 } } },
      { id: 'acima_60', label: 'Acima de 60%', scores: { rentabilidade: { value: 80, weight: 0.4 } } },
      { id: 'nao_sabe', label: 'Não sei', uncertain: true, scores: { rentabilidade: { value: 10, weight: 0.4 } } },
    ],
  },
  {
    id: 'ciclo',
    stage: 1,
    role: 'contexto',
    title: 'Quanto tempo o cliente leva para decidir a compra?',
    subtitle: 'Do primeiro contato até fechar.',
    options: [
      { id: 'mesmo_dia', label: 'Compra no mesmo dia (impulso ou urgência)' },
      { id: 'dias', label: 'Alguns dias' },
      { id: 'semanas', label: 'Algumas semanas' },
      { id: 'meses', label: 'Meses (venda consultiva ou de alto valor)' },
    ],
  },

  // ETAPA 2 — INVESTIMENTO E OBJETIVOS
  {
    id: 'orcamento',
    stage: 2,
    role: 'qualificacao',
    title: 'Quanto sua empresa investe por mês em anúncios?',
    subtitle: 'Uma faixa aproximada é suficiente. Não afeta sua nota.',
    options: [
      { id: 'ate_1k', label: 'Até R$ 1.000' },
      { id: '1k_3k', label: 'R$ 1.001 a R$ 3.000' },
      { id: '3k_10k', label: 'R$ 3.001 a R$ 10.000' },
      { id: '10k_30k', label: 'R$ 10.001 a R$ 30.000' },
      { id: 'acima_30k', label: 'Acima de R$ 30.000' },
      { id: 'nao_informar', label: 'Prefiro não informar' },
    ],
  },
  {
    id: 'gestor',
    stage: 2,
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
  {
    id: 'plataformas',
    stage: 2,
    role: 'contexto',
    title: 'Onde você anuncia atualmente?',
    subtitle: 'Considere onde vai a maior parte do investimento.',
    options: [
      { id: 'meta', label: 'Principalmente Instagram / Facebook' },
      { id: 'google', label: 'Principalmente Google (Pesquisa, YouTube, Performance Max)' },
      { id: 'meta_google', label: 'Meta e Google' },
      { id: 'outras', label: 'Inclui TikTok ou outras plataformas' },
    ],
  },
  {
    id: 'tempo_anuncio',
    stage: 2,
    role: 'contexto',
    title: 'Há quanto tempo a empresa anuncia de forma contínua?',
    subtitle: 'Sem contar testes pontuais.',
    options: [
      { id: 'menos_3m', label: 'Menos de 3 meses' },
      { id: '3_12m', label: 'De 3 a 12 meses' },
      { id: '1_3a', label: 'De 1 a 3 anos' },
      { id: 'mais_3a', label: 'Mais de 3 anos' },
    ],
  },
  {
    id: 'dor',
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
      { id: 'leads_ruins', label: 'Os contatos chegam desqualificados' },
      { id: 'custo_alto', label: 'O custo dos resultados está muito alto' },
      { id: 'inconsistente', label: 'Resultados inconsistentes, variam demais' },
      { id: 'nao_sabe', label: 'Não consigo saber o que está funcionando' },
    ],
  },
  {
    id: 'objetivo',
    stage: 2,
    role: 'objetivo',
    title: 'Qual resultado você mais quer melhorar nos próximos 30 dias?',
    subtitle: 'Vamos priorizar o primeiro passo com base nisso.',
    options: [
      { id: 'mais_contatos', label: 'Aumentar a quantidade de contatos qualificados' },
      { id: 'vender_mais', label: 'Vender mais com o investimento atual' },
      { id: 'reduzir_custo', label: 'Diminuir o custo por cliente' },
      { id: 'escalar', label: 'Investir mais sem perder resultado' },
      { id: 'organizar_metricas', label: 'Organizar as métricas para tomar decisões' },
      { id: 'avaliar_gestao', label: 'Entender se a estratégia/gestão atual é adequada' },
    ],
  },

  // ETAPA 3 — MENSURAÇÃO E SINAL
  {
    id: 'vendas_origem',
    stage: 3,
    role: 'diagnostico',
    title: 'Você sabe quantas vendas vieram dos anúncios no último mês?',
    subtitle: 'Pense nas vendas, não apenas nos cliques ou mensagens.',
    options: [
      {
        id: 'confiavel',
        label: 'Sim, acompanho com números confiáveis',
        scores: { mensuracao: { value: 100, weight: 1 }, estrategia: { value: 90, weight: 0.3 } },
      },
      {
        id: 'estimativa',
        label: 'Tenho uma estimativa aproximada',
        scores: { mensuracao: { value: 55, weight: 1 }, estrategia: { value: 60, weight: 0.3 } },
      },
      {
        id: 'so_leads',
        label: 'Acompanho leads, mas não vendas',
        scores: { mensuracao: { value: 35, weight: 1 }, estrategia: { value: 45, weight: 0.3 } },
      },
      {
        id: 'nao_identifica',
        label: 'Não consigo identificar',
        scores: { mensuracao: { value: 5, weight: 1 }, estrategia: { value: 25, weight: 0.3 } },
      },
    ],
  },
  {
    id: 'rastreamento',
    stage: 3,
    role: 'diagnostico',
    multi: true,
    multiWeights: { mensuracao: 1 },
    title: 'O que já está configurado para medir os resultados?',
    subtitle: 'Marque tudo o que se aplica. Não sabe? Sem problemas — marque “Não sei”.',
    options: [
      { id: 'pixel', label: 'Pixel / tag das plataformas instalado', points: 25 },
      { id: 'capi', label: 'API de Conversões (Meta) ou conversões aprimoradas (Google)', points: 30 },
      { id: 'eventos', label: 'Eventos de conversão definidos (compra, lead, contato)', points: 20 },
      { id: 'utm', label: 'Links com UTM / origem rastreada', points: 10 },
      { id: 'crm_offline', label: 'Vendas do CRM enviadas de volta às plataformas', points: 25 },
      { id: 'nenhum', label: 'Nada disso', exclusive: true, points: 0 },
      { id: 'nao_sabe', label: 'Não sei', exclusive: true, uncertain: true, points: 10 },
    ],
  },
  {
    id: 'cac',
    stage: 3,
    role: 'diagnostico',
    title: 'Você sabe seu custo por cliente adquirido e se ele cabe na margem?',
    subtitle: 'Custo por cliente = investimento ÷ clientes conquistados.',
    options: [
      { id: 'ambos', label: 'Sim, acompanho ambos', scores: { rentabilidade: { value: 100, weight: 1 } } },
      { id: 'sem_margem', label: 'Sei o custo por cliente, mas não comparo à margem', scores: { rentabilidade: { value: 60, weight: 1 } } },
      { id: 'estimativa', label: 'Tenho só uma estimativa', scores: { rentabilidade: { value: 35, weight: 1 } } },
      { id: 'nao_sabe', label: 'Não sei calcular', scores: { rentabilidade: { value: 5, weight: 1 } } },
    ],
  },
  {
    id: 'analise',
    stage: 3,
    role: 'diagnostico',
    title: 'Com que frequência alguém analisa os números e ajusta as campanhas?',
    subtitle: 'Você mesmo, seu gestor ou sua agência.',
    options: [
      { id: 'semanal', label: 'Toda semana, com relatório ou painel', scores: { estrategia: { value: 100, weight: 0.6 } } },
      { id: 'mensal', label: 'Uma vez por mês', scores: { estrategia: { value: 60, weight: 0.6 } } },
      { id: 'quando_erra', label: 'Só quando algo dá errado', scores: { estrategia: { value: 30, weight: 0.6 } } },
      { id: 'raramente', label: 'Raramente ou nunca', scores: { estrategia: { value: 5, weight: 0.6 } } },
      { id: 'nao_sabe', label: 'Não sei dizer', uncertain: true, scores: { estrategia: { value: 20, weight: 0.3 } } },
    ],
  },

  // ETAPA 4 — CAMPANHAS, CRIATIVOS E OFERTA
  {
    id: 'otimizacao',
    stage: 4,
    role: 'diagnostico',
    title: 'Para qual resultado as campanhas são otimizadas?',
    subtitle: 'É o “objetivo” escolhido na campanha — o que o algoritmo tenta conseguir.',
    options: [
      {
        id: 'vendas',
        label: 'Vendas / compras no site',
        scores: { estrategia: { value: 95, weight: 1 }, mensuracao: { value: 90, weight: 0.3 } },
      },
      {
        id: 'leads',
        label: 'Leads / cadastros em formulário',
        scores: { estrategia: { value: 85, weight: 1 }, mensuracao: { value: 80, weight: 0.3 } },
      },
      {
        id: 'mensagens',
        label: 'Mensagens no WhatsApp ou Direct',
        scores: { estrategia: { value: 75, weight: 1 }, mensuracao: { value: 50, weight: 0.3 } },
      },
      {
        id: 'trafego_engajamento',
        label: 'Cliques, visitas, alcance ou engajamento',
        scores: { estrategia: { value: 20, weight: 1 }, mensuracao: { value: 20, weight: 0.3 } },
      },
      {
        id: 'nao_sabe',
        label: 'Não sei',
        uncertain: true,
        scores: { estrategia: { value: 15, weight: 0.5 }, mensuracao: { value: 15, weight: 0.15 } },
      },
    ],
  },
  {
    id: 'estrutura',
    stage: 4,
    role: 'diagnostico',
    title: 'Como as campanhas estão organizadas?',
    subtitle: 'Em 2026, estruturas mais simples costumam dar mais dados ao algoritmo.',
    options: [
      { id: 'consolidada', label: 'Poucas campanhas, com orçamento concentrado', scores: { estrategia: { value: 95, weight: 0.8 } } },
      { id: 'automatica', label: 'Campanhas automáticas (Advantage+ / Performance Max)', scores: { estrategia: { value: 85, weight: 0.8 } } },
      { id: 'fragmentada', label: 'Várias campanhas e públicos, com orçamento dividido', scores: { estrategia: { value: 45, weight: 0.8 } } },
      { id: 'impulsionar', label: 'Principalmente pelo botão “Impulsionar” do Instagram', scores: { estrategia: { value: 20, weight: 0.8 } } },
      { id: 'nao_sabe', label: 'Não sei', uncertain: true, scores: { estrategia: { value: 15, weight: 0.4 } } },
    ],
  },
  {
    id: 'criativos_volume',
    stage: 4,
    role: 'diagnostico',
    title: 'Quantos anúncios novos (criativos) entram por mês?',
    subtitle: 'Hoje o criativo é a principal forma de alcançar o público certo.',
    options: [
      { id: 'mais_10', label: '10 ou mais', scores: { criativos: { value: 100, weight: 1 } } },
      { id: '4_9', label: 'De 4 a 9', scores: { criativos: { value: 75, weight: 1 } } },
      { id: '1_3', label: 'De 1 a 3', scores: { criativos: { value: 40, weight: 1 } } },
      { id: 'mesmos', label: 'Usamos os mesmos há meses', scores: { criativos: { value: 10, weight: 1 } } },
      { id: 'nao_sabe', label: 'Não sei', uncertain: true, scores: { criativos: { value: 20, weight: 0.5 } } },
    ],
  },
  {
    id: 'formatos',
    stage: 4,
    role: 'diagnostico',
    multi: true,
    multiWeights: { criativos: 0.6 },
    title: 'Quais formatos de anúncio vocês usam?',
    subtitle: 'Marque todos os que rodam com frequência.',
    options: [
      { id: 'video_vertical', label: 'Vídeos verticais (Reels / Stories / Shorts)', points: 25 },
      { id: 'ugc', label: 'Vídeos com clientes ou depoimentos', points: 30 },
      { id: 'especialista', label: 'Vídeos com o dono ou especialista falando', points: 25 },
      { id: 'estatico', label: 'Imagens estáticas ou carrossel', points: 15 },
      { id: 'catalogo', label: 'Catálogo / anúncios de produtos dinâmicos', points: 15 },
      { id: 'nao_sabe', label: 'Não sei dizer', exclusive: true, uncertain: true, points: 15 },
    ],
  },
  {
    id: 'testes',
    stage: 4,
    role: 'diagnostico',
    title: 'Com que frequência vocês testam novas abordagens?',
    subtitle: 'Novos ganchos, ofertas, ângulos ou formatos.',
    options: [
      { id: 'semanal', label: 'Toda semana, registrando o que funciona', scores: { criativos: { value: 100, weight: 0.8 } } },
      { id: 'mensal', label: 'Aproximadamente uma vez por mês', scores: { criativos: { value: 65, weight: 0.8 } } },
      { id: 'quando_piora', label: 'Somente quando os resultados pioram', scores: { criativos: { value: 30, weight: 0.8 } } },
      { id: 'sem_rotina', label: 'Não temos rotina de testes', scores: { criativos: { value: 10, weight: 0.8 } } },
      { id: 'nao_sabe', label: 'Não sei informar', uncertain: true, scores: { criativos: { value: 25, weight: 0.4 } } },
    ],
  },
  {
    id: 'oferta',
    stage: 4,
    role: 'diagnostico',
    title: 'Como é a mensagem principal dos seus anúncios?',
    subtitle: 'Pense no que leva a pessoa a agir.',
    options: [
      {
        id: 'clara',
        label: 'Oferta clara, com motivo para agir agora (condição, bônus, avaliação grátis)',
        scores: { criativos: { value: 95, weight: 0.6 } },
      },
      { id: 'produto', label: 'Mostra o produto ou serviço, sem oferta específica', scores: { criativos: { value: 50, weight: 0.6 } } },
      { id: 'institucional', label: 'Mais institucional, focada na marca', scores: { criativos: { value: 25, weight: 0.6 } } },
      { id: 'nao_sabe', label: 'Não sei dizer', uncertain: true, scores: { criativos: { value: 20, weight: 0.3 } } },
    ],
  },

  // ETAPA 5 — CONVERSÃO E ATENDIMENTO
  {
    id: 'destino',
    stage: 5,
    role: 'diagnostico',
    title: 'Para onde vai a maioria das pessoas que clicam nos anúncios?',
    subtitle: 'O destino do clique influencia o que dá para medir e converter.',
    options: [
      {
        id: 'pagina_medida',
        label: 'Site ou página própria, com conversão medida',
        scores: { estrategia: { value: 95, weight: 0.6 }, mensuracao: { value: 90, weight: 0.4 }, conversao: { value: 75, weight: 0.5 } },
      },
      {
        id: 'pagina_sem_medir',
        label: 'Site ou página, sem saber se mede conversões',
        scores: { estrategia: { value: 55, weight: 0.6 }, mensuracao: { value: 30, weight: 0.4 }, conversao: { value: 55, weight: 0.5 } },
      },
      {
        id: 'formulario',
        label: 'Formulário dentro da própria plataforma',
        scores: { estrategia: { value: 75, weight: 0.6 }, mensuracao: { value: 70, weight: 0.4 }, conversao: { value: 60, weight: 0.5 } },
      },
      {
        id: 'whats_organizado',
        label: 'WhatsApp ou Direct, com atendimento organizado',
        scores: { estrategia: { value: 80, weight: 0.6 }, mensuracao: { value: 55, weight: 0.4 }, conversao: { value: 85, weight: 0.5 } },
      },
      {
        id: 'whats_sem_processo',
        label: 'WhatsApp ou Direct, sem processo definido',
        scores: { estrategia: { value: 40, weight: 0.6 }, mensuracao: { value: 25, weight: 0.4 }, conversao: { value: 25, weight: 0.5 } },
      },
      {
        id: 'nao_sabe',
        label: 'Não sei dizer',
        uncertain: true,
        scores: { estrategia: { value: 20, weight: 0.3 }, mensuracao: { value: 10, weight: 0.2 }, conversao: { value: 30, weight: 0.25 } },
      },
    ],
  },
  {
    id: 'tempo_resposta',
    stage: 5,
    role: 'diagnostico',
    title: 'Quanto tempo leva para responder um novo contato?',
    subtitle: 'Em média, em horário comercial.',
    options: [
      { id: 'ate_5min', label: 'Até 5 minutos', scores: { conversao: { value: 100, weight: 1 } } },
      { id: 'ate_1h', label: 'Até 1 hora', scores: { conversao: { value: 70, weight: 1 } } },
      { id: 'mesmo_dia', label: 'No mesmo dia', scores: { conversao: { value: 35, weight: 1 } } },
      { id: 'mais_dia', label: 'Mais de um dia, ou às vezes fica sem resposta', scores: { conversao: { value: 5, weight: 1 } } },
      { id: 'nao_se_aplica', label: 'Não se aplica — a venda é direto no site' },
    ],
  },
  {
    id: 'acompanhamento',
    stage: 5,
    role: 'diagnostico',
    title: 'Como você acompanha os contatos até a venda?',
    subtitle: 'Do primeiro contato até o fechamento, incluindo o follow-up.',
    options: [
      {
        id: 'crm',
        label: 'CRM ou sistema com etapas, status e follow-up',
        scores: { conversao: { value: 100, weight: 1 }, estrategia: { value: 90, weight: 0.2 } },
      },
      {
        id: 'planilha',
        label: 'Planilha ou registro atualizado manualmente',
        scores: { conversao: { value: 70, weight: 1 }, estrategia: { value: 70, weight: 0.2 } },
      },
      {
        id: 'so_whats',
        label: 'Apenas pelo WhatsApp/Direct, sem organização formal',
        scores: { conversao: { value: 35, weight: 1 }, estrategia: { value: 40, weight: 0.2 } },
      },
      {
        id: 'nenhum',
        label: 'Não tenho acompanhamento estruturado',
        scores: { conversao: { value: 10, weight: 1 }, estrategia: { value: 25, weight: 0.2 } },
      },
    ],
  },
];

export const TOTAL_QUESTIONS = QUESTIONS.length;

export function getQuestion(id: string): Question | undefined {
  return QUESTIONS.find((q) => q.id === id);
}

/** Normaliza uma resposta (única ou múltipla) em lista de ids válidos. */
export function answerIds(questionId: string, value: AnswerValue | undefined): string[] {
  const q = getQuestion(questionId);
  if (!q || value === undefined) return [];
  const ids = Array.isArray(value) ? value : [value];
  return ids.filter((id) => q.options.some((o) => o.id === id));
}

/** Rótulo legível da resposta; múltiplas respostas são unidas por vírgula. */
export function getOptionLabel(questionId: string, value: AnswerValue | undefined): string | undefined {
  const q = getQuestion(questionId);
  const ids = answerIds(questionId, value);
  if (!q || !ids.length) return undefined;
  return ids.map((id) => q.options.find((o) => o.id === id)!.label).join(', ');
}

/** Primeira (ou única) resposta de uma pergunta de escolha única. */
export function single(answers: Answers, id: QuestionId): string | undefined {
  const v = answers[id];
  return Array.isArray(v) ? v[0] : v;
}

export function has(answers: Answers, id: QuestionId, optionId: string): boolean {
  return answerIds(id, answers[id]).includes(optionId);
}
