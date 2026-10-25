import { is, list } from './questionnaire';
import type { Answers, Field, MetricKey } from './types';

/**
 * Fase B — aprofundamento após a compra (docs/questionario.md).
 * Tudo é opcional: a pessoa pode gerar com o que já informou. Lacunas viram
 * tarefas de levantamento no plano, nunca bloqueio.
 * Os campos usam o prefixo "b_" para não colidir com a fase A.
 */

export interface Block {
  id: string;
  title: string;
  intro: string;
  fields: Field[];
  visible?: (a: Answers) => boolean;
}

const NS = { id: 'nao_sei', label: 'Não sei', unknown: true };
const YESNO = [
  { id: 'sim', label: 'Sim' },
  { id: 'nao', label: 'Não' },
  NS,
];

const text = (id: string, label: string, placeholder: string, maxLength = 200, visible?: Field['visible']): Field => ({ id, kind: 'text', label, placeholder, maxLength, optional: true, visible });
const consultive = (a: Answers) => is(a, 'caminho_venda', 'formulario', 'ligacao_visita') || is(a, 'tipo_negocio', 'servicos_b2b', 'alto_valor');
const single = (id: string, label: string, options: Field['options'], visible?: Field['visible']): Field => ({ id, kind: 'single', label, options, optional: true, visible });
const multi = (id: string, label: string, options: Field['options'], visible?: Field['visible']): Field => ({ id, kind: 'multi', label, options, optional: true, visible });

