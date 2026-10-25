import type { Answers } from '../types';

/** Cenários extremos usados nos testes. */
export const best: Answers = {
  segmento: 'b2b', ticket: '2k_10k', margem: '40_60', ciclo: 'semanas',
  orcamento: '10k_30k', gestor: 'agencia', plataformas: 'meta_google', tempo_anuncio: 'mais_3a', dor: 'custo_alto', objetivo: 'escalar',
  vendas_origem: 'confiavel', rastreamento: ['pixel', 'capi', 'eventos', 'utm', 'crm_offline'], cac: 'ambos', analise: 'semanal',
  otimizacao: 'vendas', estrutura: 'consolidada', criativos_volume: 'mais_10', formatos: ['video_vertical', 'ugc', 'especialista', 'estatico'], testes: 'semanal', oferta: 'clara',
  destino: 'pagina_medida', tempo_resposta: 'ate_5min', acompanhamento: 'crm',
};

export const worst: Answers = {
  segmento: 'outro', ticket: 'nao_sabe', margem: 'nao_sabe', ciclo: 'dias',
  orcamento: 'ate_1k', gestor: 'ninguem', plataformas: 'meta', tempo_anuncio: 'menos_3m', dor: 'nao_sabe', objetivo: 'avaliar_gestao',
  vendas_origem: 'nao_identifica', rastreamento: ['nenhum'], cac: 'nao_sabe', analise: 'raramente',
  otimizacao: 'trafego_engajamento', estrutura: 'impulsionar', criativos_volume: 'mesmos', formatos: ['estatico'], testes: 'sem_rotina', oferta: 'institucional',
  destino: 'whats_sem_processo', tempo_resposta: 'mais_dia', acompanhamento: 'nenhum',
};
