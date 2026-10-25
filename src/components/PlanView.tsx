import { ChevronDown } from 'lucide-react';
import type { PlanOutput } from '../ai/outputSchema';
import { TEMPLATES } from '../domain/templates';
import { Card } from './ui';

const STATUS: Record<string, { label: string; cls: string }> = {
  medido: { label: 'Medido', cls: 'bg-ok-50 text-[#067647]' },
  estimado: { label: 'Estimado', cls: 'bg-warn-50 text-warn-700' },
  desconhecido: { label: 'Desconhecido', cls: 'bg-bad-50 text-bad-700' },
  nao_se_aplica: { label: 'Não se aplica', cls: 'bg-[#F2F4F7] text-ink-soft' },
};
const KIND: Record<string, { label: string; cls: string }> = {
  estrutural: { label: 'Prioridade estrutural', cls: 'bg-brand-50 text-brand-700' },
  rapida: { label: 'Ação rápida', cls: 'bg-ok-50 text-[#067647]' },
  investigacao: { label: 'Próxima investigação', cls: 'bg-warn-50 text-warn-700' },
};
const EFFORT: Record<string, string> = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto' };

/** Plano renderizado em HTML (mesmo conteúdo do PDF). */
export function PlanView({ plan }: { plan: PlanOutput }) {
  const refs = new Map(plan.evidence_references.map((r) => [r.id, r]));
  const es = plan.executive_summary;
  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <h2 className="text-xl font-bold">Resumo executivo</h2>
        <dl className="mt-3 grid gap-3 text-sm">
          {[
            ['Cenário', es.scenario],
            ['Principal hipótese', es.main_hypothesis],
            ['Prioridade estrutural', es.structural_priority],
            ['Ação rápida', es.quick_win],
            ['Principal limitação', es.main_limitation],
          ].map(([k, v]) => (
            <div key={k} className="grid gap-1 sm:grid-cols-[180px_1fr]">
              <dt className="font-semibold">{k}</dt>
              <dd className="text-ink-soft">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-xl font-bold">Mapa do caminho de conversão</h2>
        <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {plan.conversion_map.map((s) => (
            <li key={s.stage} className="rounded-xl border border-line p-3">
              <p className="font-semibold">{s.stage}</p>
              <span className={`chip mt-1 ${STATUS[s.status].cls}`}>{STATUS[s.status].label}</span>
              <p className="mt-1 text-xs text-ink-soft">{s.note}</p>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="min-w-0 p-5 sm:p-6">
        <h2 className="text-xl font-bold">Painel de indicadores</h2>
        {plan.indicators.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-xs text-ink-mute">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-semibold">Indicador</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Valor</th>
                  <th scope="col" className="py-2 font-semibold">Fórmula e ressalvas</th>
                </tr>
              </thead>
              <tbody>
                {plan.indicators.map((i) => (
                  <tr key={i.evidence_ref} className="border-t border-line align-top">
                    <td className="py-2 pr-3 font-semibold">{i.label}</td>
                    <td className="tabular whitespace-nowrap py-2 pr-3">{i.value}</td>
                    <td className="py-2 text-ink-soft">
                      {i.formula}
                      {i.caveat && <span className="block text-xs text-ink-mute">{i.caveat}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-soft">Nenhum indicador calculável com os dados informados.</p>
        )}
      </Card>

      <section>
        <h2 className="text-xl font-bold">Prioridades</h2>
        <div className="mt-3 space-y-3">
          {plan.priorities.map((p, i) => (
            <details key={p.id} className="card group p-0" open={i === 0}>
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-5">
                <div>
                  <span className={`chip ${KIND[p.kind].cls}`}>{KIND[p.kind].label}</span>
                  <p className="mt-2 text-lg font-bold">
                    {i + 1}. {p.title}
                  </p>
                </div>
                <ChevronDown className="mt-2 h-5 w-5 shrink-0 text-ink-mute transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="border-t border-line p-5 text-sm">
                <dl className="grid gap-3">
                  {[
                    ['Fato', p.fact],
                    ['Hipótese', p.hypothesis],
                    ['Consequência possível', p.possible_consequence],
                    ['Como confirmar', p.how_to_confirm],
                  ].map(([k, v]) => (
                    <div key={k} className="grid gap-1 sm:grid-cols-[180px_1fr]">
                      <dt className="font-semibold">{k}</dt>
                      <dd className="text-ink-soft">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-4 rounded-xl bg-brand-50 p-4">
                  <p className="font-bold text-brand-700">{p.action.what}</p>
                  <p className="mt-1 text-ink-soft">{p.action.why}</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5">
                    {p.action.how.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ol>
                  <dl className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                    <div><dt className="inline font-semibold">Responsável: </dt><dd className="inline">{p.action.owner}</dd></div>
                    <div><dt className="inline font-semibold">Esforço: </dt><dd className="inline">{EFFORT[p.action.effort]} — {p.action.effort_estimate}</dd></div>
                    <div><dt className="inline font-semibold">Dependências: </dt><dd className="inline">{p.action.dependencies.join('; ') || 'Nenhuma'}</dd></div>
                    <div><dt className="inline font-semibold">Concluído quando: </dt><dd className="inline">{p.action.done_criteria}</dd></div>
                    <div><dt className="inline font-semibold">Indicador: </dt><dd className="inline">{p.action.indicator}</dd></div>
                    <div><dt className="inline font-semibold">Revisar: </dt><dd className="inline">{p.action.review_when}</dd></div>
                  </dl>
                </div>
                {p.evidence_refs.length > 0 && (
                  <p className="mt-3 text-xs text-ink-mute">
                    Evidências: {p.evidence_refs.map((id) => refs.get(id)).filter(Boolean).map((r) => `${r!.label} — ${r!.value}`).join(' · ')}
                  </p>
                )}
              </div>
            </details>
          ))}
        </div>
        {plan.quick_win.priority_id && <p className="mt-3 text-sm italic text-ink-soft">{plan.quick_win.rationale}</p>}
      </section>

      <Card className="min-w-0 p-5 sm:p-6">
        <h2 className="text-xl font-bold">Plano de sete dias</h2>
        <ol className="mt-3 divide-y divide-line text-sm">
          {plan.action_plan.map((t) => (
            <li key={t.day} className="grid gap-1 py-2 sm:grid-cols-[90px_1fr_auto]">
              <span className="font-semibold">{t.day}</span>
              <span>
                {t.task} <span className="text-ink-mute">— {t.owner}</span>
              </span>
              <span className="tabular text-ink-mute">{t.minutes} min</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-ink-mute">{plan.measurement_plan.execution_vs_results_note}</p>
      </Card>

      {plan.selected_templates.length > 0 && (
        <Card className="p-5 sm:p-6">
          <h2 className="text-xl font-bold">Modelos incluídos</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {plan.selected_templates.map((t) => (
              <li key={t.template_id}>
                <strong>{TEMPLATES[t.template_id]?.title}</strong> — <span className="text-ink-soft">{TEMPLATES[t.template_id]?.purpose}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {plan.avoid_now.length > 0 && (
        <Card className="p-5 sm:p-6">
          <h2 className="text-xl font-bold">O que evitar agora</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {plan.avoid_now.map((x) => (
              <li key={x.decision}>
                <strong>{x.decision}.</strong> <span className="text-ink-soft">{x.why}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-5 sm:p-6">
        <h2 className="text-xl font-bold">Próxima revisão: em {plan.measurement_plan.review_in_days} dias</h2>
        <ul className="mt-2 space-y-1 text-sm text-ink-soft">
          {plan.measurement_plan.metrics.map((m) => (
            <li key={m.name}>• <strong className="text-ink">{m.name}</strong> — {m.how}</li>
          ))}
        </ul>
        <p className="mt-2 text-sm"><strong>Continue se:</strong> {plan.measurement_plan.continue_if}</p>
        <p className="mt-1 text-sm"><strong>Ajuste se:</strong> {plan.measurement_plan.adjust_if}</p>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-xl font-bold">Premissas e limitações</h2>
        <ul className="mt-2 space-y-1 text-sm text-ink-soft">
          {[...plan.limitations, ...plan.assumptions].map((l) => (
            <li key={l}>• {l}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
