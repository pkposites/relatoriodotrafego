# Relatório do Tráfego

Diagnóstico de tráfego e conversão com avaliação gratuita honesta e **Plano de Ação do Tráfego** pago (R$ 67,90), opção de análise humana (R$ 197) e consultoria sob proposta.

> **Estado atual:** o site publicado roda em **modo demonstração**. Nada é cobrado, nada é enviado a servidores, e o plano da demonstração é gerado no navegador por regras, sem IA. O backend de produção está implementado e testado com simulações, mas depende das configurações em [`docs/pendencias-externas.md`](docs/pendencias-externas.md).

## Executar

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # 72 testes (domínio, aceitação, IA, pedidos)
npm run build        # checagem de tipos + build
npm run samples      # gera os 3 relatórios fictícios em docs/exemplos/
npm run check:pdf    # verifica páginas vazias e acentos dos PDFs
npm run docs:gen     # exporta prompt, esquema da IA e mapa do questionário
```

## Rotas

| Rota | Conteúdo |
|---|---|
| `/` | Landing |
| `/diagnostico` | Fase A (12 telas; `?tela=N` para editar) |
| `/resultado` | Avaliação gratuita |
| `/planos` | Plano de Ação do Tráfego + gratuito × pago |
| `/amostra` | 3 planos fictícios (HTML + PDF) |
| `/checkout?produto=plano\|especialista` | Pedido (demo: simulação rotulada) |
| `/pedido/:id` | Estados do pedido, aprofundamento (fase B), plano, download e avaliação |
| `/diagnostico-especialista`, `/solicitar-consultoria` | Atendimento humano |
| `/admin-demo` | Painel de demonstração (não existe em produção) |
| `/privacidade`, `/termos` | Texto conforme o ambiente |

## Documentação

| Documento | Conteúdo |
|---|---|
| [`docs/mudancas-v3.md`](docs/mudancas-v3.md) | Resumo das mudanças e confirmação dos problemas relatados |
| [`docs/questionario.md`](docs/questionario.md) | Mapa do questionário e ramificações |
| [`docs/contrato-dados.md`](docs/contrato-dados.md) | Contrato de dados |
| [`docs/pontuacao.md`](docs/pontuacao.md) | Pontuação, cálculos e priorização |
| [`docs/prompt-analise.v1.md`](docs/prompt-analise.v1.md) | Prompt versionado |
| [`docs/esquema-saida-ia.json`](docs/esquema-saida-ia.json) | Esquema da saída da IA |
| [`docs/template-pdf.md`](docs/template-pdf.md) | Template do PDF |
| [`docs/exemplos/`](docs/exemplos/) | 3 relatórios fictícios (PDF + JSON) |
| [`docs/testes.md`](docs/testes.md) | Testes e resultados |
| [`docs/pendencias-externas.md`](docs/pendencias-externas.md) | Configurações externas pendentes |
