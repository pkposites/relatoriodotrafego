# Template do PDF — `plano/1.0.0`

Código: `src/pdf/planDocument.ts` (definição do documento) · `src/pdf/renderNode.ts` (servidor) · `src/pdf/renderBrowser.ts` (navegador, carregado sob demanda).

- **Biblioteca:** pdfmake 0.2.x, fonte Roboto embutida. Texto selecionável e acentos corretos, verificados com `pdftotext`.
- **Entrada:** o mesmo `PlanOutput` da saída da IA (`docs/esquema-saida-ia.json`). O PDF não inventa conteúdo.
- **Extensão proporcional:** seções sem conteúdo são omitidas ou trazem uma linha explicando a ausência. Os exemplos têm de 8 a 10 páginas.

| Seção | Fonte |
|---|---|
| 1. Capa | negócio, data, período, natureza da análise, como foi gerado (regras ou IA + modelo), versões |
| 2. Resumo executivo | `executive_summary` |
| 3. Mapa do caminho de conversão | `conversion_map` (medido · estimado · desconhecido · não se aplica) |
| 4. Painel de indicadores | `indicators` (valor, fórmula, ressalvas) |
| 5. Leitura dos pilares | `pillar_assessments` + evidências |
| 6. Até três prioridades | `priorities` (fato, hipótese, consequência, como confirmar, ação, passos, responsável, esforço, dependências, critério, indicador, revisão, evidências) |
| 7. Plano de sete dias | `action_plan` + nota “executar ≠ ver resultado” |
| 8. Modelos | `selected_templates` → conteúdo fixo em `src/domain/templates.ts`, com linhas de EXEMPLO |
| 9. O que evitar agora | `avoid_now` |
| 10. Próxima revisão | `measurement_plan` |
| 11. Premissas, lacunas e fontes | `limitations`, `assumptions`, `evidence_references` |
| Final | menção discreta ao especialista |

**Proteções de layout:**
- O selo e o título de cada prioridade ficam juntos, sem selo órfão no pé da página.
- Títulos não ficam isolados no fim da página.
- Linhas de tabela não se partem.

**Verificação:** `npm run check:pdf` acusa página quase vazia (descontando cabeçalho, rodapé e marca d'água) e ausência de acentos.

**Marcação:** exemplos e demonstrações levam marca d'água e rodapé “exemplo fictício” ou “demonstração”.
