# Gateway `relatoriodotrafego` (Cloudflare Worker)

Faz duas coisas, nenhuma delas com dados pessoais no código ou no repositório:

| Rota | O que faz |
|---|---|
| `POST /cakto/webhook` | Recebe o webhook da Cakto, confere `X-Cakto-Signature` (HMAC-SHA256 de `{timestamp}.{corpo}` com o segredo do webhook, tolerância 5 min) e repassa ao site (`payment-webhook`) assinado. Se o site não responder, guarda na fila e o cron reenvia a cada 5 min por até 24 h. |
| `POST /capi/event` | Recebe do site (só com consentimento) os eventos do funil e envia à API de Conversões da Meta com o mesmo `event_id` do pixel, para a Meta deduplicar. Só nomes da lista, só a origem do site, sem e-mail, telefone ou respostas. |
| `GET /health` | Verificação simples. |

O pedido é ligado à compra pelo parâmetro `callback` do link da Cakto, que o site preenche com o id do pedido (`rdt_...`).

## Variáveis

Públicas (em `wrangler.toml`): `SITE_WEBHOOK_URL`, `ALLOWED_ORIGIN`, `META_PIXEL_ID`, `META_API_VERSION`, `META_CAPI_PURCHASE`, `CAKTO_ALLOWED_OFFERS`, `META_TEST_EVENT_CODE`.

Segredos (`npx wrangler secret put NOME`):

| Nome | De onde vem |
|---|---|
| `CAKTO_WEBHOOK_SECRET` | Gerado pela Cakto ao criar o webhook |
| `SITE_WEBHOOK_SECRET` | Uma senha longa criada por você; o **mesmo valor** vai no Netlify como `PAYMENT_WEBHOOK_SECRET` |
| `META_CAPI_TOKEN` | Gerenciador de Eventos › conjunto de dados › Configurações › API de Conversões › Gerar token |

## Publicar

Pelo GitHub (Workers Builds, já conectado): em **Settings › Builds** use
**Root directory** `workers/gateway`, **Build command** vazio e **Deploy command** `npx wrangler deploy`.
O nome em `wrangler.toml` é o mesmo do Worker no painel (`relatoriodotrafego`) e `keep_vars = true`
preserva as variáveis criadas no painel. Segredos ficam em **Settings › Variables and Secrets**.

Fila opcional: crie um KV no painel, coloque o id em `wrangler.toml` (bloco `kv_namespaces`) e publique.

Pelo terminal (alternativa):

```bash
cd workers/gateway
npx wrangler login
npx wrangler secret put CAKTO_WEBHOOK_SECRET
npx wrangler secret put SITE_WEBHOOK_SECRET
npx wrangler secret put META_CAPI_TOKEN
npx wrangler deploy
```
