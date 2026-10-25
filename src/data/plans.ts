import type { Plan, PlanId } from '../types';

export const PLANS: Plan[] = [
  {
    id: 'express',
    name: 'Diagnóstico Express com IA',
    price: 'R$ 59,90',
    priceNote: 'pagamento único',
    tagline: 'IA especializada em tráfego pago, configurada com a metodologia de um gestor com mais de 45 contas ativas.',
    features: [
      'Análise automática e personalizada a partir das suas respostas',
      'Critérios de análise de quem gerencia mais de 45 contas de anúncio ativas',
      'PDF com os cinco pilares, três gargalos priorizados e plano de ação para 7 dias',
      'Entrega digital após pagamento confirmado (versão futura)',
    ],
    excludes: ['Sem revisão humana', 'Sem acesso às suas contas de anúncio'],
    cta: 'Quero meu PDF com IA',
    href: '/checkout-demo?plano=express',
  },
  {
    id: 'especialista',
    name: 'Diagnóstico com Especialista',
    price: 'R$ 197,00',
    priceNote: 'pagamento único',
    tagline: 'Robson analisa o seu caso pessoalmente e conversa com você pelo WhatsApp.',
    features: [
      'Tudo do Diagnóstico Express',
      'Análise do seu caso feita pessoalmente pelo Robson',
      'Conversa pelo WhatsApp para entender e aprofundar o seu cenário',
      'Análise de prints, relatórios e métricas que você enviar',
      'Plano de ação personalizado por prioridade',
    ],
    excludes: ['Sem chamada de vídeo', 'Sem acesso às suas contas de anúncio'],
    cta: 'Entender como funciona',
    href: '/diagnostico-especialista',
    highlight: 'Orientação individual',
  },
  {
    id: 'consultoria',
    name: 'Consultoria estratégica com Robson',
    price: 'Sob medida',
    priceNote: 'valor definido conforme o seu caso',
    tagline: 'Acompanhamento estratégico desenhado para a necessidade da sua empresa.',
    features: [
      'Breve conversa inicial e qualificação, sem compromisso ou cobrança',
      'Escopo montado sob demanda, a partir do seu caso',
      'Proposta individual com escopo e preço antes de qualquer pagamento',
      'Chamada de vídeo somente após contratação, conforme acordado',
    ],
    excludes: [],
    cta: 'Solicitar conversa inicial',
    href: '/solicitar-consultoria',
  },
];

export function getPlan(id: string | null | undefined): Plan | undefined {
  return PLANS.find((p) => p.id === (id as PlanId));
}

/** Reservado para fase futura: upgrade Express → Especialista (R$ 197,00 − R$ 59,90). Não implementado. */
export const FUTURE_UPGRADE_DIFF = 'R$ 137,10';
