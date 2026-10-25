import { FlaskConical } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { buildModelInput } from '../ai/modelInput';
import { DistributionList } from '../components/charts';
import { Badge, Card } from '../components/ui';
import { IS_DEMO } from '../config/env';
import { PENDING } from '../content/pending';
import { commercialScore, TIER_LABEL } from '../domain/commercial';
import { buildDiagnostic } from '../domain/diagnostic';
import { PROFILES } from '../domain/profiles';
import { optionLabel } from '../domain/questionnaire';
import type { Answers, MetricsInput } from '../domain/types';
import { localEvents } from '../lib/analytics';
import { loadConsulting, loadOrders, loadQuiz } from '../lib/storage';

interface Row { id: string; label: string; source: 'EXEMPLO' | 'LOCAL'; answers: Answers; metrics?: MetricsInput; interest?: 'plano' | 'especialista' | 'consultoria' }

/** Painel interno de DEMONSTRAÇÃO. Não existe em produção (redireciona). */
export default function AdminDemo() {
  const [selected, setSelected] = useState<string>();
  const rows: Row[] = useMemo(() => {
    const out: Row[] = Object.values(PROFILES).map((p) => ({ id: p.id, label: p.name, source: 'EXEMPLO', answers: p.answers, metrics: p.metrics }));
    const q = loadQuiz();
    if (q?.completedAt) out.unshift({ id: q.sessionId, label: 'Diagnóstico neste navegador', source: 'LOCAL', answers: q.answers });
    for (const o of loadOrders()) out.unshift({ id: o.id, label: `Pedido ${o.product}`, source: 'LOCAL', answers: { ...o.answers, ...(o.deepening ?? {}) }, metrics: o.metrics, interest: o.product });
    return out;
  }, []);
  const data = useMemo(
    () =>
      rows.map((r) => {
        const d = buildDiagnostic({ id: r.id, environment: 'demo', answers: r.answers, metrics: r.metrics, createdAt: '2026-10-25T00:00:00Z' });
        return { r, d, c: commercialScore(r.answers, r.interest) };
      }),
    [rows],
  );
  const events = localEvents();
  const funnel = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of events) {
      const key = e.name === 'tela_vista' ? `tela ${e.props.screen_index ?? '?'} (${e.props.screen_id ?? ''})` : e.name;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].map(([label, count]) => ({ label, count }));
  }, [events]);

  if (!IS_DEMO) return <Navigate to="/" replace />;
  const current = data.find((x) => x.r.id === selected);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-10">
      <div className="mb-5 flex items-center gap-3 rounded-2xl border-2 border-dashed border-warn bg-warn-50 p-4 text-sm text-warn-700" role="note">
        <FlaskConical className="h-6 w-6 shrink-0" aria-hidden />
        <p>
          <strong>Painel de demonstração.</strong> Sem autenticação e sem banco de dados; não existe no ambiente de produção. Registros <strong>EXEMPLO</strong> são fictícios; <strong>LOCAL</strong> são simulações deste navegador.
        </p>
      </div>
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Painel interno (demonstração)</h1>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-bold">Conteúdo pendente de confirmação</h2>
          <p className="text-xs text-ink-mute">Não aparece no site público enquanto não for confirmado.</p>
          <ul className="mt-3 space-y-2 text-sm">
            {Object.values(PENDING).map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3">
                <span>{p.description}</span>
                <Badge tone={p.confirmed ? 'ok' : 'warn'}>{p.confirmed ? 'Confirmado' : 'Pendente'}</Badge>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="min-w-0 p-5">
          <h2 className="font-bold">Eventos neste navegador</h2>
          <p className="text-xs text-ink-mute">Sem respostas nem dados pessoais. Em produção, os eventos reais ficam separados dos de demonstração.</p>
          <div className="mt-3">{funnel.length ? <DistributionList items={funnel} total={Math.max(...funnel.map((f) => f.count))} /> : <p className="text-sm text-ink-mute">Nenhum evento ainda.</p>}</div>
        </Card>
      </div>

      <Card className="mt-4 min-w-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-[#F9FAFB] text-xs text-ink-mute">
              <tr>
                {['Diagnóstico', 'Caminho de venda', 'Avaliação', 'Cobertura', 'Prioridade estrutural', 'Potencial comercial (interno)'].map((h) => (
                  <th key={h} scope="col" className="px-4 py-2.5 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map(({ r, d, c }) => (
                <tr key={r.id} className={`cursor-pointer border-t border-line hover:bg-brand-50/40 ${selected === r.id ? 'bg-brand-50/60' : ''}`} onClick={() => setSelected(r.id)}>
                  <td className="px-4 py-3">
                    <button type="button" className="text-left font-semibold hover:text-brand" onClick={(e) => { e.stopPropagation(); setSelected(r.id); }}>{r.label}</button>
                    <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold ${r.source === 'EXEMPLO' ? 'bg-[#F2F4F7] text-ink-soft' : 'bg-brand-50 text-brand-700'}`}>{r.source}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{optionLabel('caminho_venda', r.answers.caminho_venda, r.answers) ?? '—'}</td>
                  <td className="px-4 py-3">{d.record.assessment.maturity !== null ? `${d.record.assessment.maturity}/100` : d.record.assessment.mode === 'prontidao' ? 'Prontidão' : 'Sem nota'}</td>
                  <td className="px-4 py-3 text-ink-soft">{d.record.assessment.coverage.level}</td>
                  <td className="px-4 py-3 text-ink-soft">{d.prioritized.structural?.title ?? '—'}</td>
                  <td className="px-4 py-3"><Badge tone={c.tier === 'alto' ? 'ok' : c.tier === 'medio' ? 'warn' : 'neutral'}>{TIER_LABEL[c.tier]} · {c.score}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {current && (
        <Card className="mt-4 min-w-0 p-5">
          <h2 className="text-lg font-bold">{current.r.label}</h2>
          <p className="mt-1 text-sm text-ink-soft">{current.d.record.assessment.confidenceStatement}</p>
          <h3 className="mt-4 text-xs font-bold uppercase tracking-wide text-ink-mute">Fatores do potencial comercial (não alteram a avaliação)</h3>
          <ul className="mt-1 text-sm">
            {current.c.factors.map((f) => <li key={f.label}>+{f.points} {f.label}</li>)}
          </ul>
          <details className="mt-4 rounded-xl border border-brand-100 bg-brand-50/40">
            <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-brand-700">Entrada que seria enviada à IA (sem dados de contato)</summary>
            <pre className="mx-3 mb-3 max-h-80 overflow-auto rounded-lg bg-ink p-3 text-[11px] leading-relaxed text-white">{JSON.stringify(buildModelInput(current.d, current.r.answers).payload, null, 2)}</pre>
          </details>
        </Card>
      )}

      <Card className="mt-4 p-5">
        <h2 className="font-bold">Solicitações de consultoria (neste navegador)</h2>
        <p className="text-xs text-ink-mute">Contatos guardados separados dos diagnósticos.</p>
        <ul className="mt-2 space-y-1 text-sm">
          {loadConsulting().map((c) => <li key={c.id}>{c.contact.company} — {c.contact.channel}{c.contact.phone ? ` · ${c.contact.phone}` : ''}{c.contact.email ? ` · ${c.contact.email}` : ''}</li>)}
          {!loadConsulting().length && <li className="text-ink-mute">Nenhuma.</li>}
        </ul>
      </Card>
    </div>
  );
}
