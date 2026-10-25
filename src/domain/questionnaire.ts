import type { Answers, Field, FieldOption, RawValue, Screen } from './types';

/**
 * Fase A — diagnóstico gratuito (ver docs/questionario.md).
 * 12 telas para quem já anuncia; 10 para quem ainda não começou.
 * Identificadores de campos e opções são estáveis: a lógica nunca usa o texto.
 */

/* ------------------------------ helpers ------------------------------ */

export const str = (a: Answers, id: string): string | undefined => {
  const v = a[id];
  if (Array.isArray(v)) return v[0];
  return typeof v === 'string' ? v : undefined;
};
export const list = (a: Answers, id: string): string[] => {
  const v = a[id];
  return Array.isArray(v) ? v : typeof v === 'string' ? [v] : [];
};
export const num = (a: Answers, id: string): number | undefined => (typeof a[id] === 'number' ? (a[id] as number) : undefined);
export const is = (a: Answers, id: string, ...opts: string[]) => opts.includes(str(a, id) ?? '');

/** Texto livre com cara de instrução para a IA, URL ou código: nunca é reproduzido no relatório. */
export function looksLikeInstruction(text: string): boolean {
  return /(ignore|desconsidere|esqueça)\s+(todas\s+)?(as\s+)?(instru|regras)|prompt|system\s*:|assistant\s*:|<\/?script|https?:\/\/|\{\{|revele|aja como|você agora é/i.test(text);
}
export const safeText = (a: Answers, id: string): string | undefined => {
  const v = str(a, id)?.trim();
  return v && !looksLikeInstruction(v) ? v : undefined;
};
export const suspiciousTextFields = (a: Answers): string[] =>
  Object.keys(a).filter((k) => (k === 'produto' || k.startsWith('b_')) && typeof a[k] === 'string' && looksLikeInstruction(String(a[k])));

export const neverAdvertised = (a: Answers) => str(a, 'campanhas_status') === 'nunca';
export const advertises = (a: Answers) => is(a, 'campanhas_status', 'ativas', 'pausadas');
const path = (a: Answers) => str(a, 'caminho_venda');
export const searchOnly = (a: Answers) => {
  const p = list(a, 'plataformas');
  return p.length > 0 && p.every((x) => x === 'google_pesquisa');
};

const UNKNOWN: FieldOption = { id: 'nao_sei', label: 'Não sei', unknown: true };

/* ------------------------------ telas ------------------------------ */

export const SCREENS: Screen[] = [
  {
    id: 's_status',
    stage: 'Perfil',
    title: 'Você já tem campanhas de anúncios ativas?',
    subtitle: 'Isso define que tipo de avaliação faz sentido para você.',
    fields: [
      {
        id: 'campanhas_status',
        kind: 'single',
        label: 'Situação das campanhas',
        options: [
          { id: 'ativas', label: 'Sim, tenho campanhas ativas' },
          { id: 'pausadas', label: 'Anunciei, mas parei' },
          { id: 'nunca', label: 'Ainda não comecei' },
        ],
      },
    ],
    note: (a) =>
      neverAdvertised(a)
        ? 'Sem problemas: você vai receber uma avaliação de preparação, sem nota de campanhas.'
        : undefined,
  },
  {
    id: 's_negocio',
    stage: 'Perfil',
    title: 'O que você vende e para quem?',
    fields: [
      {
        id: 'tipo_negocio',
        kind: 'single',
        label: 'Tipo de negócio',
        options: [
          { id: 'servicos_locais', label: 'Serviços locais (saúde, estética, beleza, academia, reformas…)' },
          { id: 'varejo_ecommerce', label: 'Loja física ou virtual (varejo / e-commerce)' },
          { id: 'servicos_b2b', label: 'Serviços profissionais ou para empresas (B2B)' },
          { id: 'educacao', label: 'Educação, cursos ou infoprodutos' },
          { id: 'alto_valor', label: 'Imóveis, veículos, energia solar ou outro bem de alto valor' },
          { id: 'outro', label: 'Outro' },
        ],
      },
      {
        id: 'produto',
        kind: 'text',
        label: 'Produto ou serviço principal, em uma frase',
        optional: true,
        maxLength: 160,
        placeholder: 'Ex.: instalação de energia solar para proprietários de imóveis em Campinas',
      },
      {
        id: 'tipo_cliente',
        kind: 'single',
        label: 'Quem compra',
        options: [
          { id: 'consumidor', label: 'Consumidor final' },
          { id: 'empresas', label: 'Empresas' },
          { id: 'ambos', label: 'Ambos' },
        ],
      },
      {
        id: 'regiao',
        kind: 'single',
        label: 'Região atendida',
        options: [
          { id: 'local', label: 'Bairro ou cidade' },
          { id: 'regional', label: 'Região ou estado' },
          { id: 'nacional', label: 'Brasil todo' },
          { id: 'internacional', label: 'Também fora do Brasil' },
        ],
      },
    ],
  },
  {
    id: 's_venda',
    stage: 'Perfil',
    title: 'Como a venda acontece, na maioria das vezes?',
    subtitle: 'É o caminho depois que a pessoa demonstra interesse.',
    fields: [
      {
        id: 'caminho_venda',
        kind: 'single',
        label: 'Caminho da venda',
        options: [
          { id: 'site', label: 'Compra direto no site ou loja virtual' },
          { id: 'whatsapp_direct', label: 'Conversa no WhatsApp ou Direct' },
          { id: 'formulario', label: 'Formulário, seguido de atendimento' },
          { id: 'agendamento', label: 'Agendamento (consulta, avaliação, visita técnica)' },
          { id: 'ligacao_visita', label: 'Ligação ou visita comercial' },
          { id: 'outro', label: 'Outro' },
        ],
      },
    ],
  },
  {
    id: 's_investimento',
    stage: 'Investimento',
    title: (a) => (neverAdvertised(a) ? 'Quanto pretende investir e onde?' : 'Quanto investe por mês e onde anuncia?'),
    subtitle: 'Valores aproximados bastam. O orçamento não altera a avaliação.',
    fields: [
      {
        id: 'orcamento',
        kind: 'single',
        label: (a) => (neverAdvertised(a) ? 'Investimento mensal pretendido' : 'Investimento mensal em anúncios'),
        options: (a) => [
          { id: 'ate_1k', label: 'Até R$ 1.000' },
          { id: '1k_3k', label: 'R$ 1.001 a R$ 3.000' },
          { id: '3k_10k', label: 'R$ 3.001 a R$ 10.000' },
          { id: '10k_30k', label: 'R$ 10.001 a R$ 30.000' },
          { id: 'acima_30k', label: 'Acima de R$ 30.000' },
          neverAdvertised(a)
            ? { id: 'nao_definido', label: 'Ainda não defini', unknown: true }
            : { id: 'nao_informar', label: 'Prefiro não informar', unknown: true },
        ],
      },
      {
        id: 'plataformas',
        kind: 'multi',
        label: (a) => (neverAdvertised(a) ? 'Onde pretende anunciar (pode marcar mais de um)' : 'Onde anuncia (pode marcar mais de um)'),
        options: [
          { id: 'meta', label: 'Instagram / Facebook' },
          { id: 'google_pesquisa', label: 'Google — Pesquisa' },
          { id: 'google_outros', label: 'Google — YouTube, Display ou Performance Max' },
          { id: 'tiktok', label: 'TikTok' },
          { id: 'outras', label: 'Outras' },
          { id: 'nao_sei', label: 'Não sei', unknown: true, exclusive: true },
        ],
      },
      {
        id: 'gestor',
        kind: 'single',
        label: (a) => (neverAdvertised(a) ? 'Quem vai cuidar das campanhas' : 'Quem cuida das campanhas'),
        options: [
          { id: 'eu', label: 'Eu mesmo(a)' },
          { id: 'funcionario', label: 'Alguém da equipe' },
          { id: 'freelancer', label: 'Gestor de tráfego / freelancer' },
          { id: 'agencia', label: 'Agência' },
          { id: 'ninguem', label: 'Ninguém definido' },
        ],
      },
    ],
  },
  {
    id: 's_economia',
    stage: 'Números',
    title: 'Qual é o valor médio da venda e a margem?',
    subtitle: 'Faixas aproximadas bastam. Não sabe? Sem problemas.',
    fields: [
      {
        id: 'ticket_faixa',
        kind: 'single',
        label: 'Valor médio de uma venda (ticket)',
        options: [
          { id: 'ate_100', label: 'Até R$ 100' },
          { id: '100_500', label: 'R$ 101 a R$ 500' },
          { id: '500_2k', label: 'R$ 501 a R$ 2.000' },
          { id: '2k_10k', label: 'R$ 2.001 a R$ 10.000' },
          { id: 'acima_10k', label: 'Acima de R$ 10.000' },
          { ...UNKNOWN, label: 'Varia muito / não sei' },
        ],
      },
      {
        id: 'ticket_exato',
        kind: 'number',
        label: 'Se souber, o valor exato (R$)',
        optional: true,
        placeholder: 'Ex.: 850',
        visible: (a) => !is(a, 'ticket_faixa', 'nao_sei'),
      },
      {
        id: 'margem_faixa',
        kind: 'single',
        label: 'Quanto sobra de cada venda, em média',
        help: 'Margem é o que sobra do preço depois de pagar o custo do produto ou serviço. Ex.: vende por R$ 100 e gasta R$ 60 → margem de 40%.',
        options: [
          { id: 'ate_20', label: 'Até 20%' },
          { id: '20_40', label: 'De 21% a 40%' },
          { id: '40_60', label: 'De 41% a 60%' },
          { id: 'acima_60', label: 'Acima de 60%' },
          UNKNOWN,
        ],
      },
      {
        id: 'margem_tipo',
        kind: 'single',
        label: 'Essa margem considera…',
        visible: (a) => !!str(a, 'margem_faixa') && !is(a, 'margem_faixa', 'nao_sei'),
        options: [
          {
            id: 'contribuicao',
            label: 'Custo do produto + impostos, taxas e comissões',
            hint: 'margem de contribuição',
          },
          { id: 'bruta', label: 'Só o custo do produto ou serviço', hint: 'margem bruta' },
          { id: 'nao_especificada', label: 'Não sei dizer', unknown: true },
        ],
      },
    ],
  },
  {
    id: 's_dor',
    stage: 'Situação',
    title: (a) => (neverAdvertised(a) ? 'O que mais preocupa para começar a anunciar?' : 'Qual é o principal problema hoje?'),
    fields: [
      {
        id: 'dor',
        kind: 'single',
        label: 'Principal problema',
        options: (a) =>
          neverAdvertised(a)
            ? [
                { id: 'nao_sabe_comecar', label: 'Não sei por onde começar' },
                { id: 'medo_perder_dinheiro', label: 'Medo de investir e não ter retorno' },
                { id: 'nao_sabe_quanto', label: 'Não sei quanto investir' },
                { id: 'sem_tempo', label: 'Falta de tempo ou de quem cuide' },
                { id: 'outro', label: 'Outro' },
              ]
            : [
                { id: 'poucos_contatos', label: 'Poucos contatos' },
                { id: 'contatos_desqualificados', label: 'Contatos desqualificados' },
                { id: 'contatos_nao_compram', label: 'Contatos que não compram' },
                { id: 'custo_alto', label: 'Custo alto por resultado' },
                { id: 'resultado_instavel', label: 'Resultado instável' },
                { id: 'numeros_confusos', label: 'Falta de clareza dos números' },
                { id: 'outro', label: 'Outro' },
              ],
      },
    ],
    note: (a) =>
      is(a, 'dor', 'contatos_nao_compram')
        ? 'Vamos olhar também o atendimento: nem todo gargalo começa no anúncio.'
        : undefined,
  },
  {
    id: 's_prioridade',
    stage: 'Situação',
    title: 'Qual resultado você quer melhorar primeiro?',
    subtitle: 'É a sua prioridade — usamos para ordenar o plano, não como prova do problema.',
    fields: [
      {
        id: 'prioridade',
        kind: 'single',
        label: 'Prioridade',
        options: (a) => [
          ...(neverAdvertised(a) ? [{ id: 'comecar_certo', label: 'Começar a anunciar com segurança' }] : []),
          { id: 'mais_contatos', label: 'Mais contatos qualificados' },
          { id: 'vender_mais', label: 'Vender mais com o mesmo investimento' },
          { id: 'reduzir_custo', label: 'Reduzir o custo por cliente' },
          { id: 'organizar_numeros', label: 'Entender e organizar os números' },
          ...(advertises(a)
            ? [
                { id: 'avaliar_gestao', label: 'Saber se a gestão atual é adequada' },
                { id: 'escalar', label: 'Investir mais sem perder resultado' },
              ]
            : []),
        ],
      },
    ],
  },
  {
    id: 's_origem',
    stage: 'Medição',
    title: 'Como você identifica as vendas geradas pelos anúncios?',
    visible: (a) => !neverAdvertised(a),
    fields: [
      {
        id: 'vendas_origem',
        kind: 'single',
        label: 'Identificação das vendas',
        options: [
          { id: 'registrada', label: 'Registro a origem de cada venda' },
          { id: 'estimativa', label: 'Tenho uma estimativa' },
          { id: 'so_contatos', label: 'Acompanho apenas os contatos, não as vendas' },
          { id: 'nao_acompanha', label: 'Não acompanho' },
        ],
      },
    ],
  },
  {
    id: 's_rotina',
    stage: 'Medição',
    title: 'Como as campanhas são revisadas e testadas?',
    subtitle: 'Se outra pessoa cuida, responda o que você sabe — “não sei” é uma resposta válida.',
    visible: (a) => !neverAdvertised(a),
    fields: [
      {
        id: 'rotina_analise',
        kind: 'single',
        label: 'Revisão dos resultados',
        options: [
          { id: 'semanal', label: 'Toda semana' },
          { id: 'mensal', label: 'Uma vez por mês' },
          { id: 'quando_problema', label: 'Só quando algo dá errado' },
          { id: 'sem_rotina', label: 'Não há rotina' },
          UNKNOWN,
        ],
      },
      {
        id: 'rotina_testes',
        kind: 'single',
        label: (a) => (searchOnly(a) ? 'Testes de anúncios (títulos, textos, páginas)' : 'Testes de anúncios e abordagens'),
        options: [
          { id: 'regular', label: 'Testes regulares, com registro do que funcionou' },
          { id: 'eventual', label: 'De vez em quando' },
          { id: 'nao_testa', label: 'Não testamos' },
          UNKNOWN,
        ],
      },
    ],
  },
  {
    id: 's_conversao',
    stage: 'Atendimento',
    title: (a) =>
      ({
        whatsapp_direct: 'Como funciona o atendimento no WhatsApp ou Direct?',
        site: 'Como você acompanha as compras no site?',
        agendamento: 'Como você acompanha os agendamentos?',
        formulario: 'Como os contatos do formulário são tratados?',
        ligacao_visita: 'Como os contatos são tratados até a venda?',
      })[path(a) ?? ''] ?? 'Como os contatos são acompanhados até a venda?',
    fields: [
      // WhatsApp / Direct
      {
        id: 'tempo_resposta',
        kind: 'single',
        label: 'Tempo da primeira resposta, em horário comercial',
        visible: (a) => is(a, 'caminho_venda', 'whatsapp_direct'),
        options: [
          { id: 'ate_5min', label: 'Até 5 minutos' },
          { id: 'ate_1h', label: 'Até 1 hora' },
          { id: 'mesmo_dia', label: 'No mesmo dia' },
          { id: 'mais_dia', label: 'Mais de um dia, ou às vezes fica sem resposta' },
          UNKNOWN,
        ],
      },
      {
        id: 'acompanhamento_contatos',
        kind: 'single',
        label: 'Registro dos contatos até a venda',
        visible: (a) => is(a, 'caminho_venda', 'whatsapp_direct', 'outro'),
        options: [
          { id: 'crm', label: 'CRM ou etiquetas com etapas e follow-up' },
          { id: 'planilha', label: 'Planilha atualizada manualmente' },
          { id: 'so_conversa', label: 'Só pelas conversas, sem registro' },
          { id: 'nenhum', label: 'Não há acompanhamento' },
        ],
      },
      // Site
      {
        id: 'acompanhamento_compras',
        kind: 'single',
        label: 'O que você consegue ver das compras',
        visible: (a) => is(a, 'caminho_venda', 'site'),
        options: [
          { id: 'compras_e_etapas', label: 'Compras e etapas (carrinho, início do checkout)' },
          { id: 'so_compras', label: 'Só o total de compras' },
          { id: 'nao_acompanha', label: 'Não acompanho a origem das compras' },
          UNKNOWN,
        ],
      },
      // Agendamento
      {
        id: 'acompanhamento_agenda',
        kind: 'single',
        label: 'O que é registrado',
        visible: (a) => is(a, 'caminho_venda', 'agendamento'),
        options: [
          { id: 'comparecimento_e_fechamento', label: 'Agendamentos, comparecimentos e fechamentos' },
          { id: 'so_agendamentos', label: 'Só os agendamentos' },
          { id: 'nao_acompanha', label: 'Não há registro' },
        ],
      },
      {
        id: 'lembretes',
        kind: 'single',
        label: 'Lembrete antes do horário marcado',
        visible: (a) => is(a, 'caminho_venda', 'agendamento'),
        options: [
          { id: 'sim', label: 'Enviamos lembrete' },
          { id: 'nao', label: 'Não enviamos' },
          UNKNOWN,
        ],
      },
      // Formulário / ligação / visita (venda consultiva)
      {
        id: 'qualificacao',
        kind: 'single',
        label: 'Qualificação dos contatos',
        visible: (a) => is(a, 'caminho_venda', 'formulario', 'ligacao_visita'),
        options: [
          { id: 'criterios_e_etapas', label: 'Critérios definidos e etapas registradas' },
          { id: 'informal', label: 'Avaliamos caso a caso, sem registro' },
          { id: 'nao_qualifica', label: 'Todos recebem o mesmo atendimento' },
        ],
      },
      {
        id: 'tempo_primeiro_contato',
        kind: 'single',
        label: 'Tempo até o primeiro contato',
        visible: (a) => is(a, 'caminho_venda', 'formulario', 'ligacao_visita'),
        options: [
          { id: 'ate_1h', label: 'Até 1 hora' },
          { id: 'mesmo_dia', label: 'No mesmo dia' },
          { id: 'mais_dia', label: 'Mais de um dia' },
          UNKNOWN,
        ],
      },
    ],
  },
  {
    id: 's_oferta',
    stage: 'Oferta',
    title: (a) => (neverAdvertised(a) ? 'Como você pretende apresentar a oferta?' : 'Como é a oferta anunciada?'),
    fields: [
      {
        id: 'oferta',
        kind: 'single',
        label: 'Mensagem principal',
        options: [
          { id: 'beneficio_condicao', label: 'Benefício claro e uma condição para agir (avaliação, bônus, prazo)' },
          { id: 'apresentacao', label: 'Apresenta o produto ou serviço' },
          { id: 'institucional', label: 'Comunicação institucional, sobre a marca' },
          UNKNOWN,
        ],
      },
    ],
  },
  {
    id: 's_restricoes',
    stage: 'Execução',
    title: 'Há alguma restrição importante agora?',
    subtitle: 'O plano respeita o que você consegue executar.',
    fields: [
      {
        id: 'restricoes',
        kind: 'multi',
        label: 'Restrições (pode marcar mais de uma)',
        options: [
          { id: 'tempo', label: 'Pouco tempo disponível' },
          { id: 'equipe', label: 'Equipe pequena ou sem ninguém para executar' },
          { id: 'verba', label: 'Sem verba adicional' },
          { id: 'capacidade', label: 'Capacidade de atender novos clientes limitada' },
          { id: 'nenhuma', label: 'Nenhuma restrição a informar', exclusive: true },
        ],
      },
      {
        id: 'link',
        kind: 'url',
        label: 'Site, página ou perfil (opcional)',
        optional: true,
        placeholder: 'https://',
        help: 'Usado como contexto. Nesta versão o link é registrado, mas não é acessado.',
      },
    ],
  },
];

/* ------------------------------ navegação ------------------------------ */

export const resolve = <T,>(v: T | ((a: Answers) => T), a: Answers): T => (typeof v === 'function' ? (v as (a: Answers) => T)(a) : v);

export function fieldOptions(f: Field, a: Answers): FieldOption[] {
  return f.options ? resolve(f.options, a) : [];
}

export const ALL_FIELDS: Field[] = SCREENS.flatMap((s) => s.fields);
export const getField = (id: string) => ALL_FIELDS.find((f) => f.id === id);

export function visibleScreens(a: Answers): Screen[] {
  // A tela entra na contagem mesmo antes de seus campos ficarem definidos (ex.: atendimento depende do caminho de venda),
  // para o total de perguntas não mudar no meio do diagnóstico.
  return SCREENS.filter((s) => (s.visible ? s.visible(a) : true));
}

export function visibleFields(s: Screen, a: Answers): Field[] {
  return s.fields.filter((f) => (f.visible ? f.visible(a) : true));
}

/** Resposta válida para o campo (opção existente, texto ou número). */
export function isFilled(f: Field, a: Answers): boolean {
  const v = a[f.id];
  if (v === undefined || v === '') return false;
  if (f.kind === 'number') return typeof v === 'number' && Number.isFinite(v) && v >= 0;
  if (f.kind === 'text' || f.kind === 'url') return typeof v === 'string' && v.trim().length > 0;
  const ids = fieldOptions(f, a).map((o) => o.id);
  const vals = Array.isArray(v) ? v : [String(v)];
  return vals.length > 0 && vals.every((x) => ids.includes(x));
}

export function screenComplete(s: Screen, a: Answers): boolean {
  return visibleFields(s, a).every((f) => f.optional || isFilled(f, a));
}

export function isComplete(a: Answers): boolean {
  return !!str(a, 'campanhas_status') && visibleScreens(a).every((s) => screenComplete(s, a));
}

/** Remove respostas de campos que deixaram de ser visíveis (ex.: mudou o caminho de venda). */
export function pruneHidden(a: Answers): Answers {
  const out: Answers = {};
  for (const s of visibleScreens(a)) for (const f of visibleFields(s, a)) if (a[f.id] !== undefined) out[f.id] = a[f.id];
  return out;
}

export function optionLabel(fieldId: string, value: RawValue | undefined, a: Answers = {}): string | null {
  const f = getField(fieldId);
  if (!f || value === undefined) return null;
  if (f.kind === 'number') return typeof value === 'number' ? value.toLocaleString('pt-BR') : null;
  if (f.kind === 'text' || f.kind === 'url') return typeof value === 'string' && value.trim() ? value.trim() : null;
  const opts = fieldOptions(f, { ...a, [fieldId]: value });
  const ids = Array.isArray(value) ? value : [String(value)];
  const labels = ids.map((id) => opts.find((o) => o.id === id)?.label).filter(Boolean);
  return labels.length ? labels.join(', ') : null;
}

export function isUnknownAnswer(fieldId: string, a: Answers): boolean {
  const f = getField(fieldId);
  if (!f) return false;
  const opts = fieldOptions(f, a);
  return list(a, fieldId).some((id) => opts.find((o) => o.id === id)?.unknown);
}

export function fieldLabel(f: Field, a: Answers): string {
  return resolve(f.label, a);
}
