/**
 * Versões de cada camada. Toda mudança de regra, pergunta, prompt ou layout
 * do relatório deve incrementar a versão correspondente.
 */
export const VERSIONS = {
  contract: 'diagnostico/1.0.0',
  questionnaire: 'fase-a/3.0.0',
  deepening: 'fase-b/1.0.0',
  scoring: 'pontuacao/3.0.0',
  methodology: 'metodologia/1.0.0',
  prompt: 'analise/1.0.0',
  report: 'plano/1.0.0',
} as const;
