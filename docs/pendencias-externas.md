# Configurações externas pendentes

Nada abaixo foi testado contra serviços reais: este ambiente não tem acesso de rede a OpenAI, Netlify Blobs nem provedor de pagamento, e não há credenciais. **O site publicado continua em modo demonstração** (`VITE_APP_MODE=demo`, `APP_MODE=demo` em `netlify.toml`). Nesse modo as funções do servidor respondem “indisponível na demonstração” e nada é cobrado.

## 1. Decisões do responsável (bloqueiam a produção)

| Item | Por quê |
|---|---|
| Pagamento pela **Cakto** | Checkout do Plano: `https://pay.cakto.com.br/4jcq93j_1257574` (R$ 67,90 + taxa de serviço de R$ 0,99 do comprador, a decidir). Webhook recebido pelo gateway `workers/gateway` (Cloudflare Worker), que confere `X-Cakto-Signature` conforme docs.cakto.com.br e repassa ao site. Falta publicar o Worker e configurar as variáveis da seção 2.2. |
| Credenciais e webhook do **Mercado Pago** (em espera) | Adaptador implementado (`netlify/functions/_lib/mercadopago.ts`), testado só com respostas simuladas. Falta configurar a aplicação no painel e as variáveis abaixo. Ver seção 2.1. |
| Afirmação “mais de 45 contas ativas” | Fica em `src/content/pending.ts` com `confirmed: false` e não aparece no site. |
| Foto de Robson e credenciais verificáveis | Mesma pendência; a seção mostra espaço reservado. |
| Preço anterior de R$ 149,00 riscado | Removido até haver fundamento comercial documentado. |
| Prazo do Diagnóstico com Especialista | Hoje: “informado antes do pagamento”. Configurar `VITE_SPECIALIST_DEADLINE`. |
| Canal de suporte | `VITE_SUPPORT_CONTACT` (site) e `SUPPORT_CONTACT` (servidor). |
| Materiais da metodologia | Instruções do GPT atual, metodologia, exemplos de bons relatórios, regras de negócio, tom. Entram em `buildSystemPrompt(materials)`; nada foi inventado. **Um link de GPT personalizado não pode ser chamado pela API**: as instruções precisam ser copiadas como texto. |
| Revisão final de privacidade e termos para produção | O texto atual descreve o fluxo real, mas está marcado como rascunho. |
| Modelo da OpenAI e limites de custo | Escolher `OPENAI_MODEL` medindo qualidade e custo com os perfis de `src/domain/profiles.ts`. Não fixei um modelo. |

## 2. Variáveis de ambiente na Netlify (servidor)

| Variável | Uso |
|---|---|
| `APP_MODE` | `production` ou `test` (padrão `demo`) |
| `PUBLIC_BASE_URL` | URL pública do site (para disparar a função de geração) |
| `OPENAI_API_KEY` | Chave da OpenAI — **só no painel da Netlify, nunca no código nem no chat** |
| `OPENAI_MODEL` | Modelo escolhido |
| `OPENAI_MAX_OUTPUT_TOKENS`, `OPENAI_TIMEOUT_MS`, `OPENAI_MAX_ATTEMPTS` | Limites (padrões 12000, 120000 ms, 2; tentativas no máximo 3) |
| `PAYMENT_PROVIDER` | `mercadopago` ou `hmac_generico` (padrão; usado nos testes) |
| `MP_ACCESS_TOKEN` | Token de acesso da aplicação do Mercado Pago — **só no painel da Netlify** |
| `MP_WEBHOOK_SECRET` | Assinatura secreta dos webhooks do Mercado Pago |
| `PAYMENT_WEBHOOK_SECRET`, `PAYMENT_SIGNATURE_HEADER` | Só para `hmac_generico` |
| `PAYMENT_REF_PARAM`, `CHECKOUT_URL_PLANO`, `CHECKOUT_URL_ESPECIALISTA` | Só para `hmac_generico` (link fixo + referência do pedido) |
| `PRICE_CENTS_PLANO`, `PRICE_CENTS_ESPECIALISTA` | Valores esperados (padrões 6790 e 19700) |
| `DOWNLOAD_SIGNING_SECRET` | Assinatura dos links de download |
| `INTERNAL_TASK_SECRET` | Autoriza a chamada interna da função de geração |
| `ALLOW_DETERMINISTIC_FALLBACK` | `true` para entregar o plano por regras se a IA falhar (padrão: não; o pedido vai para “falha” com mensagem honesta) |

