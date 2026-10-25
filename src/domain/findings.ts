import { findCalc, marginStatus } from './calculations';
import { advertises, getField, is, list, looksLikeInstruction, neverAdvertised, optionLabel, searchOnly, str } from './questionnaire';
import { BLOCKS } from './deepening';
import type { Answers, CalculatedMetric, Contradiction, EvidenceRef, Finding, MetricsInput, PillarId, Prioritized, Resource } from './types';

/* ------------------------------ contexto ------------------------------ */

export interface FindingCtx {
  a: Answers;
  m?: MetricsInput;
  calc: CalculatedMetric[];
  contradictions: Contradiction[];
  restricted: Set<Resource>;
  noExtraBudget: boolean;
  shortOnTime: boolean;
  campaignOwner: string;
  attendOwner: string;
  financeOwner: string;
}

const MANAGER_OWNER: Record<string, string> = {
  eu: 'Você',
  dono: 'Você',
  funcionario: 'Alguém da equipe',
  freelancer: 'Gestor de tráfego',
  gestor: 'Gestor de tráfego',
  agencia: 'Agência',
  ninguem: 'Você (até definir um responsável)',
};
const ATTEND_OWNER: Record<string, string> = { dono: 'Você', equipe: 'Quem atende na equipe', terceiro: 'Atendimento terceirizado', ninguem: 'Você (até definir quem atende)' };

export function buildCtx(a: Answers, calc: CalculatedMetric[], contradictions: Contradiction[], m?: MetricsInput): FindingCtx {
  const r = list(a, 'restricoes');
  const restricted = new Set<Resource>(r.filter((x) => x !== 'nenhuma') as Resource[]);
  const noExtraBudget = r.includes('verba') || is(a, 'b_orcamento_adicional', 'zero');
  if (noExtraBudget) restricted.add('verba');
  const shortOnTime = r.includes('tempo') || is(a, 'b_tempo_semanal', 'menos_1h');
  if (shortOnTime) restricted.add('tempo');
  const campaignOwner = MANAGER_OWNER[str(a, 'b_executor') ?? str(a, 'gestor') ?? ''] ?? 'Você';
  return {
    a,
    m,
    calc,
    contradictions,
    restricted,
    noExtraBudget,
    shortOnTime,
    campaignOwner,
    attendOwner: ATTEND_OWNER[str(a, 'b_responsavel_atendimento') ?? ''] ?? 'Quem atende os contatos',
    financeOwner: 'Você (ou quem cuida das finanças)',
  };
}

/* ------------------------------ evidências ------------------------------ */

const allFields = () => [...BLOCKS.flatMap((b) => b.fields)];
function fieldTitle(id: string, a: Answers): string {
  const f = getField(id) ?? allFields().find((x) => x.id === id);
  if (!f) return id;
  return typeof f.label === 'string' ? f.label : f.label(a);
}
function labelOf(id: string, a: Answers): string | null {
  const direct = optionLabel(id, a[id], a);
  if (direct) return direct;
  const f = allFields().find((x) => x.id === id);
  const v = a[id];
  if (!f || v === undefined) return null;
  if (f.kind === 'text') return typeof v === 'string' && v.trim() && !looksLikeInstruction(v) ? v.trim() : null;
  const opts = typeof f.options === 'function' ? f.options(a) : f.options ?? [];
  const ids = Array.isArray(v) ? v : [String(v)];
  const labels = ids.map((x) => opts.find((o) => o.id === x)?.label).filter(Boolean);
  return labels.length ? labels.join(', ') : null;
}
export function ev(id: string, a: Answers): EvidenceRef | null {
  const value = labelOf(id, a);
  return value ? { id: `resp.${id}`, kind: id.startsWith('b_') ? 'resposta' : 'resposta', label: fieldTitle(id, a), value } : null;
}
const evs = (a: Answers, ...ids: string[]) => ids.map((id) => ev(id, a)).filter(Boolean) as EvidenceRef[];
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export function evCalc(c: CalculatedMetric): EvidenceRef {
  const value = c.unit === 'BRL' ? brl(c.value) : c.unit === 'razao' && c.id.startsWith('roas') ? `${c.value.toFixed(1).replace('.', ',')}x` : c.unit === 'razao' ? `${(c.value * 100).toFixed(1).replace('.', ',')}%` : String(c.value);
  return { id: `calc.${c.id}`, kind: 'calculo', label: c.label, value: `${value}${c.precision === 'estimado' ? ' (estimado)' : ''}` };
}
const quoteFacts = (refs: EvidenceRef[]) => refs.map((r) => `${r.label}: “${r.value}”`).join('; ');

/* ------------------------------ regras ------------------------------ */

type Rule = (c: FindingCtx) => Finding | null;

const weakOrigin = (a: Answers) => is(a, 'vendas_origem', 'estimativa', 'so_contatos', 'nao_acompanha') || is(a, 'b_registro_origem', 'nao');

