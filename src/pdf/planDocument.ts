import type { Content, ContentTable, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { PlanOutput } from '../ai/outputSchema';
import { TEMPLATES } from '../domain/templates';

/**
 * Template do PDF pago (plano/1.0.0). Extensão proporcional às evidências:
 * seções sem conteúdo são omitidas ou trazem uma linha explicando a ausência.
 */

export interface PdfMeta {
  businessLabel: string;
  generatedAt: string; // ISO
  period: { start: string; end: string } | null;
  versions: { report: string; scoring: string; prompt: string; questionnaire: string };
  generation: { mode: 'deterministico' | 'ia'; model?: string };
  environment: 'demo' | 'test' | 'production';
  /** Marca d'água e aviso para relatórios fictícios. */
  sampleLabel?: string;
  supportContact?: string;
}

const C = {
  ink: '#182230',
  soft: '#475467',
  mute: '#667085',
  line: '#E4E7EC',
  brand: '#0866FF',
  brand50: '#EBF3FF',
  ok: '#067647',
  ok50: '#ECFDF3',
  warn: '#B54708',
  warn50: '#FFFAEB',
  bad: '#B42318',
  bad50: '#FEF3F2',
  canvas: '#F5F7FA',
};

const STATUS: Record<string, { label: string; fill: string; color: string }> = {
  medido: { label: 'Medido', fill: C.ok50, color: C.ok },
  estimado: { label: 'Estimado', fill: C.warn50, color: C.warn },
  desconhecido: { label: 'Desconhecido', fill: C.bad50, color: C.bad },
  nao_se_aplica: { label: 'Não se aplica', fill: C.canvas, color: C.mute },
};
const KIND: Record<string, { label: string; fill: string; color: string }> = {
  estrutural: { label: 'PRIORIDADE ESTRUTURAL', fill: C.brand50, color: C.brand },
  rapida: { label: 'AÇÃO RÁPIDA', fill: C.ok50, color: C.ok },
  investigacao: { label: 'PRÓXIMA INVESTIGAÇÃO', fill: C.warn50, color: C.warn },
};
const EFFORT: Record<string, string> = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto' };

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

const h1 = (text: string): Content => ({ text, style: 'h1', headlineLevel: 1 } as Content);
const h2 = (text: string): Content => ({ text, style: 'h2', headlineLevel: 2 } as Content);
const p = (text: string, extra: Record<string, unknown> = {}): Content => ({ text, style: 'p', ...extra } as Content);
const small = (text: string): Content => ({ text, style: 'small' });
const bullets = (items: string[]): Content => ({ ul: items.map((i) => ({ text: i, style: 'p' })), margin: [0, 2, 0, 6] });

function table(widths: (string | number)[], header: string[] | null, rows: (string | Content)[][], opts: { zebra?: boolean } = {}): ContentTable {
  const body = [
    ...(header ? [header.map((h) => ({ text: h, style: 'th' }))] : []),
    ...rows.map((r) => r.map((cell) => (typeof cell === 'string' ? { text: cell, style: 'td' } : cell))),
  ];
  return {
    table: { widths, body, headerRows: header ? 1 : 0, dontBreakRows: true },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0,
      hLineColor: () => C.line,
      paddingLeft: () => 6,
      paddingRight: () => 6,
      paddingTop: () => 4,
      paddingBottom: () => 4,
      fillColor: (i: number) => (header && i === 0 ? C.canvas : opts.zebra && i % 2 === 0 ? '#FAFBFC' : null),
    },
    margin: [0, 2, 0, 8],
  } as ContentTable;
}

function chip(text: string, fill: string, color: string): Content {
  return { table: { body: [[{ text, fontSize: 7.5, bold: true, color, margin: [2, 1, 2, 1] }]] }, layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => fill }, margin: [0, 0, 0, 4] } as Content;
}

