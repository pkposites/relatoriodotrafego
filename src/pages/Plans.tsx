import { ArrowRight, Check, Minus, Star } from 'lucide-react';
import { LinkButton } from '../components/ui';
import { PLANS } from '../data/plans';

const COMPARISON: { label: string; values: [string | boolean, string | boolean, string | boolean] }[] = [
  { label: 'Baseado nas respostas do diagnóstico', values: [true, true, true] },
  { label: 'Análise por IA especializada em tráfego pago', values: [true, true, 'Conforme proposta'] },
  { label: 'PDF com 5 pilares e 3 gargalos priorizados', values: [true, true, 'Conforme proposta'] },
  { label: 'Plano de ação', values: ['7 dias', 'Personalizado por prioridade', 'Conforme proposta'] },
  { label: 'Análise feita pessoalmente pelo Robson', values: [false, true, true] },
  { label: 'Análise de prints e métricas enviados', values: [false, true, 'Conforme proposta'] },
  { label: 'Conversa com Robson', values: [false, 'Pelo WhatsApp', 'Conversa inicial + após contratação'] },
  { label: 'Chamada de vídeo', values: [false, false, 'Somente após contratação'] },
  { label: 'Acesso às contas de anúncio', values: [false, false, 'Se acordado na proposta'] },
];

function Cell({ v }: { v: string | boolean }) {
  if (v === true) return <Check className="mx-auto h-5 w-5 text-ok" aria-label="Incluído" />;
  if (v === false) return <Minus className="mx-auto h-5 w-5 text-ink-mute/50" aria-label="Não incluído" />;
  return <span className="text-sm text-ink-soft">{v}</span>;
}

export default function Plans() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-14">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-brand">Diagnóstico completo</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Escolha o nível de profundidade</h1>
        <p className="mt-3 text-ink-soft">
          Seu pré-diagnóstico gratuito continua disponível. As opções abaixo são aprofundamentos opcionais, com escopo transparente.
        </p>
      </div>

      <div className="mt-10 grid items-start gap-4 lg:grid-cols-3">
        {PLANS.map((p) => {
          const featured = !!p.highlight;
          return (
            <article
              key={p.id}
              className={`card relative flex h-full flex-col p-6 ${featured ? 'border-2 border-brand shadow-lift lg:-mt-3 lg:pb-9' : ''}`}
              aria-labelledby={`plan-${p.id}`}
            >
              {featured && (
                <span className="chip absolute -top-3 left-6 bg-brand text-white">
                  <Star className="h-3.5 w-3.5" aria-hidden /> {p.highlight}
                </span>
              )}
              <h2 id={`plan-${p.id}`} className="text-lg font-bold">{p.name}</h2>
              <p className="mt-1 min-h-[40px] text-sm text-ink-soft">{p.tagline}</p>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="tabular text-3xl font-extrabold tracking-tight">{p.price}</span>
              </div>
              {p.priceNote && <p className="text-xs text-ink-mute">{p.priceNote}</p>}

              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
                {p.excludes.map((f) => (
                  <li key={f} className="flex gap-2.5 text-ink-mute">
                    <Minus className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <LinkButton to={p.href} variant={featured ? 'primary' : 'secondary'} size="lg" className="mt-6 w-full">
                {p.cta} <ArrowRight className="h-4 w-4" aria-hidden />
              </LinkButton>
            </article>
          );
        })}
      </div>

      <section className="mt-14" aria-labelledby="cmp-title">
        <h2 id="cmp-title" className="text-xl font-bold">Comparação detalhada</h2>
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-line text-sm">
                <th scope="col" className="p-4 font-semibold text-ink-mute">O que inclui</th>
                <th scope="col" className="p-4 text-center font-semibold">Express</th>
                <th scope="col" className="bg-brand-50/50 p-4 text-center font-semibold text-brand-700">Especialista</th>
                <th scope="col" className="p-4 text-center font-semibold">Consultoria</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.label} className="border-b border-line last:border-0">
                  <th scope="row" className="p-4 text-sm font-medium">{row.label}</th>
                  {row.values.map((v, i) => (
                    <td key={i} className={`p-4 text-center ${i === 1 ? 'bg-brand-50/50' : ''}`}>
                      <Cell v={v} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink-mute">
          Os relatórios partem das informações que você fornece e não constituem auditoria técnica das contas, salvo quando acordado em proposta.
          Não há garantia de aumento de vendas, ROAS ou lucro.
        </p>
      </section>
    </div>
  );
}
