# Pontuação, cálculos e priorização — `pontuacao/3.0.0`

Código: `src/domain/scoring.ts`, `src/domain/calculations.ts`, `src/domain/findings.ts`. Tudo é determinístico e coberto por testes.

## Quatro dimensões separadas

| Dimensão | O que mede | Onde aparece |
|---|---|---|
| **Maturidade declarada** (0–100) | Práticas declaradas nas respostas. Só para quem anuncia ou anunciou. | Resultado gratuito e plano |
| **Cobertura das informações** | Respostas definidas ÷ campos de pontuação aplicáveis. `boa` ≥ 85% · `parcial` ≥ 60% · `limitada` | Frase de confiança |
| **Confiabilidade das métricas** | Indicadores informados com precisão × estimados. `sem_metricas` · `estimadas` · `mistas` · `precisas` | Frase de confiança |
| **Potencial comercial** (interno) | Orçamento, dor, gestão e interesse. `src/domain/commercial.ts` | Só no painel; **nenhuma função de pontuação importa esse módulo** (há teste) |

Em vez de “confiança alta”, o resultado mostra uma frase composta, por exemplo: *“Boa cobertura operacional; análise financeira limitada por falta de vendas atribuídas.”*

## Pilares e pesos

| Pilar | Peso | Respostas que contam (peso da evidência) |
|---|---|---|
| Medição de resultados | 30 | `vendas_origem` (1) · `acompanhamento_compras` (0,8) · `acompanhamento_agenda` (0,4) · `acompanhamento_contatos` (0,4) · `qualificacao` (0,3) |
| Atendimento e conversão | 25 | `tempo_resposta` (1) · `acompanhamento_contatos` (0,8) · `acompanhamento_agenda` (1) · `lembretes` (0,5) · `qualificacao` (1) · `tempo_primeiro_contato` (0,8) · `acompanhamento_compras` (0,6) |
| Rotina de gestão | 20 | `rotina_analise` (1) · `rotina_testes` (0,8) |
| Clareza financeira | 15 | `margem_faixa` (1) · `ticket_faixa` (0,4) · `margem_tipo` (0,3) |
| Oferta | 10 | `oferta` (1) |

Os valores de cada opção estão em `SCORE_MAP` (por exemplo, `vendas_origem`: registrada 100 · estimativa 55 · só contatos 30 · não acompanha 5).

## Regras

- **“Não sei” fica fora da nota** e reduz a cobertura: é lacuna de gestão, não prova de falha técnica. Exceção: em Clareza financeira, que mede justamente se o número é conhecido, “não sei” vale 15 (margem) ou 20 (ticket).
- **Não se aplica não penaliza**: campos de outro caminho de venda não entram no cálculo.
- Não há bônus automático por automação, volume de anúncios ou quantidade de formatos.
- **Nota do pilar** = média ponderada das respostas aplicáveis. Fica `null` se não houver evidência.
- **Maturidade** = média dos pilares ponderada por peso × cobertura do pilar. Fica `null` se a cobertura ponderada for < 40.
- **Travas**: só são registradas quando de fato cortam pontos.
  - Primeira resposta em mais de um dia → Atendimento ≤ 30.
  - Vendas não acompanhadas → maturidade ≤ 50.
- **Faixas**: 0–39 muitos pontos de atenção · 40–59 alto potencial de melhoria · 60–79 em desenvolvimento · 80–100 relativamente organizada.
- **Quem ainda não anuncia**: avaliação de preparação com 6 itens (`pronto` · `parcial` · `pendente`), sem nota.

## Cálculos (`calculate`)

Só rodam com dados compatíveis, nunca dividem por zero e não tratam ausência de dado como zero.

| Indicador | Fórmula | Condição | Ressalva |
|---|---|---|---|
| CPL | investimento ÷ contatos | ambos > 0 | — |
| Custo de mídia por cliente | investimento ÷ vendas | ambos > 0 | Não é o CAC completo; ciclo longo → coortes |
| Conversão contato → venda | vendas ÷ contatos | vendas ≤ contatos | Ciclo longo → coortes diferentes |
| Qualificação | qualificados ÷ contatos | qualificados ≤ contatos | — |
| Comparecimento | comparecimentos ÷ agendamentos | comparecimentos ≤ agendamentos | — |
| Fechamento de propostas | vendas ÷ propostas | vendas ≤ propostas | Ciclo longo → coortes |
| Receita estimada | vendas × ticket | sem receita informada | Marcada como estimada |
| ROAS | receita ÷ investimento | ambos > 0 | Não é lucro; ciclo longo → coortes |
| ROAS de equilíbrio | 1 ÷ margem | margem conhecida | Diz qual definição de margem foi usada (contribuição, bruta ou não especificada) e se veio do ponto médio da faixa |
| Margem por venda | ticket × margem | ticket e margem | Aproximada |
| Custo ÷ margem | custo de mídia por cliente ÷ margem por venda | ambos | > 100%: a primeira venda não paga a mídia |

Não há LTV: faltam dados para isso. A precisão de cada cálculo é `estimado` sempre que alguma entrada for estimada.

**Contradições** viram perguntas e não bloqueiam o fluxo:
- vendas > contatos;
- comparecimentos > agendamentos;
- qualificados > contatos;
- receita ≠ vendas × ticket (fora de 0,5–2×);
- período invertido;
- investimento do período fora da faixa mensal declarada;
- “não acompanho a origem” junto com vendas exatas.

## Priorização (`prioritize`)

`pontuação = gravidade × 10 + força da evidência − esforço − conflito com restrição × 6 + 1 se o pilar coincide com a prioridade declarada`

- Força da evidência: `calculado` 5 · `declarado` 4 · `lacuna` 2.
- Esforço: `baixo` 0 · `medio` 3 · `alto` 6.
- A prioridade declarada só desempata: desejo não é evidência.
- **Dependências**: um achado com `after` vem depois dos citados. Exemplo: medir compras antes de discutir margem.
- **Prioridade estrutural** = primeiro achado do tipo `estrutural`. **Ação rápida** = primeiro `rapida` de esforço baixo. **Próxima investigação** = primeiro `investigacao`.
- Quando a ação rápida é diferente da estrutural, o sistema explica por que ela pode vir antes. Isso resolve o problema relatado em que “custo vs margem” aparecia como ponto principal e “velocidade de atendimento” como primeiro passo, sem explicação.
- Não há impacto financeiro numérico estimado.
- **O que evitar agora**: até 3 itens, só ligados ao caso. Exemplo: aumentar orçamento sem saber quais vendas vieram da mídia.

## Achados (18 regras em `findings.ts`)

Origem das vendas · resposta lenta · controle de contatos · evento de compra e checkout (API de Conversões sempre ligada a evento, origem e implementação) · comparecimento · lembretes · qualificação · margem desconhecida · custo acima da margem · margem apertada · frete · rotina de análise · gestão sem visibilidade · testes (variam por canal, material e verba) · oferta · objetivo da campanha · termos e negativas no Google Pesquisa · contradições · números ausentes · orçamento de teste (quem não anuncia).

Cada achado traz: fato, evidências, hipótese, consequência possível, como confirmar e a ação completa (o que, por quê, como, responsável, esforço, dependências, critério de conclusão, indicador e quando revisar).
