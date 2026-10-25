import { ArrowRight, Check, Clock, FileText, Minus, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { LinkButton } from '../components/ui';
import { PLANS, getPlan } from '../data/plans';

const COMPARISON: { label: string; values: [string | boolean, string | boolean, string | boolean] }[] = [
  { label: 'Baseado nas respostas do diagnóstico', values: [true, true, true] },
  { label: 'Análise por IA especializada em tráfego pago', values: [true, true, 'Conforme proposta'] },
  { label: 'PDF com 5 pilares e 3 gargalos priorizados', values: [true, true, 'Conforme proposta'] },
  { label: 'Plano de ação', values: ['7 dias, passo a passo', 'Personalizado por prioridade', 'Conforme proposta'] },
  { label: 'Entrega', values: ['Automática', 'Após análise do Robson', 'Conforme proposta'] },
  { label: 'Análise feita pessoalmente pelo Robson', values: [false, true, true] },
  { label: 'Conversa com Robson', values: [false, 'Pelo WhatsApp', 'Conversa inicial + após contratação'] },
  { label: 'Chamada de vídeo', values: [false, false, 'Somente após contratação'] },
  { label: 'Acesso às contas de anúncio', values: [false, false, 'Se acordado na proposta'] },
];

function Cell({ v }: { v: string | boolean }) {
  if (v === true) return <Check className="mx-auto h-5 w-5 text-ok" aria-label="Incluído" />;
  if (v === false) return <Minus className="mx-auto h-5 w-5 text-ink-mute/50" aria-label="Não incluído" />;
  return <span className="text-sm text-ink-soft">{v}</span>;
}

/** Miniatura ilustrativa do PDF do Express. */
function PdfPreview() {
  const bars = [
    { l: 'Mensuração', v: 38, c: 'bg-bad' },
    { l: 'Rentabilidade', v: 52, c: 'bg-warn' },
    { l: 'Estratégia', v: 71, c: 'bg-brand' },
    { l: 'Criativos', v: 64, c: 'bg-brand' },
    { l: 'Conversão', v: 45, c: 'bg-warn' },
  ];
  return (
    <div className="relative mx-auto w-full max-w-[300px]" aria-label="Prévia ilustrativa do relatório em PDF">
      <div className="absolute inset-x-6 -bottom-2 top-4 rotate-3 rounded-xl border border-line bg-white/70" aria-hidden />
      <div className="relative rounded-xl border border-line bg-white p-5 shadow-lift">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-brand">
            <FileText className="h-3.5 w-3.5" aria-hidden /> Relatório do Tráfego
          </span>
          <span className="rounded border border-dashed border-ink-mute/40 px-1.5 py-0.5 text-[9px] font-semibold text-ink-mute">Ilustrativo</span>
        </div>
        <p className="mt-3 text-sm font-bold leading-tight">Diagnóstico completo da sua operação</p>
        <div className="mt-4 space-y-2">
          {bars.map((b) => (
            <div key={b.l}>
              <div className="flex justify-between text-[10px] text-ink-soft">
                <span>{b.l}</span>
                <span className="tabular font-semibold text-ink">{b.v}</span>
              </div>
              <div className="mt-0.5 h-1.5 rounded-full bg-[#EAECF0]">
                <div className={`h-full rounded-full ${b.c}`} style={{ width: `${b.v}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg bg-brand-50 p-2.5">
          <p className="text-[10px] font-bold text-brand-700">Plano de ação · 7 dias</p>
          {['Dia 1 — Marcar a origem de cada venda', 'Dia 2 — Calcular o custo por cliente', 'Dia 3 — Organizar o funil de contatos'].map((t) => (
            <p key={t} className="mt-1 flex items-center gap-1 text-[10px] text-ink-soft">
              <Check className="h-3 w-3 shrink-0 text-ok" aria-hidden /> {t}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Plans() {
  const express = getPlan('express')!;
  const others = PLANS.filter((p) => p.id !== 'express');

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-14">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-brand">Diagnóstico completo</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Transforme o pré-diagnóstico em um plano de ação</h1>
        <p className="mt-3 text-ink-soft">Receba a análise completa da sua operação em PDF, com o que fazer primeiro, por um valor único.</p>
      </div>

      {/* Express em destaque */}
      <article className="card relative mt-10 overflow-hidden border-2 border-brand shadow-lift" aria-labelledby="plan-express">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-10">
          <div>
            <span className="chip bg-brand text-white">
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> {express.highlight}
            </span>
            <h2 id="plan-express" className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">{express.name}</h2>
            <p className="mt-2 text-ink-soft">{express.tagline}</p>

            <ul className="mt-6 grid gap-2.5 text-[15px] sm:grid-cols-2">
              {express.features.map((f) => (
                <li key={f} className="flex gap-2.5">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-ok" aria-hidden />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-col gap-5 rounded-2xl bg-canvas p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {express.oldPrice && (
                  <p className="tabular text-sm text-ink-mute">
                    de <s>{express.oldPrice}</s> por
                  </p>
                )}
                <p className="tabular text-4xl font-extrabold tracking-tight">{express.price}</p>
                <p className="text-sm text-ink-mute">pagamento único · sem mensalidade</p>
              </div>
              <LinkButton to={express.href} size="lg" className="w-full shrink-0 whitespace-nowrap sm:w-auto">
                {express.cta} <ArrowRight className="h-5 w-5" aria-hidden />
              </LinkButton>
            </div>

            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-soft">
              <li className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-brand" aria-hidden /> Entrega automática</li>
              <li className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-brand" aria-hidden /> Aplique no seu ritmo</li>
              <li className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-ok" aria-hidden /> Sem acesso às suas contas</li>
            </ul>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-white p-6 sm:p-8">
            <PdfPreview />
          </div>
        </div>
      </article>

      {/* Alternativas */}
      <section className="mt-12" aria-labelledby="others-title">
        <h2 id="others-title" className="text-lg font-bold">Prefere uma análise individual?</h2>
        <p className="mt-1 text-sm text-ink-soft">Para quem quer o caso olhado pessoalmente pelo Robson.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {others.map((p) => (
            <article key={p.id} className="card flex flex-col p-6" aria-labelledby={`plan-${p.id}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 id={`plan-${p.id}`} className="text-base font-bold">{p.name}</h3>
                <span className="tabular text-xl font-extrabold">{p.price}</span>
              </div>
              <p className="mt-1 text-sm text-ink-soft">{p.tagline}</p>
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {p.features.slice(0, 4).map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden /> <span>{f}</span>
                  </li>
                ))}
                {p.excludes.map((f) => (
                  <li key={f} className="flex gap-2 text-ink-mute">
                    <Minus className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> <span>{f}</span>
                  </li>
                ))}
              </ul>
              <LinkButton to={p.href} variant="secondary" className="mt-5 w-full">
                {p.cta} <ArrowRight className="h-4 w-4" aria-hidden />
              </LinkButton>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-14" aria-labelledby="cmp-title">
        <h2 id="cmp-title" className="text-xl font-bold">Comparação detalhada</h2>
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-line text-sm">
                <th scope="col" className="p-4 font-semibold text-ink-mute">O que inclui</th>
                <th scope="col" className="bg-brand-50/50 p-4 text-center font-semibold text-brand-700">Express com IA</th>
                <th scope="col" className="p-4 text-center font-semibold">Especialista</th>
                <th scope="col" className="p-4 text-center font-semibold">Consultoria</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.label} className="border-b border-line last:border-0">
                  <th scope="row" className="p-4 text-sm font-medium">{row.label}</th>
                  {row.values.map((v, i) => (
                    <td key={i} className={`p-4 text-center ${i === 0 ? 'bg-brand-50/50' : ''}`}>
                      <Cell v={v} />
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-line">
                <th scope="row" className="p-4 text-sm font-semibold">Investimento</th>
                {PLANS.map((p, i) => (
                  <td key={p.id} className={`tabular p-4 text-center text-sm font-bold ${i === 0 ? 'bg-brand-50/50 text-brand-700' : ''}`}>{p.price}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink-mute">
          Os relatórios partem das informações que você fornece e não constituem auditoria técnica das contas, salvo quando acordado em proposta.
          Não há garantia de aumento de vendas, ROAS ou lucro.
        </p>
      </section>

      {/* CTA final */}
      <div className="card mt-10 flex flex-col gap-4 bg-gradient-to-br from-white to-brand-50/60 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">Comece pelo Express</h2>
          <p className="text-sm text-ink-soft">Plano de ação completo em PDF por {express.price}. Se quiser, você evolui para a análise individual depois.</p>
        </div>
        <LinkButton to={express.href} size="lg" className="w-full sm:w-auto">
          {express.cta} <ArrowRight className="h-5 w-5" aria-hidden />
        </LinkButton>
      </div>
    </div>
  );
}
