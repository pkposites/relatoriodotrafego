import { AlertTriangle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { METRIC_META, detectContradictions, parseNumberInput } from '../domain/calculations';
import { BLOCKS, METRIC_FIELDS, essentialGaps, visibleBlocks } from '../domain/deepening';
import type { Answers, MarginDefinition, MetricEntry, MetricKey, MetricPrecision, MetricSource, MetricsInput, RawValue } from '../domain/types';
import { FieldInput } from './FieldInput';
import { Button, Card } from './ui';

const PRECISION: { id: MetricPrecision; label: string }[] = [
  { id: 'exato', label: 'Informado com precisão' },
  { id: 'estimado', label: 'Estimado' },
  { id: 'nao_sei', label: 'Não sei' },
  { id: 'nao_se_aplica', label: 'Não se aplica' },
];
const SOURCES: { id: MetricSource; label: string }[] = [
  { id: 'plataforma', label: 'Plataforma de anúncios' },
  { id: 'crm', label: 'CRM' },
  { id: 'planilha', label: 'Planilha' },
  { id: 'sistema_vendas', label: 'Sistema de vendas' },
  { id: 'estimativa_pessoal', label: 'Estimativa pessoal' },
];

interface Row { raw: string; precision: MetricPrecision; source?: MetricSource }

/**
 * Fase B — aprofundamento opcional, em blocos curtos e adaptativos.
 * Nada é obrigatório: "não sei" vira tarefa de levantamento no plano.
 */
export function Deepening({ answers, onSubmit }: { answers: Answers; onSubmit: (deepening: Answers, metrics: MetricsInput | undefined) => void }) {
  const [mode, setMode] = useState<'escolha' | 'formulario'>('escolha');
  const [extra, setExtra] = useState<Answers>({});
  const [period, setPeriod] = useState({ start: '', end: '' });
  const [marginDef, setMarginDef] = useState<MarginDefinition | ''>('');
  const [rows, setRows] = useState<Partial<Record<MetricKey, Row>>>({});
  const merged = { ...answers, ...extra };
  const blocks = visibleBlocks(merged);
  const metricKeys = METRIC_FIELDS.filter((m) => !m.show || m.show(merged)).map((m) => m.key);

  const metrics: MetricsInput | undefined = useMemo(() => {
    const values: Partial<Record<MetricKey, MetricEntry>> = {};
    for (const [k, r] of Object.entries(rows) as [MetricKey, Row][]) {
      if (!r) continue;
      if (r.precision === 'nao_sei' || r.precision === 'nao_se_aplica') values[k] = { value: null, precision: r.precision };
      else {
        const n = parseNumberInput(r.raw);
        if (typeof n === 'number' && n >= 0) values[k] = { value: n, precision: r.precision, source: r.source };
      }
    }
    if (!Object.keys(values).length && !period.start) return undefined;
    return { period: period.start && period.end ? period : undefined, values, marginDefinition: marginDef || undefined };
  }, [rows, period, marginDef]);

  const contradictions = detectContradictions(merged, metrics);
  const invalid = Object.entries(rows).filter(([, r]) => r && (r.precision === 'exato' || r.precision === 'estimado') && r.raw.trim() && (parseNumberInput(r.raw) === 'invalid' || (parseNumberInput(r.raw) as number) < 0)).map(([k]) => k);
  const hasMetrics = !!metrics && Object.values(metrics.values).some((v) => v?.value !== null && v?.value !== undefined);
  const gaps = essentialGaps(merged, hasMetrics);
  const setRow = (k: MetricKey, patch: Partial<Row>) => setRows((r) => ({ ...r, [k]: { raw: '', precision: 'exato', ...r[k], ...patch } }));
  const change = (id: string, v: RawValue | undefined) => setExtra((e) => { const n = { ...e, [id]: v }; if (v === undefined) delete n[id]; return n; });

  if (mode === 'escolha') {
    return (
      <Card className="p-5 sm:p-6">
        <h2 className="text-xl font-bold">Como quer gerar seu plano?</h2>
        <p className="mt-1 text-sm text-ink-soft">Já temos suas respostas do diagnóstico. Um aprofundamento curto melhora a personalização, mas é opcional.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => onSubmit({}, undefined)} className="rounded-xl border border-line p-4 text-left hover:border-brand focus-visible:ring-2">
            <p className="font-bold">Gerar com o que já informei</p>
            <p className="mt-1 text-sm text-ink-soft">O plano usa suas respostas. O que faltar vira tarefa de levantamento.</p>
          </button>
          <button type="button" onClick={() => setMode('formulario')} className="rounded-xl border-2 border-brand bg-brand-50/50 p-4 text-left focus-visible:ring-2">
            <p className="font-bold text-brand-700">Adicionar contexto para melhorar meu plano</p>
            <p className="mt-1 text-sm text-ink-soft">Blocos curtos sobre oferta, números, atendimento e execução. Pule o que não souber.</p>
          </button>
        </div>
      </Card>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (invalid.length) return;
        onSubmit(extra, metrics);
      }}
      noValidate
    >
      {blocks.map((b, bi) => (
        <Card key={b.id} className="p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-brand">Bloco {bi + 1} de {blocks.length}</p>
          <h2 className="mt-1 text-xl font-bold">{b.title}</h2>
          <p className="mt-1 text-sm text-ink-soft">{b.intro}</p>
          {b.id === 'b_numeros' ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="p-start" className="label">Início do período</label>
                  <input id="p-start" type="date" className="input" value={period.start} onChange={(e) => setPeriod((p) => ({ ...p, start: e.target.value }))} />
                </div>
                <div>
                  <label htmlFor="p-end" className="label">Fim do período</label>
                  <input id="p-end" type="date" className="input" value={period.end} onChange={(e) => setPeriod((p) => ({ ...p, end: e.target.value }))} />
                </div>
              </div>
              <p className="text-xs text-ink-mute">Todos os números abaixo devem ser do mesmo período.</p>
              {metricKeys.map((k) => {
                const r = rows[k] ?? { raw: '', precision: 'exato' as MetricPrecision };
                const disabled = r.precision === 'nao_sei' || r.precision === 'nao_se_aplica';
                return (
                  <fieldset key={k} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1.2fr_1fr_1fr_1fr] sm:items-end">
                    <legend className="sr-only">{METRIC_META[k].label}</legend>
                    <div>
                      <label htmlFor={`m-${k}`} className="label">{METRIC_META[k].label}{METRIC_META[k].unit === 'BRL' ? ' (R$)' : METRIC_META[k].unit === 'percentual' ? ' (%)' : ''}</label>
                      <input id={`m-${k}`} inputMode="decimal" className="input tabular" disabled={disabled} value={disabled ? '' : r.raw} onChange={(e) => setRow(k, { raw: e.target.value })} aria-invalid={invalid.includes(k)} />
                    </div>
                    <div>
                      <label htmlFor={`mp-${k}`} className="label text-xs">Precisão</label>
                      <select id={`mp-${k}`} className="input py-2 text-sm" value={r.precision} onChange={(e) => setRow(k, { precision: e.target.value as MetricPrecision })}>
                        {PRECISION.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor={`ms-${k}`} className="label text-xs">Origem do número</label>
                      <select id={`ms-${k}`} className="input py-2 text-sm" disabled={disabled} value={r.source ?? ''} onChange={(e) => setRow(k, { source: (e.target.value || undefined) as MetricSource | undefined })}>
                        <option value="">Não informar</option>
                        {SOURCES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </div>
                    {invalid.includes(k) && <p className="text-xs font-semibold text-bad-700 sm:col-span-4">Use apenas números positivos.</p>}
                  </fieldset>
                );
              })}
              {metricKeys.includes('margem_percentual') && (
                <div>
                  <label htmlFor="m-def" className="label">A margem informada é…</label>
                  <select id="m-def" className="input" value={marginDef} onChange={(e) => setMarginDef(e.target.value as MarginDefinition)}>
                    <option value="">Não informar</option>
                    <option value="contribuicao">Margem de contribuição (preço − custo − impostos, taxas e comissões)</option>
                    <option value="bruta">Margem bruta (preço − custo do produto ou serviço)</option>
                    <option value="nao_especificada">Não sei qual</option>
                  </select>
                </div>
              )}
              {contradictions.length > 0 && (
                <div role="status" className="space-y-2">
                  {contradictions.map((c) => (
                    <p key={c.id} className="flex gap-2 rounded-xl border border-warn bg-warn-50 p-3 text-sm text-warn-700">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {c.message} Você pode corrigir ou seguir assim — o plano vai indicar a revisão.
                    </p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-5">
              {BLOCKS.find((x) => x.id === b.id)!.fields.filter((f) => !f.visible || f.visible(merged)).map((f) => (
                <FieldInput key={f.id} field={f} answers={merged} onChange={change} compact />
              ))}
            </div>
          )}
        </Card>
      ))}
      {gaps.length > 0 && (
        <p className="rounded-xl bg-canvas p-3 text-sm text-ink-soft">
          Ainda sem: {gaps.join(', ')}. Tudo bem — o plano inclui como levantar essas informações.
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="secondary" onClick={() => setMode('escolha')}>Voltar</Button>
        <Button type="submit" size="lg" disabled={invalid.length > 0}>Gerar meu plano</Button>
      </div>
    </form>
  );
}