const RULES: Rule[] = [
  // 1. Origem das vendas
  (c) => {
    const { a } = c;
    if (is(a, 'caminho_venda', 'site')) return null;
    const never = neverAdvertised(a);
    if (!never && !weakOrigin(a)) return null;
    const refs = never ? evs(a, 'campanhas_status', 'caminho_venda') : evs(a, 'vendas_origem', 'b_registro_origem');
    const wa = is(a, 'caminho_venda', 'whatsapp_direct');
    return {
      id: 'registrar_origem',
      pillar: 'mensuracao',
      kind: 'estrutural',
      severity: never ? 2 : is(a, 'vendas_origem', 'nao_acompanha', 'so_contatos') ? 3 : 2,
      evidenceStrength: 'declarado',
      title: never ? 'Registrar a origem das vendas desde o primeiro anúncio' : 'Registrar a origem de cada venda',
      fact: never ? 'Você ainda não anuncia; a forma de medir pode ser definida antes do primeiro real investido.' : `Você informou — ${quoteFacts(refs)}.`,
      hypothesis: never
        ? 'Sem registro desde o início, os primeiros meses de anúncio não vão mostrar o que funcionou.'
        : 'É provável que as decisões sobre campanhas estejam sendo tomadas sem saber quais delas geram vendas.',
      consequence: 'Campanhas que vendem e campanhas que não vendem podem receber o mesmo tratamento; aumentar a verba nessas condições é uma aposta.',
      howToConfirm: 'Registre a origem de todas as vendas por duas semanas e compare com o que as plataformas reportam.',
      evidence: refs,
      action: {
        what: 'Registrar a origem de cada venda',
        why: 'É a base para saber se o anúncio vende e para decidir onde investir.',
        how: [
          'Copie o modelo “Registro de origem das vendas”.',
          'Em toda venda, pergunte “como você nos conheceu?” e anote na hora.',
          ...(wa ? ['No WhatsApp Business, crie a etiqueta “anúncio” e marque cada conversa vinda de anúncio.'] : []),
          'No fim da semana, some as vendas e o valor por origem.',
        ],
        owner: c.attendOwner,
        effort: 'baixo',
        effortHours: '30 minutos para montar + 1 a 2 minutos por venda',
        dependencies: [],
        doneCriteria: 'Duas semanas seguidas com a origem registrada em todas as vendas.',
        indicator: 'Percentual de vendas com origem registrada; vendas vindas de anúncios por semana.',
        reviewWhen: 'Depois de duas semanas de registro, ou antes de qualquer mudança grande de investimento.',
      },
      needs: [],
      templates: ['registro_origem', 'rotina_semanal'],
    };
  },
  // 2. Velocidade de primeira resposta
  (c) => {
    const { a } = c;
    const slow = is(a, 'tempo_resposta', 'mesmo_dia', 'mais_dia') || is(a, 'tempo_primeiro_contato', 'mesmo_dia', 'mais_dia');
    if (!slow) return null;
    const refs = evs(a, 'tempo_resposta', 'tempo_primeiro_contato', 'b_fora_horario', 'b_responsavel_atendimento');
    const lean = c.restricted.has('equipe') || c.restricted.has('tempo') || c.restricted.has('capacidade');
    return {
      id: 'resposta_lenta',
      pillar: 'conversao',
      kind: 'rapida',
      severity: is(a, 'tempo_resposta', 'mais_dia') || is(a, 'tempo_primeiro_contato', 'mais_dia') ? 3 : 2,
      evidenceStrength: 'declarado',
      title: 'Reduzir a demora na primeira resposta',
      fact: `Você informou — ${quoteFacts(refs)}.`,
      hypothesis: 'Parte dos contatos pode esfriar ou procurar outra empresa antes da primeira resposta.',
      consequence: 'Contatos pagos com mídia podem se perder antes de qualquer conversa.',
      howToConfirm: 'Durante uma semana, anote o horário de chegada e o da primeira resposta de cada contato e compare quem respondeu rápido com quem esperou.',
      evidence: refs,
      action: {
        what: lean ? 'Organizar a primeira resposta dentro da capacidade atual' : 'Definir responsável e meta de primeira resposta',
        why: 'É uma mudança barata que reduz perdas enquanto melhorias estruturais são feitas.',
        how: lean
          ? [
              'Ative a mensagem de saudação automática do WhatsApp Business informando quando a pessoa será atendida.',
              'Reserve duas ou três janelas fixas por dia só para responder contatos novos.',
              'Salve as primeiras mensagens do roteiro como respostas rápidas.',
            ]
          : [
              'Defina quem responde contatos novos em cada horário.',
              'Combine uma meta de tempo de primeira resposta que caiba na rotina e acompanhe.',
              'Salve as primeiras mensagens do roteiro como respostas rápidas.',
            ],
        owner: c.attendOwner,
        effort: 'baixo',
        effortHours: '1 hora para configurar',
        dependencies: [],
        doneCriteria: 'Uma semana com todos os contatos novos respondidos dentro da meta combinada (ou com a mensagem automática).',
        indicator: 'Tempo médio até a primeira resposta; contatos sem resposta no dia.',
        reviewWhen: 'Após uma semana. Se a equipe não der conta, reduza o volume de anúncios em vez de deixar contatos sem resposta.',
      },
      needs: [],
      templates: ['roteiro_atendimento'],
    };
  },
  // 3. Controle de contatos e follow-up
  (c) => {
    const { a } = c;
    if (is(a, 'caminho_venda', 'site')) return null;
    const weak = is(a, 'acompanhamento_contatos', 'so_conversa', 'nenhum') || is(a, 'b_follow_up', 'nao');
    if (!weak) return null;
    const refs = evs(a, 'acompanhamento_contatos', 'b_follow_up', 'b_onde_perde');
    return {
      id: 'controle_contatos',
      pillar: 'conversao',
      kind: 'estrutural',
      severity: 2,
      evidenceStrength: 'declarado',
      title: 'Acompanhar cada contato até a venda',
      fact: `Você informou — ${quoteFacts(refs)}.`,
      hypothesis: 'Sem registro de etapas e follow-up, contatos interessados podem ficar sem retorno e não fica claro onde as vendas se perdem.',
      consequence: 'O problema pode ser atribuído ao anúncio quando está no atendimento, ou o contrário.',
      howToConfirm: 'Registre por duas semanas a etapa de cada contato e o motivo das perdas.',
      evidence: refs,
      action: {
        what: 'Montar um controle de contatos com etapas e follow-up',
        why: 'Mostra em que ponto as vendas se perdem e evita contatos esquecidos.',
        how: [
          'Use o modelo “Controle de contatos” (planilha ou etiquetas do WhatsApp Business).',
          'Defina as etapas: novo, em conversa, proposta, fechado, perdido.',
          'Aplique a sequência de follow-up para quem não fechou.',
          'Anote o motivo de cada perda.',
        ],
        owner: c.attendOwner,
        effort: 'baixo',
        effortHours: '1 hora para montar + 10 minutos por dia',
        dependencies: [],
        doneCriteria: 'Todos os contatos das últimas duas semanas com etapa e próximo passo registrados.',
        indicator: 'Contatos por etapa; motivos de perda mais frequentes; vendas vindas de follow-up.',
        reviewWhen: 'Após duas semanas, olhando a etapa com mais perdas.',
      },
      needs: c.restricted.has('equipe') ? ['equipe'] : [],
      templates: ['controle_contatos', 'follow_up'],
    };
  },
  // 4. E-commerce: evento de compra e etapas do checkout
  (c) => {
    const { a } = c;
    if (!is(a, 'caminho_venda', 'site')) return null;
    if (!is(a, 'acompanhamento_compras', 'so_compras', 'nao_acompanha', 'nao_sei') && !neverAdvertised(a)) return null;
    const refs = evs(a, 'acompanhamento_compras', 'b_rastreamento', 'b_plataforma_loja', 'b_evento_conversao');
    const store = str(a, 'b_plataforma_loja') && !looksLikeInstruction(str(a, 'b_plataforma_loja')!) ? str(a, 'b_plataforma_loja') : undefined;
    const hasCapi = list(a, 'b_rastreamento').includes('api_conversoes');
    return {
      id: 'evento_compra',
      pillar: 'mensuracao',
      kind: 'estrutural',
      severity: is(a, 'acompanhamento_compras', 'nao_acompanha') ? 3 : 2,
      evidenceStrength: refs.length ? 'declarado' : 'lacuna',
      title: 'Medir compras e etapas do checkout por origem',
      fact: refs.length ? `Você informou — ${quoteFacts(refs)}.` : 'Ainda não há informação sobre como as compras são medidas.',
      hypothesis: 'Sem o evento de compra com valor registrado por origem, não dá para saber quais campanhas geram receita nem em que etapa o comprador desiste.',
      consequence: 'As plataformas otimizam com menos informação e as decisões de verba ficam sem base.',
      howToConfirm: 'Faça uma compra de teste e verifique se ela aparece, com valor correto e uma única vez, no gerenciador de eventos de cada plataforma.',
      evidence: refs,
      action: {
        what: 'Registrar o evento de compra (com valor) e as etapas do checkout',
        why: 'Liga cada compra à campanha de origem e mostra onde o comprador desiste.',
        how: [
          `Confirme na ${store ? `plataforma ${store}` : 'plataforma da loja'} quais eventos já são enviados: visualização de produto, adição ao carrinho, início do checkout e compra (com valor e moeda).`,
          'Use a integração oficial da loja com cada plataforma de anúncio, em vez de instalar códigos soltos.',
          hasCapi
            ? 'Como a API de Conversões já está ativa, verifique se o mesmo pedido não é contado duas vezes (navegador + servidor): os eventos devem usar o mesmo identificador para deduplicação.'
            : 'Se a integração da loja oferecer envio pelo servidor (API de Conversões), ative-o para o evento de compra, usando o identificador do pedido para evitar contagem dupla com o pixel.',
          'Use UTMs nos links dos anúncios para conferir a origem também no relatório da loja.',
          'Faça uma compra de teste e confira os eventos.',
        ],
        owner: 'Quem administra a loja (ou o desenvolvedor)',
        effort: 'medio',
        effortHours: '2 a 6 horas, conforme a plataforma da loja',
        dependencies: [],
        doneCriteria: 'Compra de teste registrada uma única vez, com valor correto, em cada plataforma; total semanal de compras da plataforma próximo ao do sistema da loja, com diferença explicada.',
        indicator: 'Compras registradas pela plataforma ÷ pedidos do sistema da loja; abandono por etapa do checkout.',
        reviewWhen: 'Uma semana depois da configuração, comparando com os pedidos da loja.',
      },
      needs: ['acesso_tecnico'],
      templates: ['rotina_semanal'],
    };
  },
  // 5. Agendamento: comparecimento e fechamento
  (c) => {
    const { a } = c;
    if (!is(a, 'caminho_venda', 'agendamento') || !is(a, 'acompanhamento_agenda', 'so_agendamentos', 'nao_acompanha')) return null;
    const refs = evs(a, 'acompanhamento_agenda', 'b_reagendamento');
    return {
      id: 'agenda_registro',
      pillar: 'conversao',
      kind: 'estrutural',
      severity: 2,
      evidenceStrength: 'declarado',
      title: 'Registrar comparecimento e fechamento por origem',
      fact: `Você informou — ${quoteFacts(refs)}.`,
      hypothesis: 'Sem saber quem compareceu e fechou, não dá para separar problema de anúncio, de agendamento ou de atendimento presencial.',
      consequence: 'Agendamentos podem parecer bons enquanto as vendas não acontecem.',
      howToConfirm: 'Registre por duas semanas: agendou, compareceu, fechou — com a origem de cada um.',
      evidence: refs,
      action: {
        what: 'Acrescentar comparecimento, fechamento e origem ao registro da agenda',
        why: 'Mostra em que etapa as vendas se perdem.',
        how: ['Adicione três colunas à agenda ou planilha: origem, compareceu (sim/não), fechou (sim/não).', 'Preencha no fim de cada dia.', 'Some por origem toda semana.'],
        owner: c.attendOwner,
        effort: 'baixo',
        effortHours: '30 minutos + 5 minutos por dia',
        dependencies: [],
        doneCriteria: 'Duas semanas com todos os agendamentos marcados como compareceu/fechou.',
        indicator: 'Comparecimento (comparecimentos ÷ agendamentos) e fechamento por origem.',
        reviewWhen: 'Após duas semanas.',
      },
      needs: [],
      templates: ['controle_contatos'],
    };
  },
  // 6. Lembretes
  (c) => {
    const { a } = c;
    if (!is(a, 'caminho_venda', 'agendamento') || !is(a, 'lembretes', 'nao')) return null;
    const refs = evs(a, 'lembretes', 'b_agenda_capacidade');
    return {
      id: 'lembretes',
      pillar: 'conversao',
      kind: 'rapida',
      severity: 2,
      evidenceStrength: 'declarado',
      title: 'Enviar lembrete antes do horário marcado',
      fact: `Você informou — ${quoteFacts(refs)}.`,
      hypothesis: 'Parte das faltas pode ser esquecimento, que um lembrete simples tende a reduzir.',
      consequence: 'Horários vazios e contatos pagos que não viram atendimento.',
      howToConfirm: 'Compare o comparecimento das duas semanas com lembrete com as duas anteriores.',
      evidence: refs,
      action: {
        what: 'Enviar lembrete na véspera e no dia',
        why: 'Ação simples, sem custo de mídia, que pode recuperar atendimentos.',
        how: ['Crie duas mensagens prontas: véspera (com opção de reagendar) e duas horas antes.', 'Use o recurso de lembrete do sistema de agenda, se houver; senão, envie manualmente.'],
        owner: c.attendOwner,
        effort: 'baixo',
        effortHours: '30 minutos para preparar',
        dependencies: [],
        doneCriteria: 'Todos os agendamentos de uma semana receberam os dois lembretes.',
        indicator: 'Comparecimento semanal.',
        reviewWhen: 'Após duas semanas.',
      },
      needs: [],
      templates: [],
    };
  },
  // 7. Qualificação (venda consultiva) ou contatos desqualificados
  (c) => {
    const { a } = c;
    const consultive = is(a, 'caminho_venda', 'formulario', 'ligacao_visita');
    if (!(consultive && is(a, 'qualificacao', 'informal', 'nao_qualifica')) && !is(a, 'dor', 'contatos_desqualificados')) return null;
    const refs = evs(a, 'qualificacao', 'dor', 'b_criterios_qualificacao', 'b_objetivo_campanha');
    return {
      id: 'qualificacao',
      pillar: 'conversao',
      kind: 'estrutural',
      severity: 2,
      evidenceStrength: 'declarado',
      title: 'Definir e registrar o que é um contato qualificado',
      fact: `Você informou — ${quoteFacts(refs)}.`,
      hypothesis: 'Sem critério registrado, não dá para saber se a campanha traz o perfil certo nem ensinar isso às plataformas.',
      consequence: 'Tempo de atendimento gasto com contatos sem perfil e decisões de campanha baseadas em volume.',
      howToConfirm: 'Classifique os contatos de duas semanas como qualificado/não qualificado pelos critérios e veja a proporção por campanha.',
      evidence: refs,
      action: {
        what: 'Definir 2 ou 3 critérios de qualificação e marcar cada contato',
        why: 'Permite medir qualidade, não só quantidade.',
        how: [
          'Escreva os critérios (ex.: região atendida, necessidade real, faixa de orçamento).',
          'Se usar formulário, inclua uma ou duas perguntas ligadas aos critérios.',
          'Marque cada contato como qualificado ou não no controle de contatos.',
        ],
        owner: c.attendOwner,
        effort: 'baixo',
        effortHours: '1 hora',
        dependencies: [],
        doneCriteria: 'Critérios escritos e duas semanas de contatos classificados.',
        indicator: 'Percentual de contatos qualificados por campanha.',
        reviewWhen: 'Após duas semanas; depois, avaliar com quem gerencia as campanhas se dá para otimizar para contatos qualificados.',
      },
      needs: [],
      templates: ['controle_contatos'],
    };
  },
  // 8. Margem desconhecida
  (c) => {
    const { a } = c;
    if (!is(a, 'margem_faixa', 'nao_sei') && !(is(a, 'margem_tipo', 'nao_especificada') && !c.m?.values.margem_percentual)) return null;
    const refs = evs(a, 'margem_faixa', 'margem_tipo', 'ticket_faixa');
    return {
      id: 'levantar_margem',
      pillar: 'economia',
      kind: 'investigacao',
      severity: 2,
      evidenceStrength: 'lacuna',
      title: 'Levantar a margem por venda',
      fact: `Você informou — ${quoteFacts(refs)}.`,
      hypothesis: 'Sem a margem, não dá para saber quanto pode custar um cliente nem se o resultado atual paga a mídia.',
      consequence: 'Decisões de verba sem um teto de custo por cliente.',
      howToConfirm: 'Preencha o modelo de margem com o preço e os custos de uma venda típica.',
      evidence: refs,
      action: {
        what: 'Calcular a margem de contribuição de uma venda típica',
        why: 'Define o custo máximo de mídia por cliente e o retorno mínimo para empatar.',
        how: ['Use o modelo “Levantamento de margem por venda”.', 'Inclua impostos, taxas e comissões, não só o custo do produto.', 'Calcule 1 ÷ margem para obter o retorno mínimo de mídia.'],
        owner: c.financeOwner,
        effort: 'baixo',
        effortHours: '1 hora',
        dependencies: [],
        doneCriteria: 'Margem de contribuição em % calculada e anotada.',
        indicator: 'Custo de mídia por cliente comparado à margem por venda.',
        reviewWhen: 'Quando preços ou custos mudarem.',
      },
      needs: [],
      templates: ['levantamento_margem'],
    };
  },
  // 9. Custo de mídia por cliente acima da margem (calculado)
  (c) => {
    if (marginStatus(c.calc) !== 'acima_da_margem') return null;
    const cpa = findCalc(c.calc, 'custo_midia_cliente')!;
    const mpv = findCalc(c.calc, 'margem_por_venda')!;
    const refs = [evCalc(cpa), evCalc(mpv), ...evs(c.a, 'b_recompra')];
    const repeat = is(c.a, 'b_recompra', 'frequente', 'as_vezes');
    return {
      id: 'custo_acima_margem',
      pillar: 'economia',
      kind: 'estrutural',
      severity: 3,
      evidenceStrength: 'calculado',
      title: 'Custo de mídia por cliente acima da margem por venda',
      fact: `Com os números informados: custo de mídia por cliente ${evCalc(cpa).value}; margem aproximada por venda ${evCalc(mpv).value}.`,
      hypothesis: repeat
        ? 'Na primeira venda a mídia não se paga; pode compensar se houver recompra suficiente, o que ainda não foi medido.'
        : 'Com os números informados, a primeira venda não paga o custo de mídia para conquistar o cliente.',
      consequence: 'Aumentar o investimento nessas condições tende a aumentar o prejuízo.',
      howToConfirm: 'Confira se todas as vendas dos anúncios foram contadas e se a margem considera os custos certos; se houver recompra, levante quanto um cliente compra em 6 meses.',
      evidence: refs,
      action: {
        what: 'Rever os números e as campanhas antes de qualquer aumento de verba',
        why: 'Evita ampliar uma operação que, pelos dados informados, não se paga na primeira venda.',
        how: [
          'Confirme a contagem de vendas por origem (pode haver vendas não registradas).',
          'Separe o resultado por campanha e identifique as que concentram as vendas.',
          'Reavalie oferta, ticket ou condições antes de aumentar o investimento.',
        ],
        owner: c.campaignOwner,
        effort: 'medio',
        effortHours: '2 a 4 horas',
        dependencies: [],
        doneCriteria: 'Números revisados e decisão registrada por campanha (manter, ajustar ou pausar).',
        indicator: 'Custo de mídia por cliente ÷ margem por venda.',
        reviewWhen: 'A cada fechamento mensal.',
      },
      needs: [],
      templates: ['rotina_semanal'],
      after: ['registrar_origem', 'evento_compra'],
    };
  },
  // 9b. Margem apertada (calculado)
  (c) => {
    if (marginStatus(c.calc) !== 'apertado') return null;
    const ratio = findCalc(c.calc, 'custo_sobre_margem')!;
    const refs = [evCalc(findCalc(c.calc, 'custo_midia_cliente')!), evCalc(findCalc(c.calc, 'margem_por_venda')!), evCalc(ratio), ...evs(c.a, 'b_recompra')];
    return {
      id: 'margem_apertada',
      pillar: 'economia',
      kind: 'estrutural',
      severity: 2,
      evidenceStrength: 'calculado',
      title: 'Custo de mídia consome grande parte da margem',
      fact: `Com os números informados, o custo de mídia por cliente equivale a ${evCalc(ratio).value} da margem aproximada por venda.`,
      hypothesis: is(c.a, 'b_recompra', 'frequente', 'as_vezes')
        ? 'A primeira venda deixa pouca sobra; a recompra pode compensar, mas ainda não foi medida.'
        : 'A primeira venda deixa pouca sobra depois da mídia; pequenas altas de custo podem tornar a operação deficitária.',
      consequence: 'Pouca margem de segurança para investir mais.',
      howToConfirm: 'Separe o custo de mídia por cliente por campanha e veja quais ficam acima da margem.',
      evidence: refs,
      action: {
        what: 'Separar o custo de mídia por cliente por campanha',
        why: 'Mostra quais campanhas sustentam a margem e quais a consomem.',
        how: ['Monte uma tabela por campanha: investimento, vendas atribuídas, custo de mídia por cliente.', 'Compare cada linha com a margem por venda.', 'Ajuste primeiro as campanhas acima da margem, sem aumentar a verba total.'],
        owner: c.campaignOwner,
        effort: 'medio',
        effortHours: '2 horas',
        dependencies: [],
        doneCriteria: 'Tabela por campanha preenchida e decisão registrada para cada uma.',
        indicator: 'Custo de mídia por cliente ÷ margem por venda, por campanha.',
        reviewWhen: 'A cada fechamento mensal.',
      },
      needs: [],
      templates: ['rotina_semanal'],
      after: ['evento_compra', 'registrar_origem'],
    };
  },
  // 9c. Frete com reclamação (e-commerce)
  (c) => {
    if (!is(c.a, 'caminho_venda', 'site') || !is(c.a, 'b_frete', 'caro')) return null;
    const refs = evs(c.a, 'b_frete', 'b_abandonos');
    return {
      id: 'frete',
      pillar: 'conversao',
      kind: 'investigacao',
      severity: 1,
      evidenceStrength: 'declarado',
      title: 'Verificar o peso do frete no abandono',
      fact: `Você informou — ${quoteFacts(refs)}.`,
      hypothesis: 'O valor do frete pode estar levando compradores a desistir no checkout.',
      consequence: 'Investimento em mídia que chega ao checkout e não vira compra.',
      howToConfirm: 'Compare quantos iniciam o checkout e quantos concluem; verifique se a desistência se concentra na etapa do frete.',
      evidence: refs,
      action: {
        what: 'Medir o abandono na etapa do frete antes de mudar a política',
        why: 'Evita mudar o frete sem saber se ele é o problema.',
        how: ['Veja no relatório da loja a taxa de checkouts iniciados e concluídos.', 'Se a loja mostrar etapas, confira em qual a desistência se concentra.'],
        owner: 'Quem administra a loja',
        effort: 'baixo',
        effortHours: '1 hora',
        dependencies: ['Etapas do checkout registradas'],
        doneCriteria: 'Taxa de conclusão do checkout anotada e etapa com mais desistência identificada.',
        indicator: 'Checkouts concluídos ÷ iniciados.',
        reviewWhen: 'Depois de medir; só então avaliar mudança na política de frete.',
      },
      needs: [],
      templates: [],
      after: ['evento_compra'],
    };
  },
  // 10. Rotina de análise
  (c) => {
    const { a } = c;
    if (!is(a, 'rotina_analise', 'quando_problema', 'sem_rotina')) return null;
    const third = is(a, 'gestor', 'agencia', 'freelancer');
    const refs = evs(a, 'rotina_analise', 'gestor');
    return {
      id: 'rotina_analise',
      pillar: 'gestao',
      kind: 'estrutural',
      severity: 2,
      evidenceStrength: 'declarado',
      title: third ? 'Combinar uma rotina de indicadores com quem gerencia' : 'Criar uma rotina semanal de análise',
      fact: `Você informou — ${quoteFacts(refs)}.`,
      hypothesis: 'Sem revisão periódica, problemas só aparecem quando já custaram caro.',
      consequence: 'Ajustes tardios e decisões por impressão.',
      howToConfirm: 'Veja quando foi a última mudança nas campanhas e qual número a motivou.',
      evidence: refs,
      action: {
        what: third ? 'Alinhar com o gestor ou a agência um resumo semanal por escrito' : 'Reservar 30 minutos por semana para os indicadores',
        why: 'Decisões passam a ter base e ficam registradas.',
        how: third
          ? ['Envie o “Checklist para conversar com o gestor”.', 'Combine o envio semanal da “Rotina semanal de indicadores”.', 'Guarde as respostas para comparar mês a mês.']
          : ['Marque um horário fixo na semana.', 'Preencha a “Rotina semanal de indicadores”.', 'Anote uma decisão por semana e o motivo.'],
        owner: third ? c.campaignOwner : 'Você',
        effort: 'baixo',
        effortHours: '30 minutos por semana',
        dependencies: [],
        doneCriteria: 'Quatro semanas seguidas com a planilha preenchida e uma decisão registrada por semana.',
        indicator: 'Semanas com análise registrada.',
        reviewWhen: 'Após quatro semanas.',
      },
      needs: [],
      templates: third ? ['checklist_gestor', 'rotina_semanal'] : ['rotina_semanal'],
    };
  },
  // 11. Gestão terceirizada sem visibilidade
  (c) => {
    const { a } = c;
    if (!is(a, 'gestor', 'agencia', 'freelancer', 'funcionario')) return null;
    if (!is(a, 'rotina_analise', 'nao_sei') && !is(a, 'rotina_testes', 'nao_sei')) return null;
    const refs = evs(a, 'gestor', 'rotina_analise', 'rotina_testes');
    return {
      id: 'visibilidade_gestao',
      pillar: 'gestao',
      kind: 'investigacao',
      severity: 1,
      evidenceStrength: 'lacuna',
      title: 'Entender como as campanhas são geridas',
      fact: `Você informou — ${quoteFacts(refs)}.`,
      hypothesis: '“Não sei” aqui indica falta de visibilidade sobre a gestão — não comprova que a gestão esteja errada.',
      consequence: 'Dificuldade para avaliar o trabalho e decidir com segurança.',
      howToConfirm: 'Peça a quem gerencia as respostas do checklist.',
      evidence: refs,
      action: {
        what: 'Pedir a quem gerencia as informações básicas da gestão',
        why: 'Transforma “não sei” em informação para decidir.',
        how: ['Envie o “Checklist para conversar com o gestor”.', 'Peça as respostas por escrito em até uma semana.'],
        owner: 'Você',
        effort: 'baixo',
        effortHours: '20 minutos',
        dependencies: [],
        doneCriteria: 'Checklist respondido por escrito.',
        indicator: 'Perguntas do checklist com resposta.',
        reviewWhen: 'Ao receber as respostas.',
      },
      needs: [],
      templates: ['checklist_gestor'],
    };
  },
  // 12. Testes de anúncio (respeitando canal, material e verba)
  (c) => {
    const { a } = c;
    if (!is(a, 'rotina_testes', 'nao_testa', 'eventual')) return null;
    const refs = evs(a, 'rotina_testes', 'plataformas', 'b_material', 'b_tempo_semanal');
    const search = searchOnly(a);
    const noMaterial = is(a, 'b_material', 'nada');
    return {
      id: 'testes',
      pillar: 'gestao',
      kind: 'estrutural',
      severity: is(a, 'rotina_testes', 'nao_testa') ? 2 : 1,
      evidenceStrength: 'declarado',
      title: search ? 'Testar títulos, textos e página de destino' : 'Testar uma abordagem de anúncio por vez',
      fact: `Você informou — ${quoteFacts(refs)}.`,
      hypothesis: 'Sem testes registrados, fica difícil saber o que atrai contatos com perfil de compra.',
      consequence: 'Dependência de poucos anúncios e decisões por gosto pessoal.',
      howToConfirm: 'Veja quantas versões de anúncio rodaram no último mês e se há registro do que foi aprendido.',
      evidence: refs,
      action: {
        what: search ? 'Rodar um teste de texto ou de página de destino por vez' : 'Rodar um teste de abordagem por vez, com registro',
        why: 'Gera aprendizado comparável sem aumentar a complexidade.',
        how: [
          'Preencha o “Briefing de teste de anúncio” com uma única hipótese.',
          search
            ? 'Crie uma variação de títulos ou descrições ligada à objeção mais comum, mantendo palavras-chave e orçamento.'
            : noMaterial
              ? 'Use o material que já existe (fotos do serviço, perguntas frequentes dos clientes) para criar uma variação simples, sem produção nova.'
              : 'Crie uma variação mudando só a abertura ou a mensagem principal.',
          c.noExtraBudget ? 'Faça o teste dentro do orçamento atual, sem aumentar a verba.' : 'Mantenha o mesmo orçamento da versão atual para comparar.',
          'Compare por custo por contato qualificado ou por venda, não só por clique.',
        ],
        owner: c.campaignOwner,
        effort: c.shortOnTime ? 'baixo' : 'medio',
        effortHours: c.shortOnTime ? '1 hora a cada duas semanas' : '2 horas por teste',
        dependencies: ['Registro de origem das vendas (para comparar por vendas)'],
        doneCriteria: 'Um teste concluído e o aprendizado anotado no briefing.',
        indicator: 'Custo por contato qualificado ou por venda de cada versão.',
        reviewWhen: 'Ao fim de cada teste, sem alterar nada no meio dele.',
      },
      needs: ['tempo'],
      templates: ['briefing_teste'],
      after: ['registrar_origem', 'evento_compra'],
    };
  },
  // 13. Oferta pouco clara
  (c) => {
    const { a } = c;
    if (!is(a, 'oferta', 'apresentacao', 'institucional', 'nao_sei')) return null;
    const refs = evs(a, 'oferta', 'b_beneficio', 'b_objecao', 'b_oferta_atual');
    const benefit = str(a, 'b_beneficio') && !looksLikeInstruction(str(a, 'b_beneficio')!) ? str(a, 'b_beneficio') : undefined;
    return {
      id: 'oferta',
      pillar: 'oferta',
      kind: is(a, 'oferta', 'apresentacao') ? 'rapida' : 'estrutural',
      severity: is(a, 'oferta', 'institucional') ? 2 : 1,
      evidenceStrength: 'declarado',
      title: 'Deixar claro o benefício e o motivo para agir',
      fact: `Você informou — ${quoteFacts(refs)}.`,
      hypothesis: 'Sem um benefício claro e um próximo passo simples, o anúncio depende de a pessoa já estar decidida.',
      consequence: 'Menos contatos por real investido, ou contatos que chegam sem entender a proposta.',
      howToConfirm: 'Mostre o anúncio a três clientes e pergunte o que entenderam e o que fariam em seguida.',
      evidence: refs,
      action: {
        what: 'Reescrever a mensagem principal com benefício e próximo passo',
        why: 'Ajuda quem vê o anúncio a entender por que agir agora.',
        how: [
          benefit ? `Abra com o benefício que você informou: “${benefit}”.` : 'Abra com o principal benefício em uma frase.',
          'Responda à objeção mais comum no próprio anúncio.',
          'Indique um próximo passo simples (ex.: pedir uma avaliação ou simulação).',
          'Use apenas condições que a empresa realmente oferece — não crie descontos, bônus ou garantias novos.',
        ],
        owner: c.campaignOwner,
        effort: 'baixo',
        effortHours: '1 a 2 horas',
        dependencies: [],
        doneCriteria: 'Nova mensagem aprovada e publicada em ao menos um anúncio.',
        indicator: 'Contatos qualificados por real investido, comparado à versão anterior.',
        reviewWhen: 'Depois de tempo suficiente para comparar com a versão anterior.',
      },
      needs: ['tempo'],
      templates: ['briefing_teste'],
    };
  },
  // 14. Objetivo de campanha raso
  (c) => {
    const { a } = c;
    if (!is(a, 'b_objetivo_campanha', 'trafego', 'alcance')) return null;
    const hasEvent = list(a, 'b_rastreamento').includes('eventos') || !!str(a, 'b_evento_conversao');
    const refs = evs(a, 'b_objetivo_campanha', 'b_evento_conversao', 'b_rastreamento');
    return {
      id: 'objetivo_campanha',
      pillar: 'gestao',
      kind: 'estrutural',
      severity: 2,
      evidenceStrength: 'declarado',
      title: 'Alinhar o objetivo da campanha ao resultado que importa',
      fact: `Você informou — ${quoteFacts(refs)}.`,
      hypothesis: 'Campanhas otimizadas para cliques ou alcance buscam quem clica ou vê — não necessariamente quem compra.',
      consequence: 'Bons números de clique com poucas vendas.',
      howToConfirm: 'Compare as vendas das últimas semanas com os cliques reportados.',
      evidence: refs,
      action: {
        what: hasEvent ? 'Testar campanha otimizada para o evento de conversão' : 'Definir o evento de conversão antes de mudar o objetivo',
        why: 'As plataformas otimizam para o que você pede.',
        how: hasEvent
          ? ['Crie uma campanha com objetivo de vendas, cadastros ou mensagens, usando o evento que já existe.', 'Mantenha a campanha atual até comparar.', c.noExtraBudget ? 'Divida o orçamento atual, sem aumentar a verba.' : 'Use um orçamento que permita comparar.']
          : ['Defina qual ação representa um contato real (compra, cadastro, conversa).', 'Configure esse evento antes de trocar o objetivo.'],
        owner: c.campaignOwner,
        effort: 'medio',
        effortHours: '2 a 3 horas',
        dependencies: hasEvent ? [] : ['Evento de conversão configurado'],
        doneCriteria: 'Campanha com objetivo de conversão ativa e comparada com a anterior.',
        indicator: 'Custo por contato qualificado ou por venda, por campanha.',
        reviewWhen: 'Quando houver resultados suficientes para comparar, sem mexer no meio.',
      },
      needs: [],
      templates: ['briefing_teste'],
      after: ['registrar_origem', 'evento_compra'],
    };
  },
  // 15. Google Pesquisa: termos e negativas
  (c) => {
    const { a } = c;
    if (!list(a, 'plataformas').includes('google_pesquisa')) return null;
    const weak = is(a, 'b_termos_pesquisa', 'nunca', 'eventual', 'nao_sei') || is(a, 'b_negativas', 'nao') || (is(a, 'b_area_geografica', 'ampla') && is(a, 'regiao', 'local', 'regional'));
    if (!weak) return null;
    const refs = evs(a, 'b_termos_pesquisa', 'b_negativas', 'b_area_geografica', 'regiao');
    return {
      id: 'pesquisa_termos',
      pillar: 'gestao',
      kind: 'rapida',
      severity: 2,
      evidenceStrength: 'declarado',
      title: 'Revisar termos de pesquisa, negativas e área geográfica',
      fact: `Você informou — ${quoteFacts(refs)}.`,
      hypothesis: 'Parte do investimento em Pesquisa pode estar indo para buscas sem relação com o negócio ou fora da região atendida.',
      consequence: 'Cliques pagos de pessoas que não podem comprar.',
      howToConfirm: 'Abra o relatório de termos de pesquisa dos últimos 30 dias e marque os que não têm relação com o que você vende.',
      evidence: refs,
      action: {
        what: 'Revisar termos de pesquisa e montar lista de negativas',
        why: 'Concentra o orçamento atual em buscas com intenção de compra, sem aumentar a verba.',
        how: [
          'Abra o relatório de termos de pesquisa (últimos 30 dias).',
          'Marque termos sem relação com o negócio e adicione-os como negativas.',
          is(a, 'b_area_geografica', 'ampla') ? 'Ajuste a área geográfica para a região que você realmente atende.' : 'Confirme se a área geográfica corresponde à região atendida.',
          'Repita a revisão toda semana por um mês.',
        ],
        owner: c.campaignOwner,
        effort: 'baixo',
        effortHours: '1 hora por semana',
        dependencies: [],
        doneCriteria: 'Lista de negativas criada e quatro revisões semanais registradas.',
        indicator: 'Parte do investimento em termos sem relação com o negócio.',
        reviewWhen: 'Após quatro revisões semanais.',
      },
      needs: [],
      templates: ['checklist_gestor'],
    };
  },
  // 16. Contradições nos números
  (c) => {
    if (!c.contradictions.length) return null;
    return {
      id: 'revisar_numeros',
      pillar: 'mensuracao',
      kind: 'investigacao',
      severity: 2,
      evidenceStrength: 'lacuna',
      title: 'Revisar números que não batem',
      fact: c.contradictions.map((x) => x.message).join(' '),
      hypothesis: 'Os números podem ser de períodos ou origens diferentes; enquanto isso, os cálculos afetados ficam de fora ou como aproximação.',
      consequence: 'Conclusões erradas sobre custo e conversão.',
      howToConfirm: 'Confira a origem e o período de cada número indicado.',
      evidence: c.contradictions.map((x) => ({ id: `contra.${x.id}`, kind: 'metrica' as const, label: 'Inconsistência', value: x.message })),
      action: {
        what: 'Conferir origem e período dos números indicados',
        why: 'Sem isso, os cálculos podem levar a decisões erradas.',
        how: ['Para cada número indicado, anote de onde veio (plataforma, CRM, planilha, estimativa).', 'Use o mesmo período para todos.', 'Atualize os números no aprofundamento e gere o plano novamente, se necessário.'],
        owner: 'Você',
        effort: 'baixo',
        effortHours: '30 minutos a 1 hora',
        dependencies: [],
        doneCriteria: 'Cada número com origem e período confirmados.',
        indicator: 'Inconsistências pendentes.',
        reviewWhen: 'Antes da próxima decisão de investimento.',
      },
      needs: [],
      templates: [],
    };
  },
  // 17. Falta de números do período
  (c) => {
    if (!advertises(c.a)) return null;
    const v = c.m?.values ?? {};
    const has = (k: 'investimento' | 'vendas') => typeof v[k]?.value === 'number';
    if (has('investimento') && has('vendas')) return null;
    return {
      id: 'levantar_numeros',
      pillar: 'mensuracao',
      kind: 'investigacao',
      severity: 1,
      evidenceStrength: 'lacuna',
      title: 'Levantar investimento e vendas do último mês',
      fact: 'Investimento e vendas atribuídas do período não foram informados.',
      hypothesis: 'Sem esses dois números não dá para calcular custo de mídia por cliente nem comparar com a margem.',
      consequence: 'A análise financeira fica limitada.',
      howToConfirm: 'Some o investimento das plataformas e as vendas com origem nos anúncios do último mês.',
      evidence: [],
      action: {
        what: 'Anotar investimento e vendas atribuídas do último mês',
        why: 'Permite os primeiros cálculos de custo por cliente.',
        how: ['Investimento: relatório de faturamento de cada plataforma.', 'Vendas: registro de origem (ou a melhor estimativa, marcada como estimativa).'],
        owner: 'Você',
        effort: 'baixo',
        effortHours: '30 minutos',
        dependencies: [],
        doneCriteria: 'Os dois números anotados, com a origem de cada um.',
        indicator: 'Custo de mídia por cliente.',
        reviewWhen: 'Todo fechamento de mês.',
      },
      needs: [],
      templates: ['rotina_semanal'],
      after: ['registrar_origem'],
    };
  },
  // 18. Quem ainda não anuncia: orçamento de teste
  (c) => {
    if (!neverAdvertised(c.a) || !is(c.a, 'orcamento', 'nao_definido')) return null;
    const refs = evs(c.a, 'orcamento', 'dor');
    return {
      id: 'orcamento_teste',
      pillar: 'economia',
      kind: 'investigacao',
      severity: 1,
      evidenceStrength: 'lacuna',
      title: 'Definir um orçamento de teste',
      fact: `Você informou — ${quoteFacts(refs)}.`,
      hypothesis: 'Sem um valor definido, fica difícil planejar o teste e saber quando parar ou continuar.',
      consequence: 'Risco de investir mais do que o caixa permite ou parar cedo demais.',
      howToConfirm: 'Defina quanto você aceita investir como aprendizado, sem contar com retorno imediato.',
      evidence: refs,
      action: {
        what: 'Definir um valor de teste e um prazo',
        why: 'Dá limite ao risco e um momento para avaliar.',
        how: ['Escolha um valor que não comprometa o caixa.', 'Defina um prazo de avaliação.', 'Use o registro de origem desde o primeiro dia.'],
        owner: 'Você',
        effort: 'baixo',
        effortHours: '30 minutos',
        dependencies: [],
        doneCriteria: 'Valor e prazo de teste escritos.',
        indicator: 'Investimento acumulado do teste e vendas registradas por origem.',
        reviewWhen: 'Ao fim do prazo de teste.',
      },
      needs: [],
      templates: ['registro_origem'],
    };
  },
];

