# Mapa do questionário — fase-a/3.0.0 e fase-b/1.0.0

Gerado de `src/domain/questionnaire.ts` e `src/domain/deepening.ts`. Identificadores entre crases são estáveis e usados pela lógica.

## Fase A — diagnóstico gratuito

### 1. Você já tem campanhas de anúncios ativas? `s_status`
- `campanhas_status` (single): Situação das campanhas
  - Opções: `ativas` Sim, tenho campanhas ativas · `pausadas` Anunciei, mas parei · `nunca` Ainda não comecei

### 2. O que você vende e para quem? `s_negocio`
- `tipo_negocio` (single): Tipo de negócio
  - Opções: `servicos_locais` Serviços locais (saúde, estética, beleza, academia, reformas…) · `varejo_ecommerce` Loja física ou virtual (varejo / e-commerce) · `servicos_b2b` Serviços profissionais ou para empresas (B2B) · `educacao` Educação, cursos ou infoprodutos · `alto_valor` Imóveis, veículos, energia solar ou outro bem de alto valor · `outro` Outro
- `produto` (text, opcional): Produto ou serviço principal, em uma frase
- `tipo_cliente` (single): Quem compra
  - Opções: `consumidor` Consumidor final · `empresas` Empresas · `ambos` Ambos
- `regiao` (single): Região atendida
  - Opções: `local` Bairro ou cidade · `regional` Região ou estado · `nacional` Brasil todo · `internacional` Também fora do Brasil

### 3. Como a venda acontece, na maioria das vezes? `s_venda`
- `caminho_venda` (single): Caminho da venda
  - Opções: `site` Compra direto no site ou loja virtual · `whatsapp_direct` Conversa no WhatsApp ou Direct · `formulario` Formulário, seguido de atendimento · `agendamento` Agendamento (consulta, avaliação, visita técnica) · `ligacao_visita` Ligação ou visita comercial · `outro` Outro

### 4. Quanto investe por mês e onde anuncia? `s_investimento`
- `orcamento` (single): Investimento mensal em anúncios
  - Opções: `ate_1k` Até R$ 1.000 · `1k_3k` R$ 1.001 a R$ 3.000 · `3k_10k` R$ 3.001 a R$ 10.000 · `10k_30k` R$ 10.001 a R$ 30.000 · `acima_30k` Acima de R$ 30.000 · `nao_informar` Prefiro não informar *(não sei)*
- `plataformas` (multi): Onde anuncia (pode marcar mais de um)
  - Opções: `meta` Instagram / Facebook · `google_pesquisa` Google — Pesquisa · `google_outros` Google — YouTube, Display ou Performance Max · `tiktok` TikTok · `outras` Outras · `nao_sei` Não sei *(não sei)* *(exclusiva)*
- `gestor` (single): Quem cuida das campanhas
  - Opções: `eu` Eu mesmo(a) · `funcionario` Alguém da equipe · `freelancer` Gestor de tráfego / freelancer · `agencia` Agência · `ninguem` Ninguém definido

### 5. Qual é o valor médio da venda e a margem? `s_economia`
- `ticket_faixa` (single): Valor médio de uma venda (ticket)
  - Opções: `ate_100` Até R$ 100 · `100_500` R$ 101 a R$ 500 · `500_2k` R$ 501 a R$ 2.000 · `2k_10k` R$ 2.001 a R$ 10.000 · `acima_10k` Acima de R$ 10.000 · `nao_sei` Varia muito / não sei *(não sei)*
- `ticket_exato` (number, opcional) — *condicional*: Se souber, o valor exato (R$)
- `margem_faixa` (single): Quanto sobra de cada venda, em média
  - Opções: `ate_20` Até 20% · `20_40` De 21% a 40% · `40_60` De 41% a 60% · `acima_60` Acima de 60% · `nao_sei` Não sei *(não sei)*
- `margem_tipo` (single) — *condicional*: Essa margem considera…
  - Opções: `contribuicao` Custo do produto + impostos, taxas e comissões · `bruta` Só o custo do produto ou serviço · `nao_especificada` Não sei dizer *(não sei)*

### 6. Qual é o principal problema hoje? `s_dor`
- `dor` (single): Principal problema
  - Opções: `poucos_contatos` Poucos contatos · `contatos_desqualificados` Contatos desqualificados · `contatos_nao_compram` Contatos que não compram · `custo_alto` Custo alto por resultado · `resultado_instavel` Resultado instável · `numeros_confusos` Falta de clareza dos números · `outro` Outro

### 7. Qual resultado você quer melhorar primeiro? `s_prioridade`
- `prioridade` (single): Prioridade
  - Opções: `mais_contatos` Mais contatos qualificados · `vender_mais` Vender mais com o mesmo investimento · `reduzir_custo` Reduzir o custo por cliente · `organizar_numeros` Entender e organizar os números · `avaliar_gestao` Saber se a gestão atual é adequada · `escalar` Investir mais sem perder resultado

