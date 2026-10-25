# Contrato de dados — `diagnostico/1.0.0`

Tipos em `src/domain/types.ts`; montagem em `src/domain/diagnostic.ts`. Exemplos reais (fictícios) em `docs/exemplos/*.diagnostico.json`.

## Princípio: seis camadas separadas

| Camada | Onde fica | Exemplo |
|---|---|---|
| 1. Respostas declaradas | `answers[]` | `{ field: "vendas_origem", status: "answered", value: "so_contatos", label: "…" }` |
| 2. Métricas informadas | `metrics.values` | `{ investimento: { value: 1800, precision: "exato", source: "plataforma" } }` |
| 3. Cálculos derivados | `calculated_metrics[]` | CPL com fórmula, entradas, precisão e ressalvas |
| 4. Evidências observadas | `evidence` | links (`informado` / `analisado`), arquivos (fase futura) |
| 5. Hipóteses | achados (`Finding.hypothesis`) e saída do plano | linguagem proporcional à evidência |
| 6. Recomendações | `Finding.action` → `priorities[].action` | o que, por quê, como, responsável, critério… |

A lógica usa **somente identificadores estáveis** (`field` e `value`). O `label` é só para exibição.

## Registro do diagnóstico (`DiagnosticRecord`)

| Campo | Descrição |
|---|---|
| `diagnostic_id` | Identificador do diagnóstico |
| `environment` | `demo` · `test` · `production` (dados reais nunca aparecem em painel público) |
| `created_at` | ISO 8601 |
| `contract_version`, `questionnaire_version`, `deepening_version`, `scoring_version`, `methodology_version`, `prompt_version`, `report_version` | Versões de cada camada (`src/domain/versions.ts`) |
| `business_profile` | Situação das campanhas, tipo de negócio, produto (texto seguro), cliente, região, orçamento, plataformas, gestor, ticket (faixa e exato), margem (faixa e definição), problema, prioridade, oferta |
| `conversion_path` | `site` · `whatsapp_direct` · `formulario` · `agendamento` · `ligacao_visita` · `outro` |
| `answers[]` | Todos os campos, com `status`: `answered` · `unknown` (“não sei”) · `not_applicable` (não se aplica ao caminho) · `missing` |
| `metrics` | `{ period: {start,end} \| null, margin_definition, values }` |
| `evidence` | `{ links: [{ url, status: "informado" \| "analisado", consideredPages? }], files: [] }` |
| `constraints[]` | `tempo` · `equipe` · `verba` · `capacidade` |
| `missing_fields[]` | Campos com “não sei” ou sem resposta |
| `contradictions[]` | `{ id, message, fields }` — perguntas de revisão, nunca correção silenciosa |
| `calculated_metrics[]` | `{ id, label, value, unit, formula, inputs, precision, caveats }` |
| `assessment` | Avaliação (ver `docs/pontuacao.md`) |

## Métricas

`MetricEntry = { value: number | null, precision, source? }`

| Situação | Representação |
|---|---|
| Valor exato | `{ value: 120, precision: "exato" }` |
| Estimativa | `{ value: 120, precision: "estimado" }` |
| Zero real | `{ value: 0, precision: "exato" }` |
| Não sei | `{ value: null, precision: "nao_sei" }` |
| Não se aplica | `{ value: null, precision: "nao_se_aplica" }` |
| Não informado | chave ausente |

Unidades: `BRL`, `quantidade`, `percentual`. Todas as métricas usam o mesmo `period`. Origem: `plataforma`, `crm`, `planilha`, `sistema_vendas`, `estimativa_pessoal`.

## Dados de contato

Ficam **fora** do diagnóstico:
- Compra: e-mail gravado em `{env}/contacts/{orderId}`, separado do pedido.
- Consultoria: `ConsultingRequest.contact` (em demonstração, só no navegador).

A entrada da IA é montada só a partir do diagnóstico (`src/ai/modelInput.ts`) e um teste garante que o e-mail não aparece nela.

## Textos livres

São tratados como **conteúdo não confiável**:
- Vão isolados em `conteudo_do_cliente_nao_confiavel`, com caracteres de controle removidos e limite de tamanho.
- Texto com cara de instrução, endereço ou código (`looksLikeInstruction`) é substituído por um aviso e nunca é reproduzido no relatório.
- Links são **registrados como “informado” e nunca acessados** nesta versão. O servidor não faz requisições a URLs fornecidas pelo usuário.

## Pedido (servidor) — `netlify/functions/_lib/orders.ts`

`Order` guarda:
- `id`, `env`, `product`, `status` e `tokenHash` (o token de acesso nunca é armazenado em claro);
- `expectedCents`, `diagnostic { id, answers, links }`, `deepening`, `metrics`;
- `paymentEventIds[]`, `generation { runs, lockUntil, mode, model, promptVersion, warnings, lastError }`;
- `pdfKey`, `message` e `history[]`.

Estados: `aguardando_pagamento` → `aguardando_informacoes` → `gerando` → `concluido` | `falha`.