/* ------------------------------ priorização ------------------------------ */

const SEVERITY_W = 10;
const EVIDENCE_W = { calculado: 5, declarado: 4, lacuna: 2 } as const;
const EFFORT_PENALTY = { baixo: 0, medio: 3, alto: 6 } as const;
const CONFLICT_PENALTY = 6;
/** Prioridade declarada só desempata: desejo não é evidência. */
const GOAL_PILLARS: Record<string, PillarId[]> = {
  mais_contatos: ['oferta', 'gestao'],
  vender_mais: ['conversao'],
  reduzir_custo: ['economia', 'gestao'],
  organizar_numeros: ['mensuracao', 'economia'],
  avaliar_gestao: ['gestao'],
  escalar: ['economia', 'mensuracao'],
  comecar_certo: ['mensuracao', 'oferta'],
};
const RESOURCE_LABEL: Record<Resource, string> = { tempo: 'pouco tempo', equipe: 'equipe pequena', verba: 'sem verba adicional', capacidade: 'capacidade limitada', acesso_tecnico: 'acesso técnico' };

export function generateFindings(ctx: FindingCtx): Finding[] {
  return RULES.map((r) => r(ctx)).filter(Boolean) as Finding[];
}

export function prioritize(findings: Finding[], ctx: FindingCtx): Prioritized {
  const goal = GOAL_PILLARS[str(ctx.a, 'prioridade') ?? ''] ?? [];
  const scored = findings.map((f) => {
    const conflicts = f.needs.filter((n) => ctx.restricted.has(n));
    const score = f.severity * SEVERITY_W + EVIDENCE_W[f.evidenceStrength] - EFFORT_PENALTY[f.action.effort] - conflicts.length * CONFLICT_PENALTY + (goal.includes(f.pillar) ? 1 : 0);
    return { ...f, priorityScore: score, constraintNote: conflicts.length ? `Atenção à restrição informada: ${conflicts.map((x) => RESOURCE_LABEL[x]).join(', ')}.` : undefined };
  });
  scored.sort((x, y) => y.priorityScore - x.priorityScore || x.id.localeCompare(y.id));

  // Dependências: um achado com `after` vem depois dos achados citados presentes.
  const ordered: typeof scored = [];
  const pending = [...scored];
  while (pending.length) {
    const idx = pending.findIndex((f) => !(f.after ?? []).some((dep) => pending.some((p) => p.id === dep)));
    ordered.push(pending.splice(idx === -1 ? 0 : idx, 1)[0]);
  }

  const structural = ordered.find((f) => f.kind === 'estrutural');
  const quickWin = ordered.find((f) => f.kind === 'rapida' && f.action.effort === 'baixo');
  const investigation = ordered.find((f) => f.kind === 'investigacao');
  const quickWinRationale =
    quickWin && structural && quickWin.id !== structural.id
      ? `A ação rápida (“${quickWin.title}”) pode começar antes da prioridade estrutural porque leva ${quickWin.action.effortHours.toLowerCase()}, não depende de “${structural.title.toLowerCase()}” e reduz uma perda que acontece agora, enquanto a estrutura é montada.`
      : undefined;

  return { ordered, structural, quickWin, investigation, quickWinRationale, avoidNow: avoidNow(ctx) };
}