export const BLOCKS: Block[] = [
  {
    id: 'b_negocio',
    title: 'Negócio e oferta',
    intro: 'Frases curtas bastam. Pule o que não souber.',
    fields: [
      text('b_produto_prioritario', 'Produto ou serviço que quer priorizar', 'Ex.: instalação de energia solar residencial', 120),
      text('b_publico', 'Para quem quer vender', 'Ex.: proprietários de casa em Campinas e região', 160),
      text('b_problema', 'Que problema ele resolve', 'Ex.: conta de luz alta', 160),
      text('b_beneficio', 'Principal benefício para o cliente', 'Ex.: economia na conta a partir do primeiro mês', 160),
      text('b_oferta_atual', 'Oferta usada hoje nos anúncios', 'Ex.: simulação gratuita da economia', 160),
      text('b_diferencial', 'Diferencial percebido pelos clientes', 'Ex.: instalação em 15 dias', 160),
      text('b_objecao', 'Objeção mais comum', 'Ex.: “está caro”, “vou pensar”', 160),
      single('b_capacidade', 'Capacidade de atender novos clientes', [
        { id: 'folgada', label: 'Folgada' },
        { id: 'alguma', label: 'Alguma folga' },
        { id: 'limitada', label: 'Limitada' },
        NS,
      ]),
      single('b_ciclo', 'Tempo médio até o cliente decidir', [
        { id: 'mesmo_dia', label: 'No mesmo dia' },
        { id: 'dias', label: 'Alguns dias' },
        { id: 'semanas', label: 'Semanas' },
        { id: 'meses', label: 'Meses' },
        NS,
      ]),
      single('b_recompra', 'O cliente costuma comprar de novo?', [
        { id: 'frequente', label: 'Sim, com frequência' },
        { id: 'as_vezes', label: 'Às vezes' },
        { id: 'nao', label: 'Raramente ou nunca' },
        NS,
      ]),
      text('b_tentativas', 'O que já tentou e o que aconteceu', 'Ex.: trocamos para campanha de mensagens em março e o custo caiu, mas as vendas não', 300),
    ],
  },
  {
    id: 'b_numeros',
    title: 'Números do período',
    intro: 'Escolha um período e informe o que souber. Marque “estimado” quando for aproximado e “não sei” quando não tiver o número — ausência nunca vira zero.',
    fields: [], // renderizado por componente próprio (MetricsBlock)
  },
  {
    id: 'b_caminho',
    title: 'Caminho de conversão',
    intro: 'Só as perguntas do seu caminho de venda.',
    fields: [
      // WhatsApp / Direct / outro
      single('b_responsavel_atendimento', 'Quem responde os contatos', [
        { id: 'dono', label: 'Eu mesmo(a)' },
        { id: 'equipe', label: 'Alguém da equipe' },
        { id: 'terceiro', label: 'Empresa ou pessoa terceirizada' },
        { id: 'ninguem', label: 'Não há responsável definido' },
      ], (a) => is(a, 'caminho_venda', 'whatsapp_direct', 'outro')),
      single('b_fora_horario', 'Contatos fora do horário', [
        { id: 'responde', label: 'Alguém responde' },
        { id: 'automatica', label: 'Mensagem automática e retorno no dia seguinte' },
        { id: 'nao_responde', label: 'Ficam sem resposta até alguém ver' },
        NS,
      ], (a) => is(a, 'caminho_venda', 'whatsapp_direct', 'outro')),
      single('b_roteiro', 'Existe roteiro de atendimento?', YESNO, (a) => is(a, 'caminho_venda', 'whatsapp_direct', 'outro', 'formulario', 'ligacao_visita')),
      single('b_registro_origem', 'Cada contato é registrado com a origem (anúncio, indicação…)?', [
        { id: 'sim', label: 'Sim' },
        { id: 'parcial', label: 'Às vezes' },
        { id: 'nao', label: 'Não' },
      ], (a) => !is(a, 'caminho_venda', 'site')),
      single('b_follow_up', 'Follow-up de quem não comprou', [
        { id: 'estruturado', label: 'Sim, com datas definidas' },
        { id: 'eventual', label: 'Às vezes' },
        { id: 'nao', label: 'Não fazemos' },
      ], (a) => !is(a, 'caminho_venda', 'site')),
      single('b_onde_perde', 'Onde mais perde contatos', [
        { id: 'primeira_resposta', label: 'Antes ou logo após a primeira resposta' },
        { id: 'preco', label: 'Quando fala de preço' },
        { id: 'proposta', label: 'Depois da proposta ou orçamento' },
        { id: 'agendamento', label: 'Entre o agendamento e o comparecimento' },
        NS,
      ], (a) => !is(a, 'caminho_venda', 'site')),
      text('b_objecoes_atendimento', 'Objeções frequentes no atendimento', 'Ex.: pedem desconto; querem pensar', 200, (a) => !is(a, 'caminho_venda', 'site')),
      // Site / e-commerce
      text('b_plataforma_loja', 'Plataforma da loja', 'Ex.: Nuvemshop, Shopify, WooCommerce', 60, (a) => is(a, 'caminho_venda', 'site')),
      single('b_frete', 'Frete', [
        { id: 'gratis', label: 'Grátis ou embutido' },
        { id: 'competitivo', label: 'Pago, em valor competitivo' },
        { id: 'caro', label: 'Pago, e clientes reclamam' },
        NS,
      ], (a) => is(a, 'caminho_venda', 'site')),
      multi('b_pagamentos', 'Meios de pagamento', [
        { id: 'pix', label: 'Pix' },
        { id: 'cartao', label: 'Cartão' },
        { id: 'parcelado', label: 'Parcelamento' },
        { id: 'boleto', label: 'Boleto' },
      ], (a) => is(a, 'caminho_venda', 'site')),
      text('b_abandonos', 'Principais abandonos que você conhece', 'Ex.: muitos param na tela do frete', 200, (a) => is(a, 'caminho_venda', 'site')),
      // Agendamento
      single('b_reagendamento', 'Política de reagendamento e faltas', [
        { id: 'clara', label: 'Clara e comunicada' },
        { id: 'informal', label: 'Informal' },
        { id: 'nao_tem', label: 'Não temos' },
      ], (a) => is(a, 'caminho_venda', 'agendamento')),
      single('b_agenda_capacidade', 'Agenda hoje', [
        { id: 'sobra', label: 'Sobram horários' },
        { id: 'equilibrada', label: 'Equilibrada' },
        { id: 'lotada', label: 'Lotada' },
      ], (a) => is(a, 'caminho_venda', 'agendamento')),
      // B2B / consultiva
      text('b_criterios_qualificacao', 'Critérios para um contato ser qualificado', 'Ex.: empresa com 10+ funcionários; orçamento acima de R$ 5 mil', 200, consultive),
      text('b_motivos_perda', 'Principais motivos de perda', 'Ex.: preço; escolheram concorrente; sem urgência', 200, consultive),
      text('b_responsaveis_etapas', 'Quem cuida de cada etapa', 'Ex.: SDR qualifica, eu faço a reunião e a proposta', 200, consultive),
      // Google Pesquisa
      single('b_termos_pesquisa', 'Termos de pesquisa (o que as pessoas digitaram)', [
        { id: 'semanal', label: 'Revisados toda semana' },
        { id: 'eventual', label: 'Revisados de vez em quando' },
        { id: 'nunca', label: 'Nunca revisados' },
        NS,
      ], (a) => list(a, 'plataformas').includes('google_pesquisa')),
      single('b_negativas', 'Lista de palavras negativas', YESNO, (a) => list(a, 'plataformas').includes('google_pesquisa')),
      single('b_marca_separada', 'Buscas pela sua marca em campanha separada', YESNO, (a) => list(a, 'plataformas').includes('google_pesquisa')),
      single('b_area_geografica', 'Área geográfica das campanhas de Pesquisa', [
        { id: 'definida', label: 'Definida para a região atendida' },
        { id: 'ampla', label: 'Mais ampla que a região atendida' },
        NS,
      ], (a) => list(a, 'plataformas').includes('google_pesquisa')),
    ],
  },
  {
    id: 'b_campanhas',
    title: 'Campanhas, anúncios e medição',
    intro: 'Só o necessário para sustentar as recomendações. “Não sei” é válido.',
    visible: (a) => !is(a, 'campanhas_status', 'nunca'),
    fields: [
      single('b_objetivo_campanha', 'Objetivo principal das campanhas', [
        { id: 'vendas', label: 'Vendas / compras' },
        { id: 'leads', label: 'Cadastros (leads)' },
        { id: 'mensagens', label: 'Mensagens' },
        { id: 'trafego', label: 'Tráfego / cliques' },
        { id: 'alcance', label: 'Alcance, engajamento ou visualizações' },
        NS,
      ]),
      text('b_evento_conversao', 'Evento de conversão usado, se souber', 'Ex.: Purchase, Lead, conversa iniciada', 80),
      single('b_qtd_campanhas', 'Quantas campanhas ativas', [
        { id: '1_2', label: '1 ou 2' },
        { id: '3_5', label: '3 a 5' },
        { id: '6_mais', label: '6 ou mais' },
        NS,
      ]),
      single('b_distribuicao', 'Como o orçamento é distribuído', [
        { id: 'concentrada', label: 'Concentrado no que dá mais resultado' },
        { id: 'igual', label: 'Dividido por igual' },
        NS,
      ]),
      multi('b_tipos_anuncio', 'Tipos de anúncio usados', [
        { id: 'video', label: 'Vídeo' },
        { id: 'imagem', label: 'Imagem' },
        { id: 'carrossel', label: 'Carrossel' },
        { id: 'texto_pesquisa', label: 'Anúncio de texto (Pesquisa)' },
        { id: 'catalogo', label: 'Catálogo de produtos' },
        { id: 'nao_sei', label: 'Não sei', unknown: true, exclusive: true },
      ]),
      text('b_abordagens_testadas', 'Abordagens e ofertas já testadas', 'Ex.: antes e depois; desconto à vista', 200),
      multi('b_material', 'Material disponível para novos anúncios', [
        { id: 'fotos', label: 'Fotos próprias' },
        { id: 'videos', label: 'Vídeos próprios' },
        { id: 'depoimentos', label: 'Depoimentos autorizados de clientes' },
        { id: 'nada', label: 'Nada pronto', exclusive: true },
      ]),
      multi('b_rastreamento', 'Medição configurada', [
        { id: 'pixel', label: 'Pixel / tag das plataformas' },
        { id: 'api_conversoes', label: 'API de Conversões / conversões aprimoradas' },
        { id: 'eventos', label: 'Eventos de conversão definidos' },
        { id: 'utm', label: 'UTMs nos links' },
        { id: 'crm', label: 'CRM integrado às plataformas' },
        { id: 'nao_sei', label: 'Não sei', unknown: true, exclusive: true },
      ]),
      text('b_mudancas_recentes', 'Mudança recente importante e quando', 'Ex.: troca de agência em agosto/2026', 160),
    ],
  },
  {
    id: 'b_execucao',
    title: 'Execução',
    intro: 'O plano respeita estas respostas.',
    fields: [
      single('b_executor', 'Quem vai executar o plano', [
        { id: 'dono', label: 'Eu mesmo(a)' },
        { id: 'funcionario', label: 'Alguém da equipe' },
        { id: 'gestor', label: 'Gestor de tráfego' },
        { id: 'agencia', label: 'Agência' },
      ]),
      single('b_tempo_semanal', 'Tempo por semana para executar', [
        { id: 'menos_1h', label: 'Menos de 1 hora' },
        { id: '1_3h', label: '1 a 3 horas' },
        { id: '3_6h', label: '3 a 6 horas' },
        { id: 'mais_6h', label: 'Mais de 6 horas' },
      ]),
      single('b_orcamento_adicional', 'Verba adicional disponível agora', [
        { id: 'zero', label: 'Nenhuma' },
        { id: 'ate_500', label: 'Até R$ 500' },
        { id: '500_2k', label: 'R$ 500 a R$ 2.000' },
        { id: 'acima_2k', label: 'Acima de R$ 2.000' },
      ]),
      multi('b_acessos', 'Acessos e ferramentas disponíveis', [
        { id: 'gerenciador', label: 'Gerenciador de anúncios' },
        { id: 'site', label: 'Administração do site' },
        { id: 'crm', label: 'CRM' },
        { id: 'whatsapp_business', label: 'WhatsApp Business' },
        { id: 'planilhas', label: 'Planilhas (Google ou Excel)' },
        { id: 'nenhum', label: 'Nenhum destes', exclusive: true },
      ]),
      text('b_nao_pode_mudar', 'O que não dá para mudar agora', 'Ex.: o site; o preço; a equipe de atendimento', 200),
      single('b_nivel', 'Como prefere as orientações', [
        { id: 'iniciante', label: 'Passo a passo, linguagem simples' },
        { id: 'tecnico', label: 'Mais técnico e direto' },
      ]),
    ],
  },
];