Site (build): `VITE_APP_MODE=production`, `VITE_SUPPORT_CONTACT`, `VITE_SPECIALIST_DEADLINE`.

### 2.2 Cakto + Meta (gateway em `workers/gateway`)

Netlify (servidor): `PAYMENT_PROVIDER` vazio (genérico), `CHECKOUT_URL_PLANO=https://pay.cakto.com.br/4jcq93j_1257574`, `PAYMENT_REF_PARAM=callback`, `PAYMENT_WEBHOOK_SECRET` = mesmo valor de `SITE_WEBHOOK_SECRET` no Worker.
Netlify (site): `VITE_CAPI_URL` = URL do Worker (ex.: `https://rdt-gateway.<conta>.workers.dev`).
Worker: configuração em `wrangler.toml` (raiz); ver `workers/gateway/README.md` (`CAKTO_WEBHOOK_SECRET`, `SITE_WEBHOOK_SECRET`, `META_CAPI_TOKEN` como segredos).
Cakto: webhook para `<Worker>/cakto/webhook` com `purchase_approved`, `purchase_refused`, `refund` e `chargeback`; pixel `2018578222100683` + token da API de Conversões no produto (InitiateCheckout e Purchase saem de lá). Opcional: pedir à Cakto o redirect pós-pagamento para `https://diagnostico.relatoriorda.com.br/pedido/{{callback}}`.

### 2.1 Mercado Pago (Checkout Pro, em espera)

Conferido no SDK oficial `mercadopago` 3.6.1, porque a documentação do Mercado Pago não abre a partir deste ambiente.

- **Criação do pagamento:** `POST /checkout/preferences` com `external_reference` = id do pedido, item com o preço esperado e retorno para `/pedido/<id>`. No modo `test` o site usa `sandbox_init_point`.
- **Webhook:** URL `<site>/.netlify/functions/payment-webhook`, evento **Pagamentos**. O aviso só é aceito com `x-signature` válido: `v1` = HMAC-SHA256 da assinatura secreta sobre `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`, com no máximo 10 minutos de diferença.
- **Estado do pagamento:** nunca é lido do aviso. O servidor consulta `GET /v1/payments/<id>` com o token e libera só `approved`, com o valor esperado e `live_mode` igual ao ambiente (teste não libera produção). `refunded` e `charged_back` encerram o pedido.

## 3. Infraestrutura

- **Netlify Blobs**: store `relatorio-do-trafego`, criada no primeiro uso. As chaves são separadas por ambiente (`test/…`, `production/…`).
- **Funções**: `netlify/functions/*.mts`. A geração roda em segundo plano (`generate-plan-background`). O empacotamento foi verificado localmente com esbuild; a implantação real não foi testada.
- **Domínio**: `diagnostico.relatoriorda.com.br` (registro CNAME `diagnostico` → `relatoriodotrafego.netlify.app`). Com o domínio ativo, usar `PUBLIC_BASE_URL=https://diagnostico.relatoriorda.com.br` e apontar os webhooks de pagamento para ele.

## 4. Antes de ligar a produção

1. Rodar em `APP_MODE=test` com as credenciais e as contas de teste do Mercado Pago.
2. Usar a simulação de webhook do painel e um pagamento de teste aprovado, recusado e repetido, e conferir os estados.
3. Gerar planos com os 9 perfis de `profiles.ts` e o modelo escolhido; ler os PDFs e registrar custo e tempo por relatório.
4. Conferir que o e-mail não aparece nos logs da OpenAI (`store: false` está ativo nas chamadas).
5. Só então trocar para `production`.

## 5. Fase posterior (não implementado)

- Upload de prints e relatórios: tipo, tamanho, retenção e exclusão; conteúdo tratado como evidência, nunca como instrução.
- Leitura automática de URLs: bloqueio de endereços locais e internos e sem execução de scripts.
- Envio por e-mail ou WhatsApp.
- Painel interno real com autenticação.
- Upgrade do Plano para o Especialista.
