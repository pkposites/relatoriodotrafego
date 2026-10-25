# Testes e resultados

Comandos: `npm test` · `npm run build` (inclui checagem de tipos) · `npm run samples && npm run check:pdf`.

**Resultado em 25/10/2026: 72 testes passando em 4 arquivos; build sem erros; 3 PDFs aprovados.**

| Arquivo | Testes | Cobre |
|---|---|---|
| `src/domain/domain.test.ts` | 20 | Telas (12 para quem anuncia, 10 para quem não anuncia), ramificações por caminho, descarte de respostas que deixam de se aplicar, leitura de números no padrão brasileiro, divisão por zero, ausência ≠ zero, ressalvas de margem e coorte, contradições sem correção silenciosa, “não sei” fora da nota, não se aplica, prontidão sem nota, travas, frase de confiança, determinismo, potencial comercial separado, ordem e dependências da priorização |
| `src/domain/acceptance.test.ts` | 18 | Perfis 1–9: critérios gerais (plano válido, evidências, indicadores só calculados, não acessado, ≤ 3 prioridades) + específicos: serviço local com resposta lenta; e-commerce com API de Conversões ligada ao evento; B2B com coortes; quem não anuncia; só Google Pesquisa; números desconhecidos; dados contraditórios e zeros; pouco tempo e sem verba; texto que tenta instruir a IA |
| `src/ai/ai.test.ts` | 16 | Esquema estrito (`additionalProperties=false`, todos os campos obrigatórios); validador rejeita número sem origem, promessa, alegação de acesso, referência inventada, API de Conversões sem evento, ação vaga, escala com medição fraca (aceita negação), mais de 3 prioridades; prompt versionado sem materiais inventados; entrada sem dados de contato; geração com cliente simulado (sucesso, nova tentativa com feedback, recusa, erro de API) |
| `netlify/functions/_lib/orders.test.ts` | 18 | Perfil 10: configuração ausente; webhook (assinatura válida, ausente, errada ou de outro corpo; Kiwify recusado até ser confirmado); pedido com contato separado; diagnóstico incompleto; **notificação duplicada**; **pagamento recusado**; valor divergente; pedido desconhecido; token errado; fluxo completo até PDF válido e link assinado com validade; “pronto” só com PDF válido; **falha da IA** com tentativas limitadas e mensagem honesta; fallback só quando autorizado; geração idempotente sob chamadas concorrentes (1 chamada à IA); recuperação; e-mail fora da entrada da IA |

## No navegador (Playwright, build de produção em modo demo)

Roteiro completo:
- Landing → quiz pelo celular (390 px) → link inválido recusado → "Voltar" preserva respostas → resultado.
- Resultado: frase de confiança composta, sem “confiança alta”, com a explicação da ação rápida e o link marcado como não acessado.
- Checkout de demonstração → simulação de pagamento → aprofundamento com contradição (vendas > contatos) mostrada sem bloquear → plano gerado → **PDF baixado (88 KB)** → avaliação de utilidade.
- Amostra, painel e campo de WhatsApp na consultoria.

Teclado: a primeira pergunta pode ser respondida com Tab + Espaço e o quiz avança.

Largura: 12 rotas em 360, 390, 768 e 1280 px, **sem rolagem horizontal**. Nenhum erro no console e nenhuma requisição externa.

## Não testado (exige serviços externos)

- Chamada real à OpenAI e qualidade da redação gerada.
- Netlify Blobs real.
- Webhook real do provedor.
- Implantação das funções.

Ver `docs/pendencias-externas.md`.