### 8. Como você identifica as vendas geradas pelos anúncios? `s_origem`
- **Aparece:** apenas para quem anuncia ou já anunciou (oculta se “Ainda não comecei”)
- `vendas_origem` (single): Identificação das vendas
  - Opções: `registrada` Registro a origem de cada venda · `estimativa` Tenho uma estimativa · `so_contatos` Acompanho apenas os contatos, não as vendas · `nao_acompanha` Não acompanho

### 9. Como as campanhas são revisadas e testadas? `s_rotina`
- **Aparece:** apenas para quem anuncia ou já anunciou (oculta se “Ainda não comecei”)
- `rotina_analise` (single): Revisão dos resultados
  - Opções: `semanal` Toda semana · `mensal` Uma vez por mês · `quando_problema` Só quando algo dá errado · `sem_rotina` Não há rotina · `nao_sei` Não sei *(não sei)*
- `rotina_testes` (single): Testes de anúncios e abordagens
  - Opções: `regular` Testes regulares, com registro do que funcionou · `eventual` De vez em quando · `nao_testa` Não testamos · `nao_sei` Não sei *(não sei)*

### 10. Como os contatos são acompanhados até a venda? `s_conversao`
- `tempo_resposta` (single) — *condicional*: Tempo da primeira resposta, em horário comercial
  - Opções: `ate_5min` Até 5 minutos · `ate_1h` Até 1 hora · `mesmo_dia` No mesmo dia · `mais_dia` Mais de um dia, ou às vezes fica sem resposta · `nao_sei` Não sei *(não sei)*
- `acompanhamento_contatos` (single) — *condicional*: Registro dos contatos até a venda
  - Opções: `crm` CRM ou etiquetas com etapas e follow-up · `planilha` Planilha atualizada manualmente · `so_conversa` Só pelas conversas, sem registro · `nenhum` Não há acompanhamento
- `acompanhamento_compras` (single) — *condicional*: O que você consegue ver das compras
  - Opções: `compras_e_etapas` Compras e etapas (carrinho, início do checkout) · `so_compras` Só o total de compras · `nao_acompanha` Não acompanho a origem das compras · `nao_sei` Não sei *(não sei)*
- `acompanhamento_agenda` (single) — *condicional*: O que é registrado
  - Opções: `comparecimento_e_fechamento` Agendamentos, comparecimentos e fechamentos · `so_agendamentos` Só os agendamentos · `nao_acompanha` Não há registro
- `lembretes` (single) — *condicional*: Lembrete antes do horário marcado
  - Opções: `sim` Enviamos lembrete · `nao` Não enviamos · `nao_sei` Não sei *(não sei)*
- `qualificacao` (single) — *condicional*: Qualificação dos contatos
  - Opções: `criterios_e_etapas` Critérios definidos e etapas registradas · `informal` Avaliamos caso a caso, sem registro · `nao_qualifica` Todos recebem o mesmo atendimento
- `tempo_primeiro_contato` (single) — *condicional*: Tempo até o primeiro contato
  - Opções: `ate_1h` Até 1 hora · `mesmo_dia` No mesmo dia · `mais_dia` Mais de um dia · `nao_sei` Não sei *(não sei)*

### 11. Como é a oferta anunciada? `s_oferta`
- `oferta` (single): Mensagem principal
  - Opções: `beneficio_condicao` Benefício claro e uma condição para agir (avaliação, bônus, prazo) · `apresentacao` Apresenta o produto ou serviço · `institucional` Comunicação institucional, sobre a marca · `nao_sei` Não sei *(não sei)*

### 12. Há alguma restrição importante agora? `s_restricoes`
- `restricoes` (multi): Restrições (pode marcar mais de uma)
  - Opções: `tempo` Pouco tempo disponível · `equipe` Equipe pequena ou sem ninguém para executar · `verba` Sem verba adicional · `capacidade` Capacidade de atender novos clientes limitada · `nenhuma` Nenhuma restrição a informar *(exclusiva)*
- `link` (url, opcional): Site, página ou perfil (opcional)

## Ramificações

- **Situação das campanhas** (`campanhas_status`): “Ainda não comecei” remove as telas de medição e rotina (10 telas), troca rótulos para “pretende” e gera **avaliação de preparação, sem nota**.
- **Caminho de venda** (`caminho_venda`) define a tela 10: WhatsApp/Direct → `tempo_resposta` + `acompanhamento_contatos`; site → `acompanhamento_compras`; agendamento → `acompanhamento_agenda` + `lembretes`; formulário/ligação/visita → `qualificacao` + `tempo_primeiro_contato`; outro → `acompanhamento_contatos`. Ao trocar o caminho, respostas que deixam de se aplicar são descartadas.
- **Margem**: `margem_tipo` só aparece se a margem for conhecida. **Ticket exato** só aparece se a faixa não for “não sei”.
- **Só Google Pesquisa**: rótulo de testes muda para títulos/textos/páginas; nenhuma pergunta de criativo visual.
- Telas com uma única pergunta de escolha única avançam sozinhas; telas agrupadas exigem “Continuar”.