export const METRIC_FIELDS: { key: MetricKey; show?: (a: Answers) => boolean }[] = [
  { key: 'investimento' },
  { key: 'contatos', show: (a) => !is(a, 'caminho_venda', 'site') },
  { key: 'contatos_qualificados', show: (a) => is(a, 'caminho_venda', 'formulario', 'ligacao_visita', 'whatsapp_direct') },
  { key: 'agendamentos', show: (a) => is(a, 'caminho_venda', 'agendamento') },
  { key: 'comparecimentos', show: (a) => is(a, 'caminho_venda', 'agendamento') },
  { key: 'propostas', show: (a) => is(a, 'caminho_venda', 'formulario', 'ligacao_visita') || is(a, 'tipo_negocio', 'servicos_b2b', 'alto_valor') },
  { key: 'vendas' },
  { key: 'receita' },
  { key: 'ticket_medio' },
  { key: 'margem_percentual' },
  { key: 'estornos', show: (a) => is(a, 'caminho_venda', 'site') || is(a, 'tipo_negocio', 'educacao') },
];

export const visibleBlocks = (a: Answers) => BLOCKS.filter((b) => (b.visible ? b.visible(a) : true));

/** Campos essenciais para um plano útil; se faltarem, o plano inclui tarefa de levantamento. */
export function essentialGaps(a: Answers, hasMetrics: boolean): string[] {
  const gaps: string[] = [];
  if (!a.b_executor && !a.gestor) gaps.push('Quem vai executar o plano');
  if (!a.b_tempo_semanal) gaps.push('Tempo disponível por semana');
  if (!hasMetrics && !is(a, 'campanhas_status', 'nunca')) gaps.push('Números do período (investimento e vendas)');
  return gaps;
}
