import { ArrowLeft, ArrowRight, Check, ClipboardList, FileText, KeyRound, MessageCircle, Search, Send, UserRound, VideoOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, LinkButton } from '../components/ui';
import { getPlan } from '../data/plans';

const STEPS = [
  {
    icon: ClipboardList,
    title: 'Você contrata e o diagnóstico já começa',
    text: 'Suas respostas do questionário servem de ponto de partida. Você não precisa repetir tudo do zero.',
  },
  {
    icon: Send,
    title: 'Você envia o que tiver pelo WhatsApp',
    text: 'Prints de resultados, relatórios, link da página, criativos ou números de vendas. Só o que você quiser compartilhar.',
  },
  {
    icon: Search,
    title: 'Robson analisa o seu caso pessoalmente',
    text: 'Leitura humana do cenário completo: estratégia, mensuração, criativos, custo por cliente e atendimento.',
  },
  {
    icon: MessageCircle,
    title: 'Conversa pelo WhatsApp',
    text: 'Perguntas para entender o contexto e espaço para você tirar dúvidas, no seu tempo, por mensagens.',
  },
  {
    icon: FileText,
    title: 'Você recebe o diagnóstico e o plano de ação',
    text: 'PDF com os gargalos priorizados e ações personalizadas, na ordem em que fazem mais diferença para o seu caso.',
  },
];

const FAQ = [
  {
    q: 'Preciso dar acesso à minha conta de anúncios?',
    a: 'Não. A análise é feita com base nas suas respostas e no material que você enviar. Você não compartilha senhas nem acessos.',
  },
  {
    q: 'Vai ter chamada de vídeo?',
    a: 'Não. Toda a conversa acontece pelo WhatsApp, por mensagens. Assim você responde quando puder, sem precisar marcar horário.',
  },
  {
    q: 'Quem faz a análise?',
    a: 'O próprio Robson, gestor de tráfego e fundador da Qvn Ads. A IA organiza a base do relatório; a leitura do caso e as recomendações são dele.',
  },
  {
    q: 'É uma auditoria da conta?',
    a: 'Não. É um diagnóstico estratégico baseado no que você informa e envia. Uma auditoria técnica dentro das contas faz parte apenas da consultoria, se acordado em proposta.',
  },
  {
    q: 'Em quanto tempo recebo?',
    a: 'O prazo de entrega será informado antes da contratação.',
  },
];

export default function SpecialistPlan() {
  const plan = getPlan('especialista')!;
  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 sm:pt-12">
      <Link to="/planos" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar aos planos
      </Link>

      {/* Hero */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="anim-rise">
          <span className="chip bg-brand-50 text-brand-700">Orientação individual</span>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            Diagnóstico com Especialista: o seu caso analisado pelo Robson
          </h1>
          <p className="mt-3 text-lg text-ink-soft">
            Uma análise individual da sua estratégia de tráfego pago, com conversa pelo WhatsApp.
            <strong className="text-ink"> Sem chamada de vídeo e sem precisar entrar nas suas contas de anúncio.</strong>
          </p>
          <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-3">
            <li className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5">
              <MessageCircle className="h-4 w-4 shrink-0 text-ok" aria-hidden /> Tudo pelo WhatsApp
            </li>
            <li className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5">
              <VideoOff className="h-4 w-4 shrink-0 text-brand" aria-hidden /> Sem chamada de vídeo
            </li>
            <li className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5">
              <KeyRound className="h-4 w-4 shrink-0 text-brand" aria-hidden /> Sem acesso às contas
            </li>
          </ul>
        </div>

        <Card className="anim-rise p-6 [animation-delay:60ms] lg:sticky lg:top-24">
          <p className="text-sm font-semibold text-ink-soft">{plan.name}</p>
          <p className="tabular mt-1 text-4xl font-extrabold tracking-tight">{plan.price}</p>
          <p className="text-xs text-ink-mute">{plan.priceNote}</p>
          <ul className="mt-5 space-y-2 text-sm">
            {plan.features.map((f) => (
              <li key={f} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden /> {f}
              </li>
            ))}
          </ul>
          <LinkButton to="/checkout-demo?plano=especialista" size="lg" className="mt-6 w-full">
            Quero minha análise <ArrowRight className="h-4 w-4" aria-hidden />
          </LinkButton>
          <Link to="/checkout-demo?plano=express" className="mt-3 block text-center text-sm font-semibold text-brand hover:underline">
            Prefiro o Express com IA (R$ 67,90)
          </Link>
        </Card>
      </div>

      {/* Como funciona */}
      <section className="mt-14" aria-labelledby="how-title">
        <h2 id="how-title" className="text-2xl font-bold tracking-tight">Como funciona</h2>
        <ol className="mt-6 space-y-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="card flex gap-4 p-5">
              <div className="flex flex-col items-center">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-ink-mute">Passo {i + 1}</p>
                <h3 className="mt-0.5 font-bold">{title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Por que sem call e sem acesso */}
      <section className="mt-14 grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <VideoOff className="h-6 w-6 text-brand" aria-hidden />
          <h2 className="mt-3 text-lg font-bold">Por que sem chamada?</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Por mensagens você manda prints e números com calma, responde quando puder e fica com tudo registrado para consultar depois.
            Sem agenda para encaixar e sem pressa.
          </p>
        </Card>
        <Card className="p-6">
          <KeyRound className="h-6 w-6 text-brand" aria-hidden />
          <h2 className="mt-3 text-lg font-bold">Por que sem entrar nas contas?</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Você não precisa compartilhar senhas nem dar acesso ao Gerenciador. O foco é a estratégia: como você mede, quanto custa um cliente,
            para onde vai o clique e como o contato vira venda.
          </p>
        </Card>
      </section>

      {/* Quem analisa */}
      <section className="mt-4">
        <Card className="grid gap-5 p-6 sm:grid-cols-[auto_1fr] sm:items-center">
          <div
            className="grid h-20 w-20 place-items-center rounded-2xl border-2 border-dashed border-line bg-canvas text-ink-mute"
            role="img"
            aria-label="Espaço reservado para a foto de Robson"
          >
            <UserRound className="h-7 w-7" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand">Quem analisa</p>
            <h2 className="mt-1 text-lg font-bold">Robson, gestor de tráfego e fundador da Qvn Ads</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Gerencia mais de 45 contas de anúncio ativas e trabalha com estratégia e análise de campanhas para empresas de diferentes perfis.
            </p>
          </div>
        </Card>
      </section>

      {/* FAQ */}
      <section className="mt-14" aria-labelledby="faq-title">
        <h2 id="faq-title" className="text-2xl font-bold tracking-tight">Perguntas frequentes</h2>
        <div className="mt-5 space-y-2">
          {FAQ.map((f) => (
            <details key={f.q} className="card group p-0">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-semibold">
                {f.q}
                <span className="text-brand transition-transform group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <p className="px-5 pb-4 text-sm text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="card mt-10 flex flex-col gap-4 bg-gradient-to-br from-white to-brand-50/60 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">Pronto para ter o seu caso analisado?</h2>
          <p className="text-sm text-ink-soft">{plan.price} · pagamento único · tudo pelo WhatsApp</p>
        </div>
        <LinkButton to="/checkout-demo?plano=especialista" size="lg" className="w-full sm:w-auto">
          Quero análise com especialista <ArrowRight className="h-4 w-4" aria-hidden />
        </LinkButton>
      </div>
    </div>
  );
}
