import { FlaskConical, Trash2, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { DistributionList, toneForScore } from '../components/charts';
import { Badge, Button, Card } from '../components/ui';
import { getPlan } from '../data/plans';
import { QUESTIONS, getOptionLabel, getQuestion, single } from '../data/questions';
import { SAMPLE_LEADS } from '../data/sampleLeads';
import { formatBRL, formatDate } from '../lib/format';
import { TIER_LABEL, commercialScore } from '../lib/leadQualification';
import { buildAiContext } from '../lib/aiContext';
import { computeMetrics } from '../lib/metrics';
import { computeScore } from '../lib/scoring';
import { clearDemo, loadLocalLeads } from '../lib/storage';
import type { CommercialScore, LeadRecord, ScoreResult } from '../types';

interface Row {
  lead: LeadRecord;
  score: ScoreResult;
  commercial: CommercialScore;
}

const TIER_TONE = { alto: 'ok', medio: 'warn', baixo: 'neutral' } as const;
const PLAN_FILTER = [
  { id: '', label: 'Todos' },
  { id: 'consultoria', label: 'Consultoria' },
  { id: 'especialista', label: 'Especialista' },
  { id: 'express', label: 'Express' },
  { id: 'none', label: 'Sem plano' },
];

function short(label?: string, max = 34) {
  if (!label) return '—';
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

function distribution(rows: Row[], qid: string) {
  const q = getQuestion(qid)!;
  return q.options
    .map((o) => ({ label: o.label, count: rows.filter((r) => single(r.lead.answers, q.id) === o.id).length }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);
}

export default function AdminDemo() {
  const [locals, setLocals] = useState(() => loadLocalLeads());
  const [filters, setFilters] = useState({ budget: '', pain: '', manager: '', plan: '' });
  const [selected, setSelected] = useState<string>();
  const detailRef = useRef<HTMLDivElement>(null);

  const rows: Row[] = useMemo(
    () =>
      [...locals, ...SAMPLE_LEADS].map((lead) => ({
        lead,
        score: computeScore(lead.answers, lead.metrics),
        commercial: commercialScore(lead.answers, lead),
      })),
    [locals],
  );

  const filtered = rows.filter(({ lead }) => {
    const a = lead.answers;
    if (filters.budget && single(a, 'orcamento') !== filters.budget) return false;
    if (filters.pain && single(a, 'dor') !== filters.pain) return false;
    if (filters.manager && single(a, 'gestor') !== filters.manager) return false;
    if (filters.plan === 'none' && lead.plan) return false;
    if (filters.plan && filters.plan !== 'none' && lead.plan !== filters.plan) return false;
    return true;
  });

  const examples = rows.filter((r) => r.lead.source === 'exemplo');
  const localRows = rows.filter((r) => r.lead.source === 'local');
  const current = rows.find((r) => r.lead.id === selected);
  const completed = (r: Row) => r.score.complete;

  const select = (id: string) => {
    setSelected(id);
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-10">
      <div className="mb-5 flex items-center gap-3 rounded-2xl border-2 border-dashed border-warn bg-warn-50 p-4 text-sm text-warn-700" role="note">
        <FlaskConical className="h-6 w-6 shrink-0" aria-hidden />
        <p>
          <strong>Painel de demonstração.</strong> Sem autenticação real e sem banco de dados. Registros marcados como <strong>EXEMPLO</strong> são fictícios;
          os marcados como <strong>LOCAL</strong> são simulações feitas neste navegador.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Painel interno</h1>
          <p className="text-sm text-ink-soft">Qualificação comercial separada do índice de maturidade de marketing.</p>
        </div>
        {locals.length > 0 && (
          <Button
            variant="secondary"
            className="h-10 text-sm"
            onClick={() => {
              clearDemo();
              setLocals([]);
              setSelected(undefined);
            }}
          >
            <Trash2 className="h-4 w-4" aria-hidden /> Limpar simulações locais
          </Button>
        )}
      </div>

      {/* KPIs */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Questionários de exemplo" value={examples.length} note="Fictícios" />
        <Kpi label="Simulações locais" value={localRows.length} note={`${localRows.filter(completed).length} com diagnóstico completo`} />
        <Kpi label="Potencial comercial alto" value={rows.filter((r) => r.commercial.tier === 'alto').length} note="Exemplo + local" />
        <Kpi
          label="Índice médio de maturidade"
          value={Math.round(rows.filter(completed).reduce((s, r) => s + r.score.overall, 0) / Math.max(1, rows.filter(completed).length))}
          note="Diagnósticos completos"
        />
      </div>

      {/* Distribuições */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-bold">Por segmento</h2>
          <DistributionList items={distribution(rows, 'segmento')} total={rows.length} />
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-bold">Por orçamento</h2>
          <DistributionList items={distribution(rows, 'orcamento')} total={rows.length} />
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-bold">Por principal dor</h2>
          <DistributionList items={distribution(rows, 'dor')} total={rows.length} />
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-bold">Por plano selecionado</h2>
          <DistributionList
            items={['consultoria', 'especialista', 'express', undefined]
              .map((p) => ({ label: p ? getPlan(p)!.name : 'Nenhum plano', count: rows.filter((r) => r.lead.plan === p).length }))
              .filter((d) => d.count > 0)}
            total={rows.length}
          />
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mt-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect label="Orçamento" value={filters.budget} onChange={(v) => setFilters((f) => ({ ...f, budget: v }))} qid="orcamento" />
          <FilterSelect label="Principal dor" value={filters.pain} onChange={(v) => setFilters((f) => ({ ...f, pain: v }))} qid="dor" />
          <FilterSelect label="Gestão atual" value={filters.manager} onChange={(v) => setFilters((f) => ({ ...f, manager: v }))} qid="gestor" />
          <div>
            <label htmlFor="flt-plan" className="mb-1 block text-xs font-semibold text-ink-mute">Interesse em atendimento</label>
            <select id="flt-plan" className="input py-2 text-sm" value={filters.plan} onChange={(e) => setFilters((f) => ({ ...f, plan: e.target.value }))}>
              {PLAN_FILTER.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="min-w-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-bold">Leads <span className="font-normal text-ink-mute">({filtered.length})</span></h2>
            {Object.values(filters).some(Boolean) && (
              <button type="button" className="text-xs font-semibold text-brand" onClick={() => setFilters({ budget: '', pain: '', manager: '', plan: '' })}>
                Limpar filtros
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-[#F9FAFB] text-xs text-ink-mute">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Empresa</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Orçamento</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Plataforma</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Principal dor</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Maturidade</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Potencial comercial</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.lead.id}
                    className={`cursor-pointer border-t border-line transition-colors hover:bg-brand-50/40 ${selected === r.lead.id ? 'bg-brand-50/60' : ''}`}
                    onClick={() => select(r.lead.id)}
                  >
                    <td className="px-4 py-3">
                      <button type="button" className="text-left font-semibold hover:text-brand" onClick={(e) => { e.stopPropagation(); select(r.lead.id); }}>
                        {r.lead.company}
                      </button>
                      <div className="mt-0.5 flex items-center gap-2">
                        <SourceBadge source={r.lead.source} />
                        <span className="text-xs text-ink-mute">{formatDate(r.lead.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{short(getOptionLabel('orcamento', r.lead.answers.orcamento), 22)}</td>
                    <td className="px-4 py-3 text-ink-soft">{short(getOptionLabel('plataformas', r.lead.answers.plataformas), 26)}</td>
                    <td className="px-4 py-3 text-ink-soft">{short(getOptionLabel('dor', r.lead.answers.dor), 30)}</td>
                    <td className="px-4 py-3">
                      {r.score.complete ? <Badge tone={toneForScore(r.score.overall)}>{r.score.overall}</Badge> : <span className="text-xs text-ink-mute">Incompleto</span>}
                    </td>
                    <td className="px-4 py-3"><Badge tone={TIER_TONE[r.commercial.tier]}>{TIER_LABEL[r.commercial.tier]}</Badge></td>
                    <td className="px-4 py-3 text-ink-soft">{r.lead.status}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-ink-mute">Nenhum lead corresponde aos filtros.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div ref={detailRef} className="scroll-mt-20">
          {current ? <LeadDetail row={current} onClose={() => setSelected(undefined)} /> : (
            <Card className="grid min-h-[200px] place-items-center p-6 text-center text-sm text-ink-mute">
              Selecione um lead na tabela para ver respostas, indicadores e fatores de qualificação.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold text-ink-mute">{label}</p>
      <p className="tabular mt-1 text-3xl font-extrabold tracking-tight">{value}</p>
      <p className="text-xs text-ink-mute">{note}</p>
    </Card>
  );
}

function SourceBadge({ source }: { source: LeadRecord['source'] }) {
  return source === 'exemplo' ? (
    <span className="rounded bg-[#F2F4F7] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-ink-soft">EXEMPLO</span>
  ) : (
    <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-brand-700">LOCAL</span>
  );
}

function FilterSelect({ label, value, onChange, qid }: { label: string; value: string; onChange: (v: string) => void; qid: string }) {
  const id = `flt-${qid}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-ink-mute">{label}</label>
      <select id={id} className="input py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Todos</option>
        {getQuestion(qid)!.options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </div>
  );
}

function LeadDetail({ row, onClose }: { row: Row; onClose: () => void }) {
  const { lead, score, commercial } = row;
  const m = computeMetrics(lead.metrics);
  return (
    <Card className="anim-rise p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <SourceBadge source={lead.source} />
          <h2 className="mt-1 text-lg font-bold">{lead.company}</h2>
          <p className="text-xs text-ink-mute">{formatDate(lead.createdAt)} · {lead.status}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-ink-mute hover:bg-canvas hover:text-ink" aria-label="Fechar detalhe">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-canvas p-3">
          <p className="text-xs font-semibold text-ink-mute">Índice de maturidade</p>
          <p className="tabular text-2xl font-extrabold">{score.complete ? score.overall : '—'}</p>
          <p className="text-[11px] text-ink-mute">{score.complete ? score.band.label : 'Diagnóstico incompleto'}</p>
        </div>
        <div className="rounded-xl bg-canvas p-3">
          <p className="text-xs font-semibold text-ink-mute">Potencial comercial</p>
          <p className="tabular text-2xl font-extrabold">{commercial.score}</p>
          <p className="text-[11px] text-ink-mute">{TIER_LABEL[commercial.tier]}</p>
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-mute">Fatores do potencial comercial</h3>
        <ul className="mt-2 space-y-1.5 text-sm">
          {commercial.factors.map((f) => (
            <li key={f.label} className="flex justify-between gap-3">
              <span className="text-ink-soft">{f.label}</span>
              <span className="tabular font-semibold">+{f.points}</span>
            </li>
          ))}
          {commercial.factors.length === 0 && <li className="text-ink-mute">Sem sinais registrados.</li>}
        </ul>
        <p className="mt-2 text-[11px] text-ink-mute">Indicador de priorização, não previsão de fechamento. Não altera o índice de maturidade.</p>
      </div>

      {lead.plan && (
        <p className="mt-4 text-sm"><span className="font-semibold">Interesse:</span> {getPlan(lead.plan)?.name}</p>
      )}
      {lead.consulting && (
        <div className="mt-3 rounded-xl border border-line p-3 text-sm">
          <p><span className="font-semibold">Contato:</span> {lead.consulting.name} · {lead.consulting.channel}</p>
          <p className="text-ink-soft">Comunicações comerciais: {lead.consulting.marketingOptIn ? 'aceitas' : 'não aceitas'}</p>
          {lead.consulting.message && <p className="mt-1 text-ink-soft">“{lead.consulting.message}”</p>}
        </div>
      )}

      {m.hasAny && (
        <div className="mt-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink-mute">Indicadores informados (30 dias)</h3>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
            {lead.metrics?.investment !== undefined && <Metric k="Investimento" v={formatBRL(lead.metrics.investment)} />}
            {m.cpl !== undefined && <Metric k="CPL" v={formatBRL(m.cpl)} />}
            {m.cpa !== undefined && <Metric k="CPA" v={formatBRL(m.cpa)} />}
            {m.roas !== undefined && <Metric k="ROAS est." v={`${m.roas.toFixed(1).replace('.', ',')}x`} />}
          </dl>
        </div>
      )}

      <div className="mt-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-mute">Pilares</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {score.pillars.map((p) => (
            <li key={p.id} className="flex justify-between gap-3">
              <span className="text-ink-soft">{p.name}{p.evidenceLevel === 'limitada' ? ' · evid. limitada' : ''}</span>
              <span className="tabular font-semibold">{p.score}</span>
            </li>
          ))}
        </ul>
      </div>

      {(lead.context?.produto || lead.context?.observacoes) && (
        <div className="mt-4 rounded-xl border border-line p-3 text-sm">
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink-mute">Contexto livre</h3>
          {lead.context?.produto && <p className="mt-1"><span className="font-semibold">Produto/público:</span> {lead.context.produto}</p>}
          {lead.context?.observacoes && <p className="mt-1 text-ink-soft">{lead.context.observacoes}</p>}
        </div>
      )}

      <AiPayload lead={lead} />

      <details className="mt-4 rounded-xl border border-line">
        <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">Respostas</summary>
        <ol className="space-y-2 px-3 pb-3 text-xs">
          {QUESTIONS.map((q, i) => (
            <li key={q.id}>
              <p className="text-ink-mute">{i + 1}. {q.title}</p>
              <p className="font-semibold">{getOptionLabel(q.id, lead.answers[q.id]) ?? '—'}</p>
            </li>
          ))}
        </ol>
      </details>
    </Card>
  );
}

function Metric({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-canvas px-2.5 py-2">
      <dt className="text-[11px] text-ink-mute">{k}</dt>
      <dd className="tabular font-semibold">{v}</dd>
    </div>
  );
}

function AiPayload({ lead }: { lead: LeadRecord }) {
  const [copied, setCopied] = useState(false);
  const json = useMemo(() => JSON.stringify(buildAiContext(lead.answers, lead.metrics, lead.context), null, 2), [lead]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* área de transferência indisponível */
    }
  };
  return (
    <details className="mt-4 rounded-xl border border-brand-100 bg-brand-50/40">
      <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-brand-700">Pacote de dados para a IA (JSON)</summary>
      <div className="px-3 pb-3">
        <p className="text-xs text-ink-mute">É isto que a futura geração do PDF receberá. Nada é enviado nesta fase.</p>
        <button type="button" onClick={copy} className="mt-2 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold hover:bg-canvas">
          {copied ? 'Copiado!' : 'Copiar JSON'}
        </button>
        <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-ink p-3 text-[11px] leading-relaxed text-white">{json}</pre>
      </div>
    </details>
  );
}
