import { PILLARS, getOptionLabel, has, single } from '../data/questions';
import type { Alert, AlertSeverity, Answers, Insight, OptionalMetricsInput, PillarId, PillarResult, Report, UnitEconomics } from '../types';
import { computeEconomics } from './economics';
import { formatDec } from './format';
import { computeMetrics } from './metrics';
import { computeScore } from './scoring';

/* ------------------------------------------------------------------ */
/* Contexto derivado das respostas                                     */
/* ------------------------------------------------------------------ */

interface Ctx {
  a: Answers;
  econ: UnitEconomics;
  lowBudget: boolean;
  highBudget: boolean;
  hasSignal: boolean;
  longCycle: boolean;
  messaging: boolean;
  outsourced: boolean;
}

function buildCtx(a: Answers, m?: OptionalMetricsInput): Ctx {
  const budget = single(a, 'orcamento');
  return {
    a,
    econ: computeEconomics(a, m),
    lowBudget: budget === 'ate_1k' || budget === '1k_3k',
    highBudget: budget === '10k_30k' || budget === 'acima_30k',
    hasSignal: has(a, 'rastreamento', 'pixel') || has(a, 'rastreamento', 'capi'),
    longCycle: ['semanas', 'meses'].includes(single(a, 'ciclo') ?? ''),
    messaging: single(a, 'otimizacao') === 'mensagens' || ['whats_organizado', 'whats_sem_processo'].includes(single(a, 'destino') ?? ''),
    outsourced: ['agencia', 'freelancer'].includes(single(a, 'gestor') ?? ''),
  };
}

const quote = (q: string, a: Answers) => {
  const label = getOptionLabel(q, a[q as keyof Answers]);
  return label ? `“${label}”` : undefined;
};

function declared(a: Answers, items: [string, string][]): string {
  const parts = items.map(([q, prefix]) => {
    const v = quote(q, a);
    return v ? `${prefix} ${v}` : undefined;
  });
  const list = parts.filter(Boolean);
  return list.length ? `${list.join('; ')}.` : 'Sem resposta para esta área.';
}

/* ------------------------------------------------------------------ */
/* Lacunas por pilar: primeira variante que se aplica vence            */
/* ------------------------------------------------------------------ */

interface Variant {
  when: (c: Ctx) => boolean;
  hypothesis: (c: Ctx) => string;
  action: (c: Ctx) => string;
}

const always = () => true;

const breakevenHint = (c: Ctx) =>
  c.econ.breakevenRoas
    ? ` Referência: com margem de ~${Math.round(c.econ.marginRate! * 100)}%, o retorno mínimo para empatar (ROAS de equilíbrio) é de cerca de ${formatDec(Math.round(c.econ.breakevenRoas * 10) / 10)}x.`
    : '';

