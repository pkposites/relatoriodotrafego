import type { Plan, PlanId } from '../types';

export const PLANS: Plan[] = [
  {
    id: 'express',
    name: 'Diagnóstico Express com IA',
    price: 'R$ 59,90',
    priceNote: 'pagamento único',
    tagline: 'Relatório personalizado em PDF, gerado a partir das suas respostas.',
    features: [
      'Análise personalizada baseada nas respostas fornecidas',
      'PDF com os cinco pilares, três gargalos priorizados e plano de ação para 7 dias',
      'Entrega digital via WhatsApp após pagamento confirmado (versão futura)',
    ],
    excludes: ['Sem revisão humana', 'Sem acesso às suas contas de anúncio'],
    cta: 'Quero meu diagnóstico em PDF',
    href: '/checkout-demo?plano=express',
  },
  {
    id: 'especialista',
    name: 'Diagnóstico com Especialista',
    price: 'R$ 179,90',
    priceNote: 'pagamento único',
    tagline: 'Tudo do Express, com revisão humana e conversa por mensagens.',
    features: [
      'Tudo do Diagnóstico Express',
      'Revisão humana do seu caso',
      'Análise complementar de materiais e métricas que você enviar voluntariamente',
      'Conversa por mensagens com especialista em janela combinada no WhatsApp',
      'Ações personalizadas por prioridade',
    ],
    excludes: ['Não inclui videoconferência garantida'],
    cta: 'Quero análise com especialista',
    href: '/checkout-demo?plano=especialista',
    highlight: 'Orientação individual',
  },
  {
    id: 'consultoria',
    name: 'Consultoria estratégica com Robson',
    price: 'Sob proposta',
    priceNote: 'sem cobrança na conversa inicial',
    tagline: 'Para quem quer avaliar um acompanhamento estratégico individual.',
    features: [
      'Breve conversa inicial e qualificação, sem compromisso ou cobrança',
      'Avaliação da adequação do atendimento ao seu caso',
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

/** Reservado para fase futura: upgrade Express → Especialista. Não implementado. */
export const FUTURE_UPGRADE_DIFF = 'R$ 120,00';
