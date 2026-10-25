# Relatório do Tráfego

Protótipo navegável do **Relatório do Tráfego** (marca-mãe: Relatório RDA · Qvn Ads): landing page, quiz de 12 perguntas, pré-diagnóstico calculado localmente, página de planos, checkout demonstrativo, solicitação de consultoria e painel interno de demonstração.

> **Fase atual: somente frontend.** Nenhuma integração externa — sem backend, banco, IA, pixel, analytics, checkout, WhatsApp ou cookies de rastreamento. Dados ficam apenas no `localStorage` do navegador.

## Como executar

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testes do motor de pontuação, métricas e qualificação
npm run build      # typecheck + build de produção em dist/
npm run preview    # serve o build em http://localhost:4173
```

Requer Node 18+.

## Rotas

| Rota | Conteúdo |
|---|---|
| `/` | Landing page |
| `/diagnostico` | Quiz (12 perguntas em 4 etapas + dados opcionais). `?q=5` abre a pergunta 5 para edição |
| `/resultado` | Pré-diagnóstico gratuito (índice, pilares, prioridades, indicadores) |
| `/planos` | Três ofertas + comparação |
| `/checkout-demo?plano=express\|especialista` | Simulação de contratação, sem cobrança |
| `/solicitar-consultoria` | Formulário demonstrativo da consultoria |
| `/admin-demo` | Painel interno com registros EXEMPLO + simulações LOCAIS |
| `/privacidade`, `/termos` | Rascunhos + botão para limpar dados locais |

## Estrutura

```
src/
  data/questions.ts        perguntas, opções, pilares, pesos e evidência
  data/plans.ts            planos e preços
  data/sampleLeads.ts      leads fictícios (EXEMPLO) do painel
  lib/scoring.ts           índice de maturidade (determinístico) + faixas + confiança
  lib/report.ts            lacunas (fato / hipótese / ação), ponto forte, primeiro passo
  lib/metrics.ts           CPL, CPA, conversão, receita, ROAS (só quando válidos)
  lib/leadQualification.ts potencial comercial (separado do índice técnico)
  lib/storage.ts           persistência local tolerante a falhas
  components/              layout, logo, UI base, gráficos
  pages/                   uma página por rota
docs/screenshots/          capturas em 390px e 1280px
```

## Motor de pontuação (resumo)

- Somente Q5, Q8, Q9, Q10 e Q11 pontuam. Segmento, orçamento, responsável, dores, plataforma e objetivo **não** alteram a nota.
- Cada opção contribui com `{ valor 0–100, peso de evidência }` para um ou mais pilares. Nota do pilar = média ponderada.
- Evidência do pilar = pesos obtidos ÷ pesos possíveis. Respostas "não sei" reduzem a evidência → "evidência limitada".
- Índice geral = média dos pilares ponderada por **peso estratégico × evidência** (Mensuração 25, Rentabilidade 25, Estratégia 20, Criativos 15, Conversão 15).
- Confiança = 85% evidência dos pilares + 15% contexto (orçamento informado, dados numéricos informados).
- Três prioridades = pilares de menor nota (empate → maior peso).

Os pesos são iniciais e ajustáveis em `src/data/questions.ts`; os testes cobrem extremos, respostas ausentes, determinismo e independência das perguntas de contexto.
