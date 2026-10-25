# Mudanças da versão 3

## Problemas relatados: confirmação

Todos verificados no código da v2 antes da alteração. Os dois de lógica foram reproduzidos com teste.

| # | Problema relatado | Confirmado? | Tipo | Situação na v3 |
|---|---|---|---|---|
| 1 | Gratuito gera nota, pilares, alertas e recomendações | Sim | Produto | Gratuito reorganizado: perfil, visão geral, principal hipótese, uma ação inicial, limitações |
| 2 | Resultado já trazia 3 prioridades; a oferta repetia promessas | Sim | Produto | Prioridades detalhadas ficam no pago; o gratuito lista os demais achados só pelo título; comparação clara na página de planos |
| 3 | Checkout demonstrativo, sem pagamento | Sim | **Integração externa** | Backend pronto (pedido, webhook verificado, idempotência); falta o provedor e a forma de assinatura |
| 4 | Contratação simulada não entregava PDF | Sim | Código + integração | Demonstração gera o PDF rotulado “sem pagamento e sem IA”; produção gera no servidor após o pagamento |
| 5 | Painel local e demonstrativo, sem autenticação | Sim | Integração externa | Painel só existe em modo demo; painel real com autenticação é fase posterior |
| 6 | Espaço reservado para foto | Sim | **Decisão do responsável** | Pendência controlada em `src/content/pending.ts` |
| 7 | Privacidade e termos em rascunho | Sim | Código + revisão | Reescritos por ambiente (demo × produção); revisão final pendente |
| 8 | WhatsApp na consultoria sem campo de número | Sim | Código | **Corrigido**: WhatsApp/ligação pedem telefone com DDD; e-mail pede e-mail; contato separado do diagnóstico |
| 9 | Prazo do especialista indefinido | Sim | Decisão do responsável | Exibido só quando configurado; senão “informado antes do pagamento” |
| 10 | Ponto principal (custo × margem) diferente do primeiro passo (atendimento), sem explicação | Sim (reproduzido: rentabilidade × conversão) | Código | **Corrigido**: prioridade estrutural e ação rápida separadas, com a razão explícita |
| 11 | “Confiança alta” sem números financeiros | Sim (0,90 = alta) | Código | **Corrigido**: frase composta de cobertura operacional + análise financeira |

Encontrados na inspeção, além da lista:
- Preço riscado de R$ 149,00 em 3 lugares: removido.
- “45 contas ativas” em 4 lugares: virou conteúdo pendente.
- Na v2, “Express” trazia promessa de “IA treinada”: substituído por explicação transparente.

## O que mudou

**Questionário**
- Fase A com 12 telas (10 para quem não anuncia), ramificada pelo caminho de venda.
- Fase B opcional com 5 blocos adaptativos, métricas com precisão, origem e período, e contradições apresentadas como perguntas.

**Avaliação e cálculos**
- Avaliação v3: maturidade, cobertura, confiabilidade das métricas e potencial comercial separados.
- Prontidão para quem não anuncia.
- “Não sei” e “não se aplica” não penalizam.
- Cálculos com fórmula e ressalva, sem dividir por zero, com coortes indicadas e ROAS de equilíbrio que explicita a definição de margem.
- 18 regras de achados com ação completa, mais priorização transparente (estrutural, rápida e investigação) com dependências e restrições.

**Plano e IA**
- Plano no esquema da IA, gerado por regras (base factual e exemplos).
- Prompt versionado, entrada sem dados de contato e com texto do cliente tratado como não confiável.
- Validador de qualidade (números, referências, promessas, acesso alegado, escala, canal, API de Conversões).

**PDF**
- 11 seções, extensão proporcional às evidências.
- 3 exemplos fictícios gerados e verificados.

**Backend (Netlify Functions)**
- Pedido, webhook verificado e idempotente, estados, geração com trava e tentativas limitadas, "concluído" só com PDF válido, download assinado, eventos agregados sem dados sensíveis.
- Separação demo, teste e produção.

**Páginas**
- Landing em 10 seções.
- Planos: “Plano de Ação do Tráfego” por R$ 67,90, CTA “Quero meu plano de ação por R$ 67,90” e comparação gratuito × pago.
- Amostra, checkout, página do pedido com avaliação de utilidade e painel de demonstração.

**Instrumentação:** 13 eventos com lista fechada de propriedades. Em demonstração ficam no navegador; em produção vão para a função `events`.

## Mapa dos arquivos

| Pasta | Conteúdo |
|---|---|
| `src/domain/` | Contrato, questionário, cálculos, pontuação, achados, plano, modelos, perfis |
| `src/ai/` | Prompt, entrada, esquema, validador, geração |
| `src/pdf/` | Template e renderizadores |
| `netlify/functions/` | Backend |
| `docs/` | Esta documentação, exemplos e capturas (`docs/screenshots/v3`) |
