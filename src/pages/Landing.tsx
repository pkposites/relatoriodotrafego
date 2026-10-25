import {
  ArrowRight,
  BarChart3,
  Clock,
  FileText,
  Gauge,
  Lightbulb,
  LineChart,
  MessageCircle,
  ShieldCheck,
  Target,
  UserRound,
  Wallet,
} from 'lucide-react';
import { LinkButton, SectionTitle } from '../components/ui';

const PREVIEW = [
  { label: 'Mensuração', value: 42, color: 'bg-warn' },
  { label: 'Criativos', value: 68, color: 'bg-brand' },
  { label: 'Conversão', value: 31, color: 'bg-bad' },
];

function DashboardPreview() {
  return (
    <div className="card relative overflow-hidden p-5 sm:p-6" aria-label="Prévia ilustrativa do diagnóstico">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-mute">Prévia do diagnóstico</p>
          <p className="mt-1 text-lg font-bold">Índice de maturidade</p>
        </div>
        <span className="chip border border-dashed border-ink-mute/40 bg-[#F9FAFB] text-ink-mute">Dados ilustrativos</span>
      </div>
      <div className="mb-6 flex items-end gap-3">
        <span className="tabular text-5xl font-extrabold tracking-tight">54</span>
        <span className="mb-1.5 text-sm text-ink-mute">/ 100</span>
        <span className="chip mb-2 ml-auto bg-warn-50 text-warn-700">Alto potencial de melhoria</span>
      </div>
      <ul className="space-y-4">
        {PREVIEW.map((p, i) => (
          <li key={p.label}>
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="font-semibold">{p.label}</span>
              <span className="tabular font-bold">{p.value}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#EAECF0]">
              <div className={`anim-grow h-full rounded-full ${p.color}`} style={{ width: `${p.value}%`, animationDelay: `${200 + i * 120}ms` }} />
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-6 rounded-xl bg-brand-50 p-3.5 text-sm">
        <p className="font-semibold text-brand-700">Principal ponto de atenção</p>
        <p className="mt-0.5 text-ink-soft">Acompanhamento do contato até a venda</p>
      </div>
    </div>
  );
}

const AREAS = [
  { icon: Gauge, title: 'Mensuração', text: 'Se você consegue saber quais vendas vêm dos anúncios.' },
  { icon: Wallet, title: 'Rentabilidade', text: 'Se o custo por cliente cabe na margem do negócio.' },
  { icon: Target, title: 'Estratégia de campanha', text: 'Para onde vai o clique e se o caminho faz sentido.' },
  { icon: Lightbulb, title: 'Criativos e testes', text: 'Se há rotina de testes e aprendizado com os anúncios.' },
  { icon: MessageCircle, title: 'Conversão e atendimento', text: 'Como os contatos são acompanhados até a venda.' },
];

const RECEIVE = [
  { icon: BarChart3, title: 'Nota de maturidade', text: 'Um índice indicativo de 0 a 100, com a avaliação de cada pilar.', free: true },
  { icon: Target, title: 'Principal gargalo', text: 'A área que mais merece atenção, de acordo com as suas respostas.', free: true },
  { icon: ArrowRight, title: 'Primeiro próximo passo', text: 'Uma ação prática para começar, sem custo.', free: true },
  { icon: FileText, title: 'Relatório aprofundado', text: 'PDF personalizado ou orientação profissional — opcional e pago.', free: false },
];

export default function Landing() {
  return (
    <>
      {/* Bloco 1 — Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-8 sm:px-6 sm:pt-14 lg:grid-cols-[1.1fr_1fr] lg:gap-14 lg:pt-20">
        <div className="anim-rise">
          <span className="chip bg-brand-50 text-brand-700">
            <LineChart className="h-3.5 w-3.5" aria-hidden /> Diagnóstico online
          </span>
          <h1 className="mt-4 text-[32px] font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
            Seus anúncios estão dando resultado ou apenas gastando seu dinheiro?
          </h1>
          <p className="mt-4 max-w-xl text-lg text-ink-soft">
            Identifique possíveis falhas na sua estratégia de tráfego pago e descubra quais áreas merecem atenção para
            melhorar seus resultados.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <LinkButton to="/diagnostico" size="lg" className="w-full sm:w-auto">
              Começar diagnóstico gratuito <ArrowRight className="h-5 w-5" aria-hidden />
            </LinkButton>
          </div>
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-soft">
            <li className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-ok" aria-hidden /> Avaliação inicial gratuita</li>
            <li className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-brand" aria-hidden /> Cerca de 3 minutos</li>
            <li className="flex items-center gap-1.5"><Gauge className="h-4 w-4 text-brand" aria-hidden /> Sem acesso à sua conta</li>
          </ul>
        </div>
        <div className="anim-rise [animation-delay:80ms]">
          <DashboardPreview />
        </div>
      </section>

      {/* Bloco 2 — O que analisaremos */}
      <section className="border-y border-line bg-white py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle eyebrow="Cinco pilares" title="O que vamos analisar" subtitle="Doze perguntas rápidas sobre a sua operação, organizadas em cinco áreas." />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {AREAS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-card border border-line bg-canvas/50 p-4 transition-colors hover:border-brand-100 hover:bg-brand-50/40">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-brand shadow-card">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-3 font-bold">{title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Bloco 3 — O que você recebe */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <SectionTitle
          eyebrow="Resultado"
          title="O que você recebe"
          subtitle="O primeiro resultado é gratuito e aparece na hora. Análises aprofundadas são opcionais e pagas."
        />
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {RECEIVE.map(({ icon: Icon, title, text, free }) => (
            <li key={title} className="card p-5">
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className={`chip ${free ? 'bg-ok-50 text-[#067647]' : 'bg-[#F2F4F7] text-ink-soft'}`}>
                  {free ? 'Gratuito' : 'Opcional · pago'}
                </span>
              </div>
              <h3 className="mt-4 font-bold">{title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-ink-mute">
          O pré-diagnóstico é baseado nas suas respostas e não substitui uma auditoria técnica das contas de anúncio.
        </p>
      </section>

      {/* Bloco 4 — Quem está por trás */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="card grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center sm:p-8">
          <div
            className="grid h-28 w-28 place-items-center rounded-2xl border-2 border-dashed border-line bg-canvas text-ink-mute"
            role="img"
            aria-label="Espaço reservado para a foto de Robson"
          >
            <div className="text-center">
              <UserRound className="mx-auto h-8 w-8" aria-hidden />
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide">Foto</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand">Quem está por trás</p>
            <h2 className="mt-1 text-xl font-bold sm:text-2xl">Criado por Robson, gestor de tráfego e fundador da Qvn Ads</h2>
            <p className="mt-2 text-ink-soft">
              A proposta é transformar dúvidas sobre campanhas e estratégias em prioridades claras de melhoria. Robson
              trabalha com estratégias de anúncios e análise de campanhas para empresas de diferentes perfis.
            </p>
            {/* Espaço reservado para credenciais verdadeiras e provas autorizadas. */}
            <div className="mt-5">
              <LinkButton to="/diagnostico" size="lg" className="w-full sm:w-auto">
                Quero meu diagnóstico <ArrowRight className="h-5 w-5" aria-hidden />
              </LinkButton>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
