import type { MethodologyMaterials } from './prompt';

/**
 * Método do responsável (Robson), enviado como texto. Entra no prompt da IA,
 * sempre abaixo das regras de segurança. Vazio = a IA usa só as regras do sistema.
 * Um link de GPT personalizado não pode ser chamado pela API: cole aqui o conteúdo.
 */
export const METHOD_MATERIALS: MethodologyMaterials = {
  gptInstructions: '',
  methodology: '',
  businessRules: '',
  toneAndVocabulary: '',
  goodReportExamples: [],
};
