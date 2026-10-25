/**
 * Modelos práticos selecionados conforme os achados. Linhas de exemplo são
 * marcadas como exemplo e não criam condições comerciais inexistentes.
 */
export interface Template {
  id: string;
  title: string;
  purpose: string;
  columns?: string[];
  exampleRows?: string[][];
  steps?: string[];
  notes?: string[];
}

export const TEMPLATES: Record<string, Template> = {
  registro_origem: {
    id: 'registro_origem',
    title: 'Registro de origem das vendas',
    purpose: 'Saber quantas vendas vieram de cada anúncio ou canal.',
    columns: ['Data', 'Cliente (iniciais)', 'Como chegou', 'Campanha/anúncio, se souber', 'Valor', 'Observação'],
    exampleRows: [
      ['EXEMPLO 03/11', 'A.S.', 'Anúncio Instagram', 'Campanha de mensagens', 'R$ 850', 'Viu o vídeo de antes e depois'],
      ['EXEMPLO 04/11', 'M.R.', 'Indicação', '—', 'R$ 600', ''],
    ],
    notes: [
      'Pergunte “como você nos conheceu?” em toda venda e anote na hora.',
      'Use iniciais: o registro não precisa de dados pessoais completos.',
      'Some no fim da semana: vendas por origem e valor por origem.',
    ],
  },
  controle_contatos: {
    id: 'controle_contatos',
    title: 'Controle de contatos',
    purpose: 'Não perder contatos e ver em que etapa as vendas se perdem.',
    columns: ['Data', 'Origem', 'Etapa', 'Próximo passo', 'Data do próximo passo', 'Resultado'],
    exampleRows: [['EXEMPLO 03/11', 'Anúncio', 'Em conversa', 'Enviar orçamento', '04/11', '—']],
    notes: [
      'Etapas sugeridas: novo → em conversa → proposta → fechado / perdido.',
      'No WhatsApp Business, as mesmas etapas podem ser etiquetas.',
      'Anote o motivo de cada “perdido”: é a base para melhorar a oferta.',
    ],
  },
  roteiro_atendimento: {
    id: 'roteiro_atendimento',
    title: 'Roteiro de atendimento',
    purpose: 'Responder rápido e de forma consistente, mesmo com pouca equipe.',
    steps: [
      'Primeira resposta: cumprimente, confirme o interesse e faça uma pergunta simples sobre a necessidade.',
      'Entenda a situação com 2 ou 3 perguntas antes de falar de preço.',
      'Apresente a solução ligando ao que a pessoa contou.',
      'Responda a objeção mais comum com um argumento que já funcionou com outros clientes.',
      'Combine um próximo passo com data (orçamento, visita, pagamento).',
    ],
    notes: ['Deixe as mensagens das etapas 1 e 2 salvas como respostas rápidas.', 'Adapte o texto ao seu tom; não prometa condições que a empresa não oferece.'],
  },
  follow_up: {
    id: 'follow_up',
    title: 'Sequência de follow-up',
    purpose: 'Retomar quem demonstrou interesse e não comprou.',
    columns: ['Quando', 'Objetivo da mensagem'],
    exampleRows: [
      ['Dia 1', 'Retomar a conversa e tirar dúvidas pendentes'],
      ['Dia 3', 'Trazer uma informação útil (caso semelhante, explicação do processo)'],
      ['Dia 7', 'Perguntar se ainda faz sentido e encerrar com educação se não fizer'],
    ],
    notes: ['Registre a resposta de cada etapa no controle de contatos.', 'Pare a sequência se a pessoa pedir.'],
  },
  briefing_teste: {
    id: 'briefing_teste',
    title: 'Briefing de teste de anúncio',
    purpose: 'Testar uma ideia por vez e registrar o aprendizado.',
    columns: ['Campo', 'Preencher'],
    exampleRows: [
      ['Hipótese', 'EXEMPLO: mostrar o resultado final atrai contatos mais qualificados que mostrar o processo'],
      ['O que muda', 'Só a abertura do anúncio (primeiros segundos ou título)'],
      ['O que fica igual', 'Público, orçamento, oferta e destino'],
      ['Duração mínima', 'Até juntar resultados suficientes para comparar, sem mexer no meio'],
      ['Como decidir', 'Custo por contato qualificado ou por venda, não só por clique'],
      ['Resultado e aprendizado', ''],
    ],
  },
  checklist_gestor: {
    id: 'checklist_gestor',
    title: 'Checklist para conversar com o gestor ou agência',
    purpose: 'Avaliar o trabalho com base em números simples, sem precisar de conhecimento técnico.',
    steps: [
      'Qual é o objetivo de cada campanha e qual evento ela otimiza?',
      'Quanto foi investido no período e quantos contatos e vendas vieram dos anúncios?',
      'Como a origem das vendas é confirmada?',
      'O que foi testado no último mês e o que se aprendeu?',
      'O que será mudado no próximo período e por quê?',
    ],
    notes: ['Peça as respostas por escrito e guarde para comparar mês a mês.'],
  },
  rotina_semanal: {
    id: 'rotina_semanal',
    title: 'Rotina semanal de indicadores (30 minutos)',
    purpose: 'Acompanhar os números que importam sem depender de relatórios longos.',
    columns: ['Indicador', 'Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
    exampleRows: [
      ['Investimento em mídia', '', '', '', ''],
      ['Contatos', '', '', '', ''],
      ['Vendas com origem nos anúncios', '', '', '', ''],
      ['Custo de mídia por venda', '', '', '', ''],
      ['Decisão tomada', '', '', '', ''],
    ],
  },
  levantamento_margem: {
    id: 'levantamento_margem',
    title: 'Levantamento de margem por venda',
    purpose: 'Saber quanto sobra de cada venda para definir quanto pode custar um cliente.',
    columns: ['Item', 'Valor por venda'],
    exampleRows: [
      ['Preço médio de venda', 'R$'],
      ['(−) Custo do produto ou serviço', 'R$'],
      ['(−) Impostos sobre a venda', 'R$'],
      ['(−) Taxas (cartão, plataforma) e comissões', 'R$'],
      ['(=) Margem de contribuição', 'R$'],
    ],
    notes: ['Margem de contribuição ÷ preço = margem %. 1 ÷ margem % = retorno mínimo da mídia para empatar (ROAS de equilíbrio), sem contar custos fixos.'],
  },
};
