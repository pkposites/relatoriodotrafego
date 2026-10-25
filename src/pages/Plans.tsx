import { ArrowRight, Check, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, LinkButton } from '../components/ui';
import { PRODUCTS } from '../data/plans';
import { track } from '../lib/analytics';

const COMPARE: { label: string; free: string | boolean; paid: string | boolean }[] = [
  { label: 'Perfil e visão geral', free: true, paid: true },
  { label: 'Principal hipótese', free: true, paid: true },
  { label: 'Ação inicial', free: 'Uma', paid: 'Até 3 prioridades + ação rápida' },
  { label: 'Limitações da análise', free: true, paid: true },
  { label: 'Relação entre cada resposta e cada prioridade', free: false, paid: true },
  { label: 'Cálculos com os seus números (com fórmulas e ressalvas)', free: false, paid: true },
  { label: 'Passo a passo, responsável, esforço e critério de conclusão', free: false, paid: true },
  { label: 'Plano de sete dias', free: false, paid: true },
  { label: 'Modelos aplicáveis ao seu caso', free: false, paid: true },
  { label: 'O que evitar agora e quando revisar', free: false, paid: true },
  { label: 'PDF para guardar e compartilhar', free: false, paid: true },
];

function Cell({ v }: { v: string | boolean }) {
  if (v === true) return <Check className="mx-auto h-5 w-5 text-ok" aria-label="Incluído" />;
  if (v === false) return <Minus className="mx-auto h-5 w-5 text-ink-mute/50" aria-label="Não incluído" />;
  return <span className="text-sm text-ink-soft">{v}</span>;
}

export default function Plans() {
  const p = PRODUCTS.plano;
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-14">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-brand">Depois do diagnóstico gratuito</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Saiba exatamente o que corrigir primeiro</h1>
        <p className="mt-3 text-ink-soft">O que está acontecendo, em que se baseia essa leitura, o que ainda é hipótese, o que fazer, quem faz e como saber se ficou pronto.</p>
      </div>

      <article className="card mt-10 border-2 border-brand p-6 shadow-lift sm:p-8" aria-labelledby="p-plano">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <h2 id="p-plano" className="text-2xl font-extrabold tracking-tight sm:text-3xl">{p.name}</h2>
            <p className="mt-2 text-ink-soft">{p.tagline}</p>
            <ul className="mt-5 grid gap-2.5 text-[15px] sm:grid-cols-2">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2.5">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-ok" aria-hidden /> <span>{f}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 rounded-xl bg-canvas p-3 text-sm text-ink-soft">
              <strong className="text-ink">Como o plano é feito:</strong> regras de análise e cálculos do sistema organizam as evidências; a IA ajuda a redigir o plano para o seu caso; um verificador automático confere números, referências e promessas antes da entrega. Não acessamos suas contas de anúncio.
            </p>
          </div>
          <div className="rounded-2xl bg-canvas p-6 text-center">
            <p className="tabular text-5xl font-extrabold tracking-tight">{p.price}</p>
            <p className="text-sm text-ink-mute">{p.priceNote}</p>
            <LinkButton to={p.href} size="lg" className="mt-5 h-auto w-full py-3" onClick={() => track('oferta_clique', { plan: 'plano', source: 'planos' })}>
              {p.cta} <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
            </LinkButton>
            <Link to="/amostra" className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">Ver um plano de exemplo</Link>
            <ul className="mt-4 space-y-1 text-left text-xs text-ink-mute">
              {p.excludes.map((e) => <li key={e}>— {e}</li>)}
              <li>— Entrega depois da confirmação do pagamento e das informações necessárias</li>
            </ul>
          </div>
        </div>
      </article>

      <section className="mt-12" aria-labelledby="cmp">
        <h2 id="cmp" className="text-xl font-bold">Gratuito × Plano de Ação</h2>
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr className="border-b border-line text-sm">
                <th scope="col" className="p-4 font-semibold text-ink-mute">O que você recebe</th>
                <th scope="col" className="p-4 text-center font-semibold">Gratuito</th>
                <th scope="col" className="bg-brand-50/50 p-4 text-center font-semibold text-brand-700">Plano de Ação</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((r) => (
                <tr key={r.label} className="border-b border-line last:border-0">
                  <th scope="row" className="p-4 text-sm font-medium">{r.label}</th>
                  <td className="p-4 text-center"><Cell v={r.free} /></td>
                  <td className="bg-brand-50/50 p-4 text-center"><Cell v={r.paid} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-mute">Nenhuma informação essencial do gratuito fica escondida para forçar a compra. Não há garantia de aumento de vendas, ROAS ou lucro.</p>
      </section>

      <section className="mt-12" aria-labelledby="others">
        <h2 id="others" className="text-lg font-bold">Prefere atendimento humano?</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {[PRODUCTS.especialista, PRODUCTS.consultoria].map((x) => (
            <Card key={x.id} className="flex flex-col p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-bold">{x.name}</h3>
                <span className="tabular text-xl font-extrabold">{x.price}</span>
              </div>
              <p className="mt-1 text-sm text-ink-soft">{x.tagline}</p>
              <ul className="mt-3 flex-1 space-y-1.5 text-sm">
                {x.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />{f}</li>)}
                {x.excludes.map((f) => <li key={f} className="flex gap-2 text-ink-mute"><Minus className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{f}</li>)}
              </ul>
              <LinkButton to={x.href} variant="secondary" className="mt-5 w-full" onClick={() => track(x.id === 'especialista' ? 'interesse_especialista' : 'oferta_clique', { plan: x.id, source: 'planos' })}>
                {x.cta}
              </LinkButton>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
