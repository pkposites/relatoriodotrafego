/**
 * Conteúdo que depende de confirmação do responsável. Enquanto `confirmed`
 * for false, NÃO aparece no site público — só na lista de pendências do painel
 * de demonstração. Nunca publicar como prova sem confirmação.
 */
export interface PendingItem {
  id: string;
  description: string;
  value: string | null;
  confirmed: boolean;
}

export const PENDING: Record<string, PendingItem> = {
  contas_ativas: {
    id: 'contas_ativas',
    description: 'Afirmação de autoridade: “gestor com mais de 45 contas ativas”.',
    value: 'Gestor de tráfego com mais de 45 contas ativas',
    confirmed: false,
  },
  foto_robson: { id: 'foto_robson', description: 'Foto real de Robson para a seção “Quem está por trás”.', value: null, confirmed: false },
  credenciais: { id: 'credenciais', description: 'Credenciais e provas verificáveis (certificações, casos autorizados).', value: null, confirmed: false },
  preco_anterior: {
    id: 'preco_anterior',
    description: 'Preço anterior riscado (R$ 149,00). Removido até haver fundamento comercial documentado.',
    value: 'R$ 149,00',
    confirmed: false,
  },
  prazo_especialista: { id: 'prazo_especialista', description: 'Prazo de entrega do Diagnóstico com Especialista.', value: null, confirmed: false },
  politicas_finais: { id: 'politicas_finais', description: 'Aviso de privacidade e termos revisados para produção (servidor, IA, pagamento, armazenamento).', value: null, confirmed: false },
};

export const confirmed = (id: keyof typeof PENDING) => (PENDING[id].confirmed ? PENDING[id].value : null);
