/**
 * Exporta artefatos versionados direto do código (sem cópia manual):
 * prompt de sistema, esquema JSON da saída da IA e mapa do questionário.
 * Uso: npm run docs:gen
 */
import { writeFileSync } from 'node:fs';
import { PLAN_JSON_SCHEMA, PLAN_SCHEMA_NAME } from '../src/ai/outputSchema';
import { buildSystemPrompt, PROMPT_VERSION } from '../src/ai/prompt';
import { BLOCKS } from '../src/domain/deepening';
import { fieldOptions, resolve, SCREENS } from '../src/domain/questionnaire';
import type { Answers } from '../src/domain/types';
import { VERSIONS } from '../src/domain/versions';

writeFileSync('docs/prompt-analise.v1.md', `# Prompt de sistema — ${PROMPT_VERSION}\n\nGerado de \`src/ai/prompt.ts\`. Os materiais da metodologia entram em seções próprias quando fornecidos (hoje: nenhum).\n\n\`\`\`text\n${buildSystemPrompt()}\n\`\`\`\n`);
writeFileSync('docs/esquema-saida-ia.json', JSON.stringify({ name: PLAN_SCHEMA_NAME, strict: true, schema: PLAN_JSON_SCHEMA }, null, 2));

const ctxs: [string, Answers][] = [['ativas', { campanhas_status: 'ativas' }], ['nunca', { campanhas_status: 'nunca' }]];
let md = `# Mapa do questionário — ${VERSIONS.questionnaire} e ${VERSIONS.deepening}\n\nGerado de \`src/domain/questionnaire.ts\` e \`src/domain/deepening.ts\`. Identificadores entre crases são estáveis e usados pela lógica.\n\n## Fase A — diagnóstico gratuito\n\n`;
SCREENS.forEach((s, i) => {
  md += `### ${i + 1}. ${resolve(s.title, ctxs[0][1])} \`${s.id}\`\n`;
  if (s.visible) md += `- **Aparece:** ${s.visible({ campanhas_status: 'nunca' }) ? 'para todos' : 'apenas para quem anuncia ou já anunciou (oculta se “Ainda não comecei”)'}\n`;
  for (const f of s.fields) {
    const cond = f.visible ? ' — *condicional*' : '';
    md += `- \`${f.id}\` (${f.kind}${f.optional ? ', opcional' : ''})${cond}: ${resolve(f.label, ctxs[0][1])}\n`;
    const opts = fieldOptions(f, ctxs[0][1]);
    if (opts.length) md += `  - Opções: ${opts.map((o) => `\`${o.id}\` ${o.label}${o.unknown ? ' *(não sei)*' : ''}${o.exclusive ? ' *(exclusiva)*' : ''}`).join(' · ')}\n`;
  }
  md += '\n';
});
md += `## Ramificações\n\n- **Situação das campanhas** (\`campanhas_status\`): “Ainda não comecei” remove as telas de medição e rotina (10 telas), troca rótulos para “pretende” e gera **avaliação de preparação, sem nota**.\n- **Caminho de venda** (\`caminho_venda\`) define a tela 10: WhatsApp/Direct → \`tempo_resposta\` + \`acompanhamento_contatos\`; site → \`acompanhamento_compras\`; agendamento → \`acompanhamento_agenda\` + \`lembretes\`; formulário/ligação/visita → \`qualificacao\` + \`tempo_primeiro_contato\`; outro → \`acompanhamento_contatos\`. Ao trocar o caminho, respostas que deixam de se aplicar são descartadas.\n- **Margem**: \`margem_tipo\` só aparece se a margem for conhecida. **Ticket exato** só aparece se a faixa não for “não sei”.\n- **Só Google Pesquisa**: rótulo de testes muda para títulos/textos/páginas; nenhuma pergunta de criativo visual.\n- Telas com uma única pergunta de escolha única avançam sozinhas; telas agrupadas exigem “Continuar”.\n\n## Fase B — aprofundamento (opcional, após a compra)\n\nOferece **“Gerar com o que já informei”** ou **“Adicionar contexto para melhorar meu plano”**. Nada é obrigatório; lacunas viram tarefas de levantamento.\n\n`;
for (const b of BLOCKS) {
  md += `### ${b.title} \`${b.id}\`${b.visible ? ' — oculto para quem ainda não anuncia' : ''}\n${b.intro}\n`;
  if (b.id === 'b_numeros') md += '- Período (início e fim) + por métrica: valor, precisão (`exato` · `estimado` · `nao_sei` · `nao_se_aplica`) e origem (`plataforma` · `crm` · `planilha` · `sistema_vendas` · `estimativa_pessoal`). Métricas exibidas conforme o caminho de venda. Contradições aparecem como pergunta, sem bloquear.\n';
  for (const f of b.fields) md += `- \`${f.id}\` (${f.kind})${f.visible ? ' — *conforme o caminho/canal*' : ''}: ${resolve(f.label, ctxs[0][1])}\n`;
  md += '\n';
}
writeFileSync('docs/questionario.md', md);
console.log('docs gerados');