export function buildPlanDocument(plan: PlanOutput, meta: PdfMeta): TDocumentDefinitions {
  const refs = new Map(plan.evidence_references.map((r) => [r.id, r]));
  const content: Content[] = [];
  const isSample = !!meta.sampleLabel;

  /* 1. Capa */
  content.push(
    { text: 'RELATÓRIO DO TRÁFEGO', fontSize: 9, bold: true, color: C.brand, characterSpacing: 1.5, margin: [0, 60, 0, 6] },
    { text: 'Plano de Ação do Tráfego', fontSize: 28, bold: true, color: C.ink, margin: [0, 0, 0, 8] },
    { text: meta.businessLabel, fontSize: 13, color: C.soft, margin: [0, 0, 0, 28] },
    ...(isSample ? [chip(meta.sampleLabel!, C.warn50, C.warn)] : []),
    table(['auto', '*'], null, [
      ['Data', fmtDate(meta.generatedAt)],
      ['Período analisado', meta.period ? `${fmtDate(meta.period.start)} a ${fmtDate(meta.period.end)}` : 'Sem números de período informados'],
      ['Natureza da análise', 'Respostas declaradas, números informados e cálculos feitos pelo sistema. Contas de anúncio, site e criativos não foram acessados.'],
      ['Como foi gerado', meta.generation.mode === 'ia' ? `Com apoio de IA (${meta.generation.model ?? 'modelo configurado'}), a partir de regras e cálculos do sistema e validado automaticamente.` : 'Por regras determinísticas do sistema, sem IA.'],
      ['Versões', `relatório ${meta.versions.report} · pontuação ${meta.versions.scoring} · questionário ${meta.versions.questionnaire}${meta.generation.mode === 'ia' ? ` · prompt ${meta.versions.prompt}` : ''}`],
    ]),
    { text: 'Este documento organiza hipóteses e ações a partir das informações disponíveis. Não é auditoria técnica das contas e não promete resultados.', style: 'small', margin: [0, 18, 0, 0] },
    { text: '', pageBreak: 'after' },
  );

  /* 2. Resumo executivo */
  const es = plan.executive_summary;
  content.push(
    h1('Resumo executivo'),
    table(['auto', '*'], null, [
      [{ text: 'Cenário', style: 'tdb' }, es.scenario],
      [{ text: 'Principal hipótese', style: 'tdb' }, es.main_hypothesis],
      [{ text: 'Prioridade estrutural', style: 'tdb' }, es.structural_priority],
      [{ text: 'Ação rápida', style: 'tdb' }, es.quick_win],
      [{ text: 'Principal limitação', style: 'tdb' }, es.main_limitation],
    ]),
  );

  /* 3. Mapa do caminho de conversão */
  content.push(
    h1('Mapa do caminho de conversão'),
    p('O que hoje é medido, estimado ou desconhecido em cada etapa.'),
    table(
      ['auto', 'auto', '*'],
      ['Etapa', 'Situação', 'Observação'],
      plan.conversion_map.map((s) => [{ text: s.stage, style: 'tdb' }, chip(STATUS[s.status].label, STATUS[s.status].fill, STATUS[s.status].color), s.note]),
    ),
  );

  /* 4. Painel de indicadores */
  content.push(h1('Painel de indicadores'));
  if (plan.indicators.length) {
    content.push(
      table(['*', 'auto', '*'], ['Indicador', 'Valor', 'Fórmula e ressalvas'], plan.indicators.map((i) => [{ text: i.label, style: 'tdb' }, { text: i.value, style: 'td', noWrap: true }, `${i.formula}${i.caveat ? `\n${i.caveat}` : ''}`]), { zebra: true }),
      small('Apenas indicadores calculáveis com os dados informados. Nenhum valor foi estimado pelo relatório além dos indicados como estimados.'),
    );
  } else content.push(p('Nenhum indicador pôde ser calculado com os dados informados. O plano inclui o levantamento dos números necessários.'));

  /* 5. Leitura dos pilares */
  content.push(
    h1('Leitura dos pilares'),
    table(
      ['auto', 'auto', '*', '*'],
      ['Pilar', 'Nota', 'Interpretação', 'O que confirmar'],
      plan.pillar_assessments.map((pa) => [
        { text: pa.pillar, style: 'tdb' },
        pa.score === null ? '—' : String(pa.score),
        { stack: [{ text: pa.interpretation, style: 'td' }, ...(pa.evidence_refs.length ? [{ text: `Base: ${pa.evidence_refs.map((id) => refs.get(id)?.value).filter(Boolean).join('; ')}`, style: 'small' }] : [])] },
        pa.to_confirm,
      ]),
    ),
    small('Notas de 0 a 100 refletem a maturidade declarada nas respostas, não o desempenho das campanhas.'),
  );

  /* 6. Prioridades */
  content.push(h1(plan.priorities.length === 1 ? 'Prioridade' : `As ${plan.priorities.length} prioridades`));
  if (!plan.priorities.length) content.push(p('Não houve base suficiente para definir prioridades. Comece pelo levantamento das informações indicadas nas limitações.'));
  plan.priorities.forEach((pr, i) => {
    const k = KIND[pr.kind];
    const a = pr.action;
    content.push({
      stack: [
        // Selo e título juntos: evita selo órfão no pé da página.
        { stack: [chip(k.label, k.fill, k.color), { text: `${i + 1}. ${pr.title}`, style: 'h2' }], unbreakable: true },
        table(['auto', '*'], null, [
          [{ text: 'Fato', style: 'tdb' }, pr.fact],
          [{ text: 'Hipótese', style: 'tdb' }, pr.hypothesis],
          [{ text: 'Consequência possível', style: 'tdb' }, pr.possible_consequence],
          [{ text: 'Como confirmar', style: 'tdb' }, pr.how_to_confirm],
          [{ text: 'Ação', style: 'tdb' }, { text: `${a.what}. ${a.why}`, style: 'td' }],
          [{ text: 'Como executar', style: 'tdb' }, { ol: a.how.map((s) => ({ text: s, style: 'td' })) }],
          [{ text: 'Responsável', style: 'tdb' }, a.owner],
          [{ text: 'Esforço', style: 'tdb' }, `${EFFORT[a.effort]} — ${a.effort_estimate}`],
          [{ text: 'Dependências', style: 'tdb' }, a.dependencies.length ? a.dependencies.join('; ') : 'Nenhuma'],
          [{ text: 'Concluído quando', style: 'tdb' }, a.done_criteria],
          [{ text: 'Indicador', style: 'tdb' }, a.indicator],
          [{ text: 'Revisar a decisão', style: 'tdb' }, a.review_when],
        ]),
        ...(pr.evidence_refs.length ? [small(`Evidências: ${pr.evidence_refs.map((id) => { const r = refs.get(id); return r ? `${r.label} — ${r.value}` : id; }).join(' · ')}`)] : []),
      ],
      margin: [0, 6, 0, 10],
    } as Content);
  });
  if (plan.quick_win.priority_id) content.push({ text: plan.quick_win.rationale, style: 'note' });

  /* 7. Plano de sete dias */
  content.push(
    h1('Plano de sete dias'),
    table(['auto', '*', 'auto', 'auto'], ['Quando', 'Tarefa', 'Responsável', 'Tempo'], plan.action_plan.map((t) => [{ text: t.day, style: 'tdb', noWrap: true }, t.task, t.owner, { text: `${t.minutes} min`, style: 'td', noWrap: true }]), { zebra: true }),
    { text: plan.measurement_plan.execution_vs_results_note, style: 'note' },
  );

  /* 8. Modelos */
  const tpls = plan.selected_templates.map((s) => ({ s, t: TEMPLATES[s.template_id] })).filter((x) => x.t);
  if (tpls.length) {
    content.push(h1('Modelos para usar'), small('Linhas marcadas como EXEMPLO são ilustrativas. Adapte ao seu negócio.'));
    for (const { s, t } of tpls) {
      const block: Content[] = [h2(t.title), p(`${t.purpose} ${s.reason}`)];
      if (t.columns) block.push(table(t.columns.map(() => '*'), t.columns, (t.exampleRows ?? []).map((r) => r.map((c) => c || ' '))));
      if (t.steps) block.push({ ol: t.steps.map((x) => ({ text: x, style: 'p' })), margin: [0, 2, 0, 6] });
      if (t.notes) block.push(bullets(t.notes));
      content.push({ stack: block } as Content);
    }
  }

  /* 9. O que evitar agora */
  if (plan.avoid_now.length) {
    content.push(h1('O que evitar agora'), table(['*', '*'], ['Decisão', 'Por quê'], plan.avoid_now.map((x) => [{ text: x.decision, style: 'tdb' }, x.why])));
  }

  /* 10. Próxima revisão */
  const mp = plan.measurement_plan;
  content.push(
    h1('Próxima revisão'),
    p(`Revise em ${mp.review_in_days} dias.`, { bold: true }),
    table(['*', '*'], ['O que medir', 'Como e quando'], mp.metrics.map((m) => [m.name, m.how])),
    table(['auto', '*'], null, [
      [{ text: 'Continue se', style: 'tdb' }, mp.continue_if],
      [{ text: 'Ajuste se', style: 'tdb' }, mp.adjust_if],
    ]),
  );

  /* 11. Premissas, lacunas e fontes */
  content.push(h1('Premissas, lacunas e fontes'), h2('Limitações'), bullets(plan.limitations));
  if (plan.assumptions.length) content.push(h2('Premissas e aproximações'), bullets(plan.assumptions));
  content.push(
    h2('Evidências consideradas'),
    table(['auto', '*', '*'], ['Ref.', 'Origem', 'Valor'], plan.evidence_references.map((r) => [{ text: r.id, style: 'small' }, r.label, r.value]), { zebra: true }),
    {
      text: `Se quiser uma leitura humana do seu caso, existe a opção de Diagnóstico com Especialista. Este plano foi feito para ser útil por si só.${meta.supportContact ? ` Suporte: ${meta.supportContact}.` : ''}`,
      style: 'small',
      margin: [0, 16, 0, 0],
    },
  );

  return {
    pageSize: 'A4',
    pageMargins: [48, 56, 48, 56],
    info: { title: `Plano de Ação do Tráfego — ${meta.businessLabel}`, author: 'Relatório do Tráfego', subject: 'Plano de ação', creator: `Relatório do Tráfego ${meta.versions.report}` },
    watermark: isSample ? { text: 'EXEMPLO FICTÍCIO', color: C.warn, opacity: 0.06, bold: true, angle: -35 } : undefined,
    content,
    header: (page: number) => (page === 1 ? null : { text: meta.businessLabel, alignment: 'right', fontSize: 7.5, color: C.mute, margin: [48, 24, 48, 0] }),
    footer: (page: number, pages: number) => ({
      columns: [
        { text: `Plano de Ação do Tráfego · ${meta.versions.report}${isSample ? ' · exemplo fictício' : ''}`, fontSize: 7.5, color: C.mute },
        { text: `${page} / ${pages}`, alignment: 'right', fontSize: 7.5, color: C.mute },
      ],
      margin: [48, 16, 48, 0],
    }),
    pageBreakBefore: (node: { headlineLevel?: number; startPosition: { verticalRatio: number } }) => !!node.headlineLevel && node.startPosition.verticalRatio > 0.82,
    defaultStyle: { font: 'Roboto', fontSize: 9.5, color: C.ink, lineHeight: 1.25 },
    styles: {
      h1: { fontSize: 15, bold: true, color: C.ink, margin: [0, 14, 0, 6] },
      h2: { fontSize: 11.5, bold: true, color: C.ink, margin: [0, 8, 0, 4] },
      p: { fontSize: 9.5, color: C.ink, margin: [0, 0, 0, 4] },
      small: { fontSize: 7.5, color: C.mute, margin: [0, 0, 0, 4] },
      th: { fontSize: 8, bold: true, color: C.soft },
      td: { fontSize: 9, color: C.ink },
      tdb: { fontSize: 9, bold: true, color: C.ink },
      note: { fontSize: 8.5, italics: true, color: C.soft, margin: [0, 2, 0, 8] },
    },
  } as TDocumentDefinitions;
}