## Fase B — aprofundamento (opcional, após a compra)

Oferece **“Gerar com o que já informei”** ou **“Adicionar contexto para melhorar meu plano”**. Nada é obrigatório; lacunas viram tarefas de levantamento.

### Negócio e oferta `b_negocio`
Frases curtas bastam. Pule o que não souber.
- `b_produto_prioritario` (text): Produto ou serviço que quer priorizar
- `b_publico` (text): Para quem quer vender
- `b_problema` (text): Que problema ele resolve
- `b_beneficio` (text): Principal benefício para o cliente
- `b_oferta_atual` (text): Oferta usada hoje nos anúncios
- `b_diferencial` (text): Diferencial percebido pelos clientes
- `b_objecao` (text): Objeção mais comum
- `b_capacidade` (single): Capacidade de atender novos clientes
- `b_ciclo` (single): Tempo médio até o cliente decidir
- `b_recompra` (single): O cliente costuma comprar de novo?
- `b_tentativas` (text): O que já tentou e o que aconteceu

### Números do período `b_numeros`
Escolha um período e informe o que souber. Marque “estimado” quando for aproximado e “não sei” quando não tiver o número — ausência nunca vira zero.
- Período (início e fim) + por métrica: valor, precisão (`exato` · `estimado` · `nao_sei` · `nao_se_aplica`) e origem (`plataforma` · `crm` · `planilha` · `sistema_vendas` · `estimativa_pessoal`). Métricas exibidas conforme o caminho de venda. Contradições aparecem como pergunta, sem bloquear.

### Caminho de conversão `b_caminho`
Só as perguntas do seu caminho de venda.
- `b_responsavel_atendimento` (single) — *conforme o caminho/canal*: Quem responde os contatos
- `b_fora_horario` (single) — *conforme o caminho/canal*: Contatos fora do horário
- `b_roteiro` (single) — *conforme o caminho/canal*: Existe roteiro de atendimento?
- `b_registro_origem` (single) — *conforme o caminho/canal*: Cada contato é registrado com a origem (anúncio, indicação…)?
- `b_follow_up` (single) — *conforme o caminho/canal*: Follow-up de quem não comprou
- `b_onde_perde` (single) — *conforme o caminho/canal*: Onde mais perde contatos
- `b_objecoes_atendimento` (text) — *conforme o caminho/canal*: Objeções frequentes no atendimento
- `b_plataforma_loja` (text) — *conforme o caminho/canal*: Plataforma da loja
- `b_frete` (single) — *conforme o caminho/canal*: Frete
- `b_pagamentos` (multi) — *conforme o caminho/canal*: Meios de pagamento
- `b_abandonos` (text) — *conforme o caminho/canal*: Principais abandonos que você conhece
- `b_reagendamento` (single) — *conforme o caminho/canal*: Política de reagendamento e faltas
- `b_agenda_capacidade` (single) — *conforme o caminho/canal*: Agenda hoje
- `b_criterios_qualificacao` (text) — *conforme o caminho/canal*: Critérios para um contato ser qualificado
- `b_motivos_perda` (text) — *conforme o caminho/canal*: Principais motivos de perda
- `b_responsaveis_etapas` (text) — *conforme o caminho/canal*: Quem cuida de cada etapa
- `b_termos_pesquisa` (single) — *conforme o caminho/canal*: Termos de pesquisa (o que as pessoas digitaram)
- `b_negativas` (single) — *conforme o caminho/canal*: Lista de palavras negativas
- `b_marca_separada` (single) — *conforme o caminho/canal*: Buscas pela sua marca em campanha separada
- `b_area_geografica` (single) — *conforme o caminho/canal*: Área geográfica das campanhas de Pesquisa

### Campanhas, anúncios e medição `b_campanhas` — oculto para quem ainda não anuncia
Só o necessário para sustentar as recomendações. “Não sei” é válido.
- `b_objetivo_campanha` (single): Objetivo principal das campanhas
- `b_evento_conversao` (text): Evento de conversão usado, se souber
- `b_qtd_campanhas` (single): Quantas campanhas ativas
- `b_distribuicao` (single): Como o orçamento é distribuído
- `b_tipos_anuncio` (multi): Tipos de anúncio usados
- `b_abordagens_testadas` (text): Abordagens e ofertas já testadas
- `b_material` (multi): Material disponível para novos anúncios
- `b_rastreamento` (multi): Medição configurada
- `b_mudancas_recentes` (text): Mudança recente importante e quando

### Execução `b_execucao`
O plano respeita estas respostas.
- `b_executor` (single): Quem vai executar o plano
- `b_tempo_semanal` (single): Tempo por semana para executar
- `b_orcamento_adicional` (single): Verba adicional disponível agora
- `b_acessos` (multi): Acessos e ferramentas disponíveis
- `b_nao_pode_mudar` (text): O que não dá para mudar agora
- `b_nivel` (single): Como prefere as orientações