const GAPS: Record<PillarId, { title: string; facts: [string, string][]; variants: Variant[] }> = {
  mensuracao: {
    title: 'Clareza sobre quais vendas vêm dos anúncios',
    facts: [
      ['vendas_origem', 'Origem das vendas:'],
      ['rastreamento', 'Rastreamento:'],
    ],
    variants: [
      {
        when: (c) => !c.hasSignal,
        hypothesis: () =>
          'Sem pixel nem API de Conversões, as plataformas não sabem quem comprou. O algoritmo tende a buscar pessoas parecidas com quem clica — não com quem compra.',
        action: () =>
          'Instale o pixel e configure a API de Conversões (ou conversões aprimoradas, no Google) com o evento que representa a venda ou o lead qualificado.',
      },
      {
        when: (c) => has(c.a, 'rastreamento', 'pixel') && !has(c.a, 'rastreamento', 'capi'),
        hypothesis: () =>
          'Só com o pixel, parte das conversões se perde (bloqueadores, iOS, navegadores). Com menos sinal, o algoritmo otimiza com menos precisão.',
        action: () =>
          'Configure a API de Conversões e confira, no Gerenciador de Eventos, a qualidade de correspondência dos eventos principais.',
      },
      {
        when: (c) => c.longCycle && !has(c.a, 'rastreamento', 'crm_offline'),
        hypothesis: () =>
          'Com uma decisão que leva semanas ou meses, sem devolver as vendas do CRM às plataformas, o algoritmo otimiza para quem preenche o formulário, não para quem compra.',
        action: () =>
          'Registre a origem de cada lead no CRM e envie as vendas fechadas de volta às plataformas como conversões offline.',
      },
      {
        when: (c) => c.messaging,
        hypothesis: () =>
          'Em campanhas de mensagens a venda acontece fora da plataforma; sem registrar quais conversas viraram venda, fica difícil saber qual anúncio realmente vende.',
        action: () =>
          'Marque cada conversa com a campanha de origem e registre quais viraram venda — mesmo que numa planilha — e revise isso toda semana.',
      },
      {
        when: (c) => single(c.a, 'vendas_origem') === 'so_leads',
        hypothesis: () => 'É provável que as decisões estejam baseadas em volume de contatos, sem saber quais campanhas geram vendas de fato.',
        action: () => 'Cruze os contatos de cada campanha com as vendas do mês e calcule quantos viraram clientes.',
      },
      {
        when: always,
        hypothesis: () => 'Sem uma ligação clara entre anúncio e venda, campanhas boas e ruins podem estar recebendo o mesmo tratamento.',
        action: () => 'Defina uma forma simples de marcar a origem de cada venda (ex.: “como nos conheceu?”) e revise esse número toda semana.',
      },
    ],
  },
  rentabilidade: {
    title: 'Custo por cliente comparado à margem',
    facts: [
      ['margem', 'Margem:'],
      ['cac', 'Custo por cliente:'],
    ],
    variants: [
      {
        when: (c) => c.econ.status === 'acima_da_margem',
        hypothesis: () =>
          'Pelos números informados, cada venda via anúncio custa mais do que o lucro bruto que ela gera. Só se paga se houver recompra ou venda adicional.',
        action: () =>
          'Antes de aumentar o orçamento, revise oferta, ticket ou funil — e estime quanto um cliente compra ao longo do tempo para saber o custo máximo aceitável.',
      },
      {
        when: (c) => single(c.a, 'margem') === 'nao_sabe',
        hypothesis: () => 'Sem saber a margem, não dá para definir quanto pode custar um cliente — nem saber se investir mais traz lucro.',
        action: () => 'Calcule a margem média por venda (preço − custos diretos) e, com ela, o ROAS de equilíbrio: 1 ÷ margem.',
      },
      {
        when: (c) => single(c.a, 'cac') === 'sem_margem',
        hypothesis: () => 'Você já conhece o custo por cliente; falta compará-lo à margem para saber se escalar é seguro.',
        action: (c) => `Compare o custo por cliente com o lucro bruto de uma venda e defina um teto de custo por cliente.${breakevenHint(c)}`,
      },
      {
        when: always,
        hypothesis: () =>
          'Sem saber quanto custa conquistar um cliente, há risco de manter campanhas cujo retorno não cobre a margem — ou de cortar as que funcionam.',
        action: (c) =>
          `Calcule o custo por cliente do último mês (investimento ÷ clientes vindos de anúncios) e compare com o lucro bruto de uma venda.${breakevenHint(c)}`,
      },
    ],
  },
  estrategia: {
    title: 'Objetivo, estrutura e rotina das campanhas',
    facts: [
      ['otimizacao', 'Otimização:'],
      ['estrutura', 'Estrutura:'],
      ['analise', 'Análise:'],
    ],
    variants: [
      {
        when: (c) => single(c.a, 'otimizacao') === 'trafego_engajamento',
        hypothesis: () => 'Campanhas otimizadas para cliques ou engajamento encontram quem clica e curte — que raramente é quem compra.',
        action: () => 'Troque o objetivo para o evento que representa resultado (vendas, leads ou mensagens) e acompanhe o custo por resultado real.',
      },
      {
        when: (c) => single(c.a, 'estrutura') === 'impulsionar',
        hypothesis: () => 'O “Impulsionar” limita objetivo, públicos e mensuração; o algoritmo trabalha com menos informação do que poderia.',
        action: () => 'Migre para o Gerenciador de Anúncios com uma campanha de objetivo vendas, leads ou mensagens, usando os mesmos criativos que já funcionam.',
      },
      {
        when: (c) => single(c.a, 'estrutura') === 'fragmentada' && c.lowBudget,
        hypothesis: () =>
          'Com orçamento de até R$ 3 mil dividido em várias campanhas, cada uma recebe poucos dados e tende a ficar presa na fase de aprendizado.',
        action: () => 'Concentre o orçamento em 1 ou 2 campanhas, com públicos amplos, e deixe os criativos fazerem a segmentação.',
      },
      {
        when: (c) => single(c.a, 'estrutura') === 'fragmentada',
        hypothesis: () => 'Muitas campanhas e públicos dividindo o orçamento reduzem o volume de dados de cada uma e dificultam a otimização.',
        action: () => 'Consolide campanhas com o mesmo objetivo e teste uma estrutura automática (Advantage+ / Performance Max) contra a atual.',
      },
      {
        when: (c) => ['raramente', 'quando_erra', 'nao_sabe'].includes(single(c.a, 'analise') ?? ''),
        hypothesis: () => 'Sem rotina de análise, problemas só aparecem quando já custaram caro.',
        action: (c) =>
          c.outsourced
            ? 'Combine com seu gestor ou agência um relatório semanal curto: investimento, custo por resultado, vendas e o que foi alterado.'
            : 'Reserve 30 minutos por semana para olhar custo por resultado, frequência e desempenho de cada criativo — e anote o que mudou.',
      },
      {
        when: (c) => single(c.a, 'otimizacao') === 'nao_sabe' || single(c.a, 'estrutura') === 'nao_sabe',
        hypothesis: () => 'Sem saber para qual resultado as campanhas otimizam, é difícil avaliar se a estratégia está alinhada ao objetivo de vendas.',
        action: () => 'Verifique (ou pergunte a quem gerencia) qual objetivo e qual evento de otimização cada campanha usa.',
      },
      {
        when: always,
        hypothesis: () => 'O caminho entre anúncio, destino e acompanhamento pode ter pontos desconectados que reduzem o aproveitamento.',
        action: () => 'Desenhe o caminho completo: anúncio → destino → primeiro contato → venda. Marque onde não há registro ou responsável.',
      },
    ],
  },
  criativos: {
    title: 'Volume, variedade e oferta dos anúncios',
    facts: [
      ['criativos_volume', 'Novos criativos/mês:'],
      ['formatos', 'Formatos:'],
      ['oferta', 'Mensagem:'],
    ],
    variants: [
      {
        when: (c) => single(c.a, 'criativos_volume') === 'mesmos',
        hypothesis: () => 'Usar os mesmos anúncios por meses costuma levar à fadiga: a frequência sobe e o custo por resultado aumenta.',
        action: () => 'Produza de 4 a 6 criativos novos por mês, variando gancho, formato e ângulo da mensagem.',
      },
      {
        when: (c) => c.highBudget && ['1_3', 'mesmos'].includes(single(c.a, 'criativos_volume') ?? ''),
        hypothesis: () => 'Com investimento acima de R$ 10 mil e poucos criativos novos, o público satura rápido e o algoritmo tem pouco para testar.',
        action: () => 'Suba para 10 ou mais criativos novos por mês, priorizando vídeos verticais com pessoas.',
      },
      {
        when: (c) =>
          !has(c.a, 'formatos', 'video_vertical') && !has(c.a, 'formatos', 'ugc') && !has(c.a, 'formatos', 'especialista') && !has(c.a, 'formatos', 'nao_sabe'),
        hypothesis: () => 'Sem vídeos verticais com pessoas, você fica de fora dos formatos que mais entregam hoje (Reels, Stories, Shorts).',
        action: () =>
          'Grave 3 vídeos curtos e verticais: você explicando a oferta, um depoimento de cliente e o produto ou serviço em uso.',
      },
      {
        when: (c) => ['produto', 'institucional'].includes(single(c.a, 'oferta') ?? ''),
        hypothesis: () => 'Sem uma oferta clara, o anúncio depende de a pessoa já estar decidida; um motivo para agir agora costuma baratear o contato.',
        action: () => 'Teste uma oferta específica (avaliação grátis, condição por tempo limitado ou bônus) contra o anúncio atual.',
      },
      {
        when: (c) => ['quando_piora', 'sem_rotina'].includes(single(c.a, 'testes') ?? ''),
        hypothesis: () => 'Testar só quando o resultado cai gera reações tardias; criativos se desgastam antes de os números mostrarem.',
        action: () => 'Reserve um teste por semana: uma nova abordagem contra o anúncio atual, anotando o que aprendeu.',
      },
      {
        when: always,
        hypothesis: () => 'Há espaço para aumentar a variedade de ângulos e ofertas — é o que dá ao algoritmo opções para achar novos compradores.',
        action: () => 'Liste as 3 principais objeções dos clientes e crie um criativo respondendo cada uma.',
      },
    ],
  },
  conversao: {
    title: 'Acompanhamento do contato até a venda',
    facts: [
      ['destino', 'Destino do clique:'],
      ['tempo_resposta', 'Tempo de resposta:'],
      ['acompanhamento', 'Acompanhamento:'],
    ],
    variants: [
      {
        when: (c) => ['mesmo_dia', 'mais_dia'].includes(single(c.a, 'tempo_resposta') ?? ''),
        hypothesis: () => 'Quanto mais demora a primeira resposta, menor a chance de venda — o contato muitas vezes já falou com o concorrente.',
        action: () => 'Defina uma meta de resposta em até 5 minutos no horário comercial, com mensagem inicial pronta e um responsável.',
      },
      {
        when: (c) => single(c.a, 'dor') === 'nao_fecha',
        hypothesis: () =>
          'Você relatou que recebe contatos mas fecha pouco; parte do gargalo pode estar no atendimento e no follow-up, não só no anúncio.',
        action: () => 'Crie um roteiro de atendimento e um follow-up de 3 toques (dias 1, 3 e 7) para quem não fechou.',
      },
      {
        when: (c) => single(c.a, 'dor') === 'leads_ruins',
        hypothesis: () =>
          'Contatos desqualificados costumam vir de oferta genérica, objetivo de otimização raso ou falta de filtro no formulário ou no atendimento.',
        action: () => 'Adicione 1 ou 2 perguntas de qualificação (orçamento, prazo) e marque no CRM quais contatos eram qualificados.',
      },
      {
        when: (c) => single(c.a, 'destino') === 'whats_sem_processo',
        hypothesis: () => 'Levar o clique ao WhatsApp pode funcionar bem; sem processo definido, parte dos contatos esfria antes da resposta.',
        action: () => 'Organize etiquetas no WhatsApp Business (novo, em conversa, proposta, fechado, perdido) e respostas rápidas para as dúvidas comuns.',
      },
      {
        when: always,
        hypothesis: () => 'Sem registro das etapas, contatos podem ficar sem retorno e fica difícil saber em que ponto as vendas se perdem.',
        action: () => 'Crie uma lista simples (planilha ou CRM gratuito) com o status de cada contato: novo, em conversa, proposta, fechado, perdido.',
      },
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Alertas: combinações de respostas que merecem atenção               */
/* ------------------------------------------------------------------ */

interface AlertRule extends Omit<Alert, 'text'> {
  when: (c: Ctx) => boolean;
  text: (c: Ctx) => string;
}

const ALERTS: AlertRule[] = [
  {
    id: 'acima_margem',
    severity: 'alta',
    title: 'Custo por venda acima da margem',
    when: (c) => c.econ.status === 'acima_da_margem',
    text: () => 'Pelos números informados, cada venda via anúncio custa mais do que o lucro bruto que gera. Escalar nessa condição tende a ampliar o prejuízo.',
  },
  {
    id: 'confia_sem_sinal',
    severity: 'alta',
    title: 'Números “confiáveis” sem rastreamento',
    when: (c) =>
      single(c.a, 'vendas_origem') === 'confiavel' &&
      !['pixel', 'capi', 'crm_offline', 'utm'].some((o) => has(c.a, 'rastreamento', o)),
    text: () =>
      'Você diz acompanhar as vendas com confiança, mas não marcou nenhuma ferramenta de rastreamento. Vale checar como esse número é obtido — e as plataformas, sem esse sinal, otimizam no escuro.',
  },
  {
    id: 'mensagens_lento',
    severity: 'alta',
    title: 'Campanha de mensagens com resposta lenta',
    when: (c) => single(c.a, 'otimizacao') === 'mensagens' && ['mesmo_dia', 'mais_dia'].includes(single(c.a, 'tempo_resposta') ?? ''),
    text: () => 'Você paga por cada conversa iniciada; quando a resposta demora horas, boa parte delas esfria antes do primeiro atendimento.',
  },
  {
    id: 'escalar_sem_teto',
    severity: 'alta',
    title: 'Escalar sem saber o custo máximo',
    when: (c) =>
      single(c.a, 'objetivo') === 'escalar' && (['nao_sabe', 'estimativa'].includes(single(c.a, 'cac') ?? '') || single(c.a, 'margem') === 'nao_sabe'),
    text: () => 'Seu objetivo é investir mais, mas sem um teto de custo por cliente definido pela margem não dá para saber até onde escalar com lucro.',
  },
  {
    id: 'ecommerce_sem_capi',
    severity: 'alta',
    title: 'E-commerce sem API de Conversões',
    when: (c) => single(c.a, 'segmento') === 'ecommerce' && !has(c.a, 'rastreamento', 'capi'),
    text: () => 'Em e-commerce, o evento de compra com valor é o que permite otimizar por receita. Sem a API de Conversões, parte relevante desse sinal se perde.',
  },
  {
    id: 'ciclo_sem_offline',
    severity: 'media',
    title: 'Venda longa sem retorno do CRM',
    when: (c) => c.longCycle && !has(c.a, 'rastreamento', 'crm_offline'),
    text: () => 'Com decisão em semanas ou meses, as plataformas só enxergam o lead. Devolver as vendas fechadas ensina o algoritmo a buscar quem compra.',
  },
  {
    id: 'orcamento_fragmentado',
    severity: 'media',
    title: 'Orçamento pequeno e dividido',
    when: (c) => c.lowBudget && single(c.a, 'estrutura') === 'fragmentada',
    text: () => 'Com orçamento enxuto, dividir em muitas campanhas deixa cada uma com poucos dados para aprender.',
  },
  {
    id: 'escala_sem_criativo',
    severity: 'media',
    title: 'Investimento alto com poucos criativos',
    when: (c) => c.highBudget && ['1_3', 'mesmos'].includes(single(c.a, 'criativos_volume') ?? ''),
    text: () => 'Quanto maior o investimento, mais rápido o público vê os mesmos anúncios. Volume de criativos precisa acompanhar o orçamento.',
  },
  {
    id: 'leads_ruins',
    severity: 'media',
    title: 'Contatos desqualificados',
    when: (c) => single(c.a, 'dor') === 'leads_ruins',
    text: (c) =>
      single(c.a, 'otimizacao') === 'mensagens' || single(c.a, 'destino') === 'formulario'
        ? 'Mensagens e formulários nativos geram volume com facilidade; sem filtro e sem devolver quais contatos eram bons, o algoritmo continua trazendo os mesmos perfis.'
        : 'A qualidade do contato depende da oferta, do objetivo de otimização e de informar às plataformas quais contatos viraram venda.',
  },
  {
    id: 'terceirizado_sem_rotina',
    severity: 'media',
    title: 'Gestão terceirizada sem rotina de acompanhamento',
    when: (c) => c.outsourced && ['raramente', 'quando_erra', 'nao_sabe'].includes(single(c.a, 'analise') ?? ''),
    text: () => 'Um alinhamento semanal com números simples (investimento, custo por resultado, vendas) ajuda você a avaliar o trabalho com clareza.',
  },
  {
    id: 'inconsistente_sem_testes',
    severity: 'media',
    title: 'Resultados instáveis sem rotina de testes',
    when: (c) => single(c.a, 'dor') === 'inconsistente' && ['quando_piora', 'sem_rotina'].includes(single(c.a, 'testes') ?? ''),
    text: () => 'Oscilação costuma vir de criativos que se desgastam sem substitutos prontos. Uma fila de testes semanal tende a estabilizar.',
  },
  {
    id: 'dono_sobrecarregado',
    severity: 'baixa',
    title: 'Tudo nas suas mãos',
    when: (c) => single(c.a, 'gestor') === 'eu' && ['1_3', 'mesmos'].includes(single(c.a, 'criativos_volume') ?? '') && single(c.a, 'analise') !== 'semanal',
    text: () => 'Gerenciar sozinho costuma deixar criativos e análise para depois. Uma rotina fixa de 30 minutos por semana já muda o jogo.',
  },
  {
    id: 'conta_nova',
    severity: 'baixa',
    title: 'Conta ainda em aprendizado',
    when: (c) => single(c.a, 'tempo_anuncio') === 'menos_3m',
    text: () => 'Nos primeiros meses é normal oscilar. Priorize sinal de conversão e testes de criativos antes de conclusões definitivas.',
  },
];

const SEVERITY_ORDER: Record<AlertSeverity, number> = { alta: 0, media: 1, baixa: 2 };

/* ------------------------------------------------------------------ */
/* Textos de perfil                                                    */
/* ------------------------------------------------------------------ */

const SEG: Record<string, string> = {
  servicos_locais: 'Negócio de serviços locais',
  ecommerce: 'Operação de varejo / e-commerce',
  b2b: 'Empresa de serviços profissionais / B2B',
  educacao: 'Negócio de educação ou infoprodutos',
  alto_valor: 'Negócio de bens de alto valor',
  outro: 'Empresa',
};
const BUDGET: Record<string, string> = {
  ate_1k: 'investindo até R$ 1 mil por mês',
  '1k_3k': 'investindo de R$ 1 a 3 mil por mês',
  '3k_10k': 'investindo de R$ 3 a 10 mil por mês',
  '10k_30k': 'investindo de R$ 10 a 30 mil por mês',
  acima_30k: 'investindo mais de R$ 30 mil por mês',
  nao_informar: 'com investimento não informado',
};
const PLATFORM: Record<string, string> = {
  meta: 'principalmente em Instagram e Facebook',
  google: 'principalmente no Google',
  meta_google: 'em Meta e Google',
  outras: 'em várias plataformas',
};
const MANAGER: Record<string, string> = {
  eu: 'gerenciado por você',
  funcionario: 'gerenciado internamente',
  freelancer: 'com um gestor de tráfego',
  agencia: 'com uma agência',
  ninguem: 'sem responsável definido',
};
const CYCLE: Record<string, string> = {
  mesmo_dia: 'decisão de compra no mesmo dia',
  dias: 'decisão de compra em alguns dias',
  semanas: 'decisão de compra em semanas',
  meses: 'decisão de compra em meses',
};

const SEGMENT_TIP: Record<string, string> = {
  servicos_locais:
    'Em serviços locais, velocidade de resposta e prova social (depoimentos em vídeo de clientes da região) costumam pesar mais que segmentação detalhada. Campanhas de mensagens funcionam bem quando o atendimento responde em minutos.',
  ecommerce:
    'Em e-commerce, a API de Conversões com evento de compra e valor, um catálogo bem cuidado e volume de criativos são a base para Advantage+ e Performance Max otimizarem por receita, e não por cliques.',
  b2b: 'Em B2B, o ciclo longo pede que as vendas fechadas voltem às plataformas (conversões offline via CRM). Sem isso, o algoritmo otimiza para quem preenche formulário, não para quem compra.',
  educacao:
    'Em educação e infoprodutos, o criativo faz quase todo o trabalho: gancho forte nos primeiros segundos, prova e variedade de ângulos. Rastrear a compra no checkout é essencial para escalar.',
  alto_valor:
    'Em bens de alto valor, a qualificação pesa mais que o volume: formulários com perguntas de qualificação e retorno das vendas do CRM às plataformas evitam pagar por contatos sem perfil.',
  outro:
    'Em qualquer segmento, três bases sustentam o tráfego hoje: sinal de conversão confiável para o algoritmo, criativos variados e atendimento rápido.',
};

const PAIN_CONTEXT: Record<string, string> = {
  poucos_leads: 'Você citou poucos contatos como principal problema. Antes de aumentar o investimento, vale confirmar objetivo de otimização, oferta e volume de criativos.',
  nao_fecha: 'Você citou dificuldade em fechar vendas. Nem todo gargalo começa no anúncio — tempo de resposta e follow-up entram na análise.',
  leads_ruins: 'Você citou contatos desqualificados. Oferta, objetivo de otimização e o retorno de quais contatos viraram venda são os principais pontos.',
  custo_alto: 'Você citou custo alto. Comparar o custo por cliente com a margem ajuda a separar “caro” de “inviável”.',
  inconsistente: 'Você citou resultados inconsistentes. Rotina de testes e volume de criativos costumam trazer mais estabilidade.',
  nao_sabe: 'Você disse que não consegue saber o que funciona. Mensuração é o primeiro passo para todas as outras melhorias.',
};

/** Pilares mais ligados a cada objetivo de 30 dias. */
const GOAL_PILLARS: Record<string, PillarId[]> = {
  mais_contatos: ['criativos', 'estrategia'],
  vender_mais: ['conversao', 'criativos'],
  reduzir_custo: ['rentabilidade', 'criativos'],
  escalar: ['rentabilidade', 'mensuracao'],
  organizar_metricas: ['mensuracao', 'rentabilidade'],
  avaliar_gestao: ['estrategia', 'mensuracao'],
};

const STRENGTH: Record<PillarId, string> = {
  mensuracao: 'Você tem boa base de mensuração — isso permite decisões com segurança e dá sinal de qualidade ao algoritmo.',
  rentabilidade: 'Você conhece seus números de custo e margem, base para decidir quando investir mais.',
  estrategia: 'As campanhas parecem ter objetivo e estrutura coerentes, com acompanhamento regular.',
  criativos: 'Há volume e variedade de criativos, o que ajuda a renovar anúncios antes do desgaste.',
  conversao: 'Os contatos são atendidos e acompanhados de forma organizada até a venda.',
};

/** Minúscula só na primeira letra, preservando "R$". */
const lowerFirst = (s: string) => (s.startsWith('R$') ? s : s[0].toLowerCase() + s.slice(1));

function profile(a: Answers): string {
  const parts = [
    SEG[single(a, 'segmento') ?? ''] ?? 'Empresa',
    BUDGET[single(a, 'orcamento') ?? ''],
    PLATFORM[single(a, 'plataformas') ?? ''],
    MANAGER[single(a, 'gestor') ?? ''],
  ].filter(Boolean);
  let text = `${parts.join(', ')}.`;
  const ticket = getOptionLabel('ticket', a.ticket);
  const cycle = CYCLE[single(a, 'ciclo') ?? ''];
  if (ticket && single(a, 'ticket') !== 'nao_sabe') text += ` Ticket médio ${single(a, 'ticket') === 'ate_100' || single(a, 'ticket') === 'acima_10k' ? lowerFirst(ticket) : `de ${ticket}`}${cycle ? `, ${cycle}` : ''}.`;
  else if (cycle) text += ` ${cycle[0].toUpperCase()}${cycle.slice(1)}.`;
  const goal = getOptionLabel('objetivo', a.objetivo);
  if (goal) text += ` Prioridade para os próximos 30 dias: ${lowerFirst(goal)}.`;
  return text;
}

/** Ordena pilares do mais frágil ao mais forte; empate → maior peso estratégico primeiro. */
export function rankGaps(pillars: PillarResult[]): PillarResult[] {
  return [...pillars].sort((x, y) => x.score - y.score || y.weight - x.weight);
}

export function buildReport(answers: Answers, metricsInput?: OptionalMetricsInput): Report {
  const c = buildCtx(answers, metricsInput);
  const score = computeScore(answers, metricsInput);
  const ranked = rankGaps(score.pillars);

  const gaps: Insight[] = ranked.slice(0, 3).map((p) => {
    const g = GAPS[p.id];
    const v = g.variants.find((x) => x.when(c))!;
    return { pillar: p.id, title: g.title, declared: declared(answers, g.facts), hypothesis: v.hypothesis(c), action: v.action(c) };
  });

  const best = [...score.pillars].sort((x, y) => y.score - x.score || y.weight - x.weight)[0];
  const strength =
    best && best.score >= 60
      ? { title: PILLARS[best.id].name, text: STRENGTH[best.id] }
      : {
          title: 'Disposição para entender os números',
          text: 'Você reservou alguns minutos para avaliar a operação. Essa clareza é o ponto de partida para priorizar melhorias.',
        };

  // Primeiro passo: a lacuna mais ligada ao objetivo declarado; senão, a principal.
  const goalPillars = GOAL_PILLARS[single(answers, 'objetivo') ?? ''] ?? [];
  const focus = gaps.find((g) => goalPillars.includes(g.pillar)) ?? gaps[0];

  const alerts = ALERTS.filter((r) => r.when(c))
    .sort((x, y) => SEVERITY_ORDER[x.severity] - SEVERITY_ORDER[y.severity])
    .slice(0, 4)
    .map(({ id, severity, title, text }) => ({ id, severity, title, text: text(c) }));

  return {
    profile: profile(answers),
    segmentTip: SEGMENT_TIP[single(answers, 'segmento') ?? ''] ?? SEGMENT_TIP.outro,
    alerts,
    economics: c.econ,
    score,
    mainGap: gaps[0],
    gaps,
    strength,
    firstStep: focus.action,
    painContext: PAIN_CONTEXT[single(answers, 'dor') ?? ''],
    metrics: computeMetrics(metricsInput),
  };
}