function avoidNow(c: FindingCtx): { decision: string; why: string }[] {
  const { a } = c;
  const out: { decision: string; why: string }[] = [];
  const weakMeasure = neverAdvertised(a) || weakOrigin(a) || is(a, 'acompanhamento_compras', 'so_compras', 'nao_acompanha', 'nao_sei');
  if (marginStatus(c.calc) === 'acima_da_margem')
    out.push({ decision: 'Aumentar o investimento nas campanhas atuais', why: 'Pelos números informados, o custo de mídia por cliente supera a margem por venda.' });
  else if (weakMeasure)
    out.push({ decision: 'Aumentar o orçamento antes de saber quais vendas vieram da mídia', why: 'Sem essa informação, não há como saber se mais verba trará mais vendas.' });
  if (c.restricted.has('capacidade') || is(a, 'b_capacidade', 'limitada') || is(a, 'b_agenda_capacidade', 'lotada'))
    out.push({ decision: 'Buscar mais volume de contatos agora', why: 'A capacidade de atender está limitada; mais contatos podem ficar sem resposta.' });
  if (is(a, 'rotina_testes', 'nao_testa', 'eventual') || neverAdvertised(a))
    out.push({ decision: 'Mudar público, oferta e orçamento ao mesmo tempo', why: 'Com várias mudanças juntas não dá para saber qual delas funcionou.' });
  if (out.length < 3 && is(a, 'gestor', 'agencia', 'freelancer') && is(a, 'dor', 'numeros_confusos'))
    out.push({ decision: 'Trocar de gestor ou agência antes de alinhar indicadores por escrito', why: 'Sem critérios combinados, a troca repete o problema.' });
  return out.slice(0, 3);
}
