/**
 * Ofertas. Sem preço riscado e sem afirmações de autoridade não confirmadas
 * (ver src/content/pending.ts).
 */
export type ProductId = 'plano' | 'especialista' | 'consultoria';

export interface Product {
  id: ProductId;
  name: string;
  price: string;
  priceNote: string;
  tagline: string;
  features: string[];
  excludes: string[];
  cta: string;
  href: string;
}

export const PRODUCTS: Record<ProductId, Product> = {
  plano: {
    id: 'plano',
    name: 'Plano de Ação do Tráfego',
    price: 'R$ 67,90',
    priceNote: 'pagamento único',
    tagline: 'Um plano específico para a sua operação: o que corrigir primeiro, como fazer, quem executa e como saber se ficou pronto.',
    features: [
      'Até 3 prioridades, cada uma ligada às suas respostas e números',
      'Ação rápida e prioridade estrutural, com a ordem explicada',
      'Passo a passo, responsável, esforço e critério de conclusão para cada ação',
      'Cálculos feitos só com os dados que você informar (com fórmulas e ressalvas)',
      'Plano de sete dias que respeita seu tempo e sua equipe',
      'Modelos prontos: registro de vendas, controle de contatos, roteiro, rotina semanal',
      'Quando revisar e o que medir depois',
    ],
    excludes: ['Sem acesso às suas contas de anúncio', 'Sem revisão humana individual'],
    cta: 'Quero meu plano de ação por R$ 67,90',
    href: '/checkout?produto=plano',
  },
  especialista: {
    id: 'especialista',
    name: 'Diagnóstico com Especialista',
    price: 'R$ 197,00',
    priceNote: 'pagamento único',
    tagline: 'Robson lê o seu caso e conversa com você pelo WhatsApp, sem chamada de vídeo e sem acesso às suas contas.',
    features: [
      'Leitura humana das suas respostas e do material que você enviar',
      'Conversa por mensagens no WhatsApp para entender o contexto',
      'Plano de ação priorizado para o seu caso',
    ],
    excludes: ['Sem chamada de vídeo', 'Sem acesso às suas contas de anúncio'],
    cta: 'Entender como funciona',
    href: '/diagnostico-especialista',
  },
  consultoria: {
    id: 'consultoria',
    name: 'Consultoria sob medida',
    price: 'Sob proposta',
    priceNote: 'escopo e valor definidos antes de qualquer pagamento',
    tagline: 'Para quem quer avaliar um acompanhamento estratégico individual.',
    features: ['Conversa inicial sem custo', 'Proposta com escopo e preço antes de qualquer pagamento'],
    excludes: [],
    cta: 'Solicitar conversa inicial',
    href: '/solicitar-consultoria',
  },
};
