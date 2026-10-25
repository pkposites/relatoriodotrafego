import { PILLARS, getOptionLabel } from '../data/questions';
import type { Answers, Insight, OptionalMetricsInput, PillarId, PillarResult, Report } from '../types';
import { computeMetrics } from './metrics';
import { computeScore } from './scoring';

type InsightBuilder = (a: Answers) => Omit<Insight, 'pillar'>;

const declared = (q: string, a: Answers) => {
  const label = getOptionLabel(q, a[q as keyof Answers]);
  return label ? `Você respondeu: “${label}”.` : 'Sem resposta para esta área.';
};

/** Lacunas por pilar: fato declarado, hipótese (linguagem probabilística) e ação sugerida. */
const GAP: Record<PillarId, InsightBuilder> = {
  mensuracao: (a) => ({
    title: 'Clareza sobre quais vendas vêm dos anúncios',
    declared: declared('q5', a),
    hypothesis:
      a.q5 === 'so_leads'
        ? 'É provável que as decisões estejam baseadas em volume de contatos, sem saber quais campanhas geram vendas de fato.'
        : a.q8 === 'pagina_sem_medir'
          ? 'Pode haver conversões acontecendo no site sem registro, o que dificulta saber o que otimizar.'
          : 'Sem uma ligação clara entre anúncio e venda, campanhas boas e ruins podem estar recebendo o mesmo tratamento.',
    action:
      'Defina uma forma simples de marcar a origem de cada venda (ex.: perguntar “como nos conheceu?” e registrar) e revise esse número toda semana.',
  }),
  rentabilidade: (a) => ({
    title: 'Custo por cliente comparado à margem',
    declared: declared('q11', a),
    hypothesis:
      a.q11 === 'sem_margem'
        ? 'Você já conhece o custo por cliente; sem compará-lo à margem, pode ser difícil saber se escalar o investimento é seguro.'
        : 'Sem saber quanto custa conquistar um cliente, há risco de manter campanhas cujo retorno não cobre a margem — ou de cortar as que funcionam.',
    action:
      'Calcule o custo por cliente do último mês (investimento ÷ clientes vindos de anúncios) e compare com a margem média de uma venda.',
  }),
  estrategia: (a) => ({
    title: 'Destino do clique e coerência do processo',
    declared: declared('q8', a),
    hypothesis:
      a.q8 === 'whats_sem_processo'
        ? 'Levar o clique ao WhatsApp pode funcionar bem; sem um processo definido, parte dos contatos tende a esfriar antes da resposta.'
        : a.q8 === 'nao_sabe'
          ? 'Sem saber para onde o clique vai, fica difícil avaliar se a campanha e a página/atendimento estão alinhados.'
          : a.q8 === 'pagina_sem_medir'
            ? 'A página pode estar convertendo melhor ou pior do que parece; sem medição, a estratégia é ajustada no escuro.'
            : 'O caminho entre anúncio, destino e acompanhamento pode ter pontos desconectados que reduzem o aproveitamento.',
    action:
      'Desenhe em uma folha o caminho completo: anúncio → destino → primeiro contato → venda. Marque onde não há registro ou responsável.',
  }),
  criativos: (a) => ({
    title: 'Rotina de testes de criativos',
    declared: declared('q10', a),
    hypothesis:
      a.q10 === 'quando_piora'
        ? 'Testar só quando o resultado cai costuma gerar reações tardias; criativos se desgastam antes de os números mostrarem.'
        : a.q10 === 'nao_sabe'
          ? 'Não há informação suficiente sobre testes — evidência limitada nesta área.'
          : 'Sem testes regulares, é comum depender de poucos anúncios e ter dificuldade para saber o que gera interesse.',
    action:
      'Reserve um teste por semana: uma nova abordagem (gancho, oferta ou formato) contra o anúncio atual, anotando o que aprendeu.',
  }),
  conversao: (a) => ({
    title: 'Acompanhamento do contato até a venda',
    declared: declared('q9', a),
    hypothesis:
      a.q4 === 'nao_fecha'
        ? 'Você relatou que recebe contatos mas fecha pouco; parte do gargalo pode estar no atendimento e no acompanhamento, não só no anúncio.'
        : 'Sem registro das etapas, contatos podem ficar sem retorno e fica difícil saber em que ponto as vendas se perdem.',
    action:
      'Crie uma lista simples (planilha ou CRM gratuito) com status de cada contato: novo, em conversa, proposta, fechado, perdido.',
  }),
};

const STRENGTH: Record<PillarId, string> = {
  mensuracao: 'Você declarou acompanhar a origem das vendas — isso permite decisões com mais segurança.',
  rentabilidade: 'Você acompanha o custo por cliente, base importante para decidir quando investir mais.',
  estrategia: 'O caminho do clique parece ter destino definido, o que facilita medir e otimizar.',
  criativos: 'Há uma rotina de testes, o que ajuda a renovar anúncios antes do desgaste.',
  conversao: 'Os contatos são acompanhados de forma organizada até a venda.',
};

const PAIN_CONTEXT: Record<string, string> = {
  poucos_leads: 'Você citou poucos contatos como principal problema. Antes de aumentar o investimento, vale confirmar se o destino do clique e os criativos estão bem resolvidos.',
  nao_fecha: 'Você citou dificuldade em fechar vendas. Nem todo gargalo começa no anúncio — atendimento e acompanhamento entram na análise.',
  custo_alto: 'Você citou custo alto. Comparar o custo por cliente com a margem ajuda a separar “caro” de “inviável”.',
  inconsistente: 'Você citou resultados inconsistentes. Rotina de testes e registro de aprendizado costumam trazer mais estabilidade.',
  nao_sabe: 'Você disse que não consegue saber o que funciona. Mensuração é o primeiro passo para todas as outras melhorias.',
};

/** Ordena pilares do mais frágil ao mais forte; empate → maior peso estratégico primeiro. */
export function rankGaps(pillars: PillarResult[]): PillarResult[] {
  return [...pillars].sort((x, y) => x.score - y.score || y.weight - x.weight);
}

export function buildReport(answers: Answers, metricsInput?: OptionalMetricsInput): Report {
  const score = computeScore(answers, metricsInput);
  const ranked = rankGaps(score.pillars);
  const gaps: Insight[] = ranked.slice(0, 3).map((p) => ({ pillar: p.id, ...GAP[p.id](answers) }));

  const best = [...score.pillars].sort((x, y) => y.score - x.score || y.weight - x.weight)[0];
  const strength =
    best && best.score >= 60
      ? { title: PILLARS[best.id].name, text: STRENGTH[best.id] }
      : {
          title: 'Disposição para entender os números',
          text: 'Você reservou alguns minutos para avaliar a operação. Essa clareza é o ponto de partida para priorizar melhorias.',
        };

  return {
    score,
    mainGap: gaps[0],
    gaps,
    strength,
    firstStep: gaps[0].action,
    painContext: answers.q4 ? PAIN_CONTEXT[answers.q4] : undefined,
    metrics: computeMetrics(metricsInput),
  };
}
