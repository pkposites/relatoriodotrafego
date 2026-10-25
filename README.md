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
| `/diagnostico` | Quiz (23 perguntas em 5 etapas + números e contexto opcionais). `?q=5` abre a pergunta 5 para edição |
| `/resultado` | Pré-diagnóstico gratuito (índice, pilares, prioridades, indicadores) |
| `/planos` | Três ofertas + comparação |
| `/diagnostico-especialista` | Página explicativa do Diagnóstico com Especialista (WhatsApp, sem chamada, sem acesso às contas) |
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

- **23 perguntas em 5 etapas** (negócio · investimento e objetivos · mensuração e sinal · campanhas e criativos · conversão e atendimento). Duas são de múltipla escolha (rastreamento e formatos de criativo).
- **Pilares (pesos):** Mensuração e sinal 25 · Eficiência e rentabilidade 25 · Estratégia de campanha 20 · Criativos e oferta 15 · Conversão e atendimento 15.
- Segmento, ticket, ciclo, orçamento, gestor, plataformas, tempo de conta, dor e objetivo **não** alteram a nota — servem para personalizar o texto, os alertas e a qualificação comercial.
- Cada opção contribui com `{ valor 0–100, peso de evidência }`; múltipla escolha soma `points` (máx. 100). "Não sei" reduz a evidência → "evidência limitada".
- **Travas realistas** (`RULES` em `src/lib/scoring.ts`): otimizar para cliques/engajamento → estratégia ≤ 35; "Impulsionar" → ≤ 40; criativos iguais há meses → ≤ 35; resposta em mais de um dia → conversão ≤ 30; custo por venda acima do lucro bruto → rentabilidade ≤ 25; sem identificar vendas e sem pixel/CAPI → índice ≤ 45; sem margem e sem custo por cliente → índice ≤ 55. **Piso:** números que comprovam folga → rentabilidade ≥ 75. Só aparecem para o usuário quando de fato mudam a nota.
- **Economia da unidade** (`src/lib/economics.ts`): margem declarada → ROAS de equilíbrio; com ticket e vendas → lucro bruto por venda vs. custo por venda. Números implausíveis geram aviso e não alimentam travas.
- **Personalização** (`src/lib/report.ts`): leitura do cenário, dica por segmento, até 4 alertas que cruzam respostas, 3 prioridades com várias variantes de hipótese/ação por pilar e primeiro passo alinhado ao objetivo declarado.
- **Pacote para a IA** (`src/lib/aiContext.ts`): JSON com todas as respostas legíveis, números, economia da unidade, notas, travas, alertas, prioridades, contexto livre e instruções. Visível em `/admin-demo` → detalhe do lead.

Pesos e regras são iniciais e ajustáveis; os testes cobrem extremos, respostas ausentes, determinismo, travas, piso, personalização e o pacote da IA.
