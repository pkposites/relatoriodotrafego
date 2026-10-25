import { ArrowRight, BarChart3, Check, ClipboardList, FileText, HelpCircle, KeyRound, ListChecks, Minus, Ruler, Scale, ShieldCheck, Shuffle, UserRound, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import HeroDemo from '../components/HeroDemo';
import { Card, LinkButton, SectionTitle } from '../components/ui';
import { confirmed } from '../content/pending';
import { PRODUCTS } from '../data/plans';
import { track } from '../lib/analytics';

const PAINS = [
  { icon: Ruler, title: 'Não sei quais vendas vêm dos anúncios', text: 'Investe todo mês, mas não consegue ligar o anúncio à venda.' },
  { icon: Users, title: 'Chegam contatos, mas poucos compram', text: 'O problema pode estar no anúncio, no atendimento ou no meio do caminho.' },
  { icon: Scale, title: 'Custo alto, sem saber se cabe na margem', text: 'Não está claro quanto um cliente pode custar para dar lucro.' },
  { icon: Shuffle, title: 'Resultado que oscila', text: 'Um mês bom, outro ruim, sem saber o que mudou.' },
  { icon: HelpCircle, title: 'Dúvida sobre a gestão atual', text: 'Quer avaliar o trabalho do gestor ou da agência com critérios claros.' },
];

const STEPS = [
  { icon: ClipboardList, title: 'Diagnóstico gratuito', text: 'Doze perguntas sobre seu negócio, seu caminho de venda e sua rotina. Sem cadastro e sem acesso às suas contas.' },
  { icon: BarChart3, title: 'Resultado na hora', text: 'Perfil, visão geral, a principal hipótese, uma ação para começar e as limitações da análise.' },
  { icon: ListChecks, title: 'Plano de Ação (opcional)', text: 'Se quiser, o plano pago detalha prioridades, passo a passo, responsáveis e como verificar cada tarefa.' },
  { icon: FileText, title: 'PDF para executar', text: 'Depois da confirmação do pagamento, você aprofunda o que quiser e recebe o plano em PDF.' },
];

const FOR = ['Donos de pequenas e médias empresas que anunciam no Instagram, Facebook ou Google', 'Quem anuncia, mas não sabe dizer o que funciona', 'Quem vai começar a anunciar e quer se preparar', 'Quem tem gestor ou agência e quer critérios para conversar'];
const NOT_FOR = ['Quem procura promessa de resultado garantido', 'Quem precisa de auditoria técnica dentro das contas', 'Grandes operações com time de mídia e dados próprios'];

const FAQ = [
  { q: 'Preciso dar acesso à minha conta de anúncios?', a: 'Não. Tanto o diagnóstico quanto o Plano de Ação usam apenas o que você responde e informa. Nada é acessado.' },
  { q: 'É uma auditoria?', a: 'Não. É uma análise das informações que você fornece, com hipóteses e formas de confirmar. Quando falta dado, o plano diz isso e mostra como levantar.' },
  { q: 'E se eu não souber os números?', a: '“Não sei” é uma resposta válida. Ela não vira zero nem certeza: entra como lacuna, e o plano começa por como medir.' },
  { q: 'Ainda não anuncio. Serve para mim?', a: 'Sim. Você recebe uma avaliação de preparação, sem nota de campanha, com o que deixar pronto antes de investir.' },
  { q: 'Como a IA é usada?', a: 'Regras e cálculos do sistema organizam as evidências; a IA ajuda a redigir o Plano de Ação para o seu caso; um verificador confere números, referências e promessas antes da entrega. A avaliação gratuita não usa IA.' },
  { q: 'Como recebo o plano pago?', a: 'Depois que a plataforma de pagamento confirmar a compra, você escolhe gerar com o que já informou ou adicionar contexto. O PDF fica disponível por link de acesso.' },
];

export default function Landing() {
  const plan = PRODUCTS.plano;
  const authority = confirmed('contas_ativas');
  const photo = confirmed('foto_robson');
  const ctaFree = (source: string) => () => track('oferta_clique', { plan: 'gratuito', source });

  return (
    <>
      {/* 1–2. Promessa, público e CTA gratuito */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-8 sm:px-6 sm:pt-14 lg:grid-cols-[1.1fr_1fr] lg:gap-14 lg:pt-20">
        <div className="anim-rise">
          <span className="chip bg-brand-50 text-brand-700">Para donos de empresa que anunciam ou vão anunciar</span>
          <h1 className="mt-4 text-[32px] font-extrabold leading-[1.1] tracking-tight sm:text-5xl">Descubra o que corrigir primeiro no seu tráfego pago</h1>
          <p className="mt-4 max-w-xl text-lg text-ink-soft">
            Um diagnóstico gratuito que separa o que você sabe do que ainda é hipótese, aponta o principal ponto a investigar e sugere uma ação para começar.
          </p>
          <div className="mt-7">
            <LinkButton to="/diagnostico" size="lg" className="w-full sm:w-auto" onClick={ctaFree('hero')}>
              Fazer meu diagnóstico gratuito <ArrowRight className="h-5 w-5" aria-hidden />
            </LinkButton>
          </div>
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-soft">
            <li className="flex items-center gap-1.5"><ClipboardList className="h-4 w-4 text-brand" aria-hidden /> 12 perguntas</li>
            <li className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-ok" aria-hidden /> Sem cadastro</li>
            <li className="flex items-center gap-1.5"><KeyRound className="h-4 w-4 text-brand" aria-hidden /> Sem acesso às suas contas</li>
          </ul>
        </div>
        <div className="anim-rise [animation-delay:80ms]">
          <HeroDemo />
        </div>
      </section>

      {/* 3. Amostra */}
      <section className="border-y border-line bg-white py-14">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <SectionTitle eyebrow="Amostra" title="Veja como é um Plano de Ação" subtitle="Três exemplos completos com negócios fictícios e caminhos de venda diferentes. Os dados são inventados e estão identificados como tal." />
          <Card className="p-5">
            <span className="chip bg-warn-50 text-warn-700">Exemplo fictício</span>
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-brand">Prioridade estrutural</p>
            <p className="mt-1 text-lg font-bold">Registrar a origem de cada venda</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div><dt className="inline font-semibold">Fato: </dt><dd className="inline text-ink-soft">“Acompanho apenas os contatos, não as vendas”.</dd></div>
              <div><dt className="inline font-semibold">Hipótese: </dt><dd className="inline text-ink-soft">decisões tomadas sem saber quais campanhas vendem.</dd></div>
              <div><dt className="inline font-semibold">Concluído quando: </dt><dd className="inline text-ink-soft">duas semanas com a origem registrada em todas as vendas.</dd></div>
            </dl>
            <LinkButton to="/amostra" variant="secondary" className="mt-4">Ver o exemplo completo</LinkButton>
          </Card>
        </div>
      </section>

      {/* 4. Dores */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <SectionTitle eyebrow="Para quem sente isso" title="Situações que o diagnóstico ajuda a organizar" />
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PAINS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="card p-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand"><Icon className="h-5 w-5" aria-hidden /></span>
              <h3 className="mt-3 font-bold">{title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 5. Como funciona */}
      <section className="border-y border-line bg-white py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle eyebrow="Como funciona" title="Do diagnóstico ao plano" />
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="rounded-card border border-line bg-canvas/50 p-4">
                <span className="tabular text-xs font-bold text-brand">Passo {i + 1}</span>
                <Icon className="mt-2 h-6 w-6 text-brand" aria-hidden />
                <h3 className="mt-2 font-bold">{title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 6. Gratuito × pago */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <SectionTitle eyebrow="Gratuito × pago" title="O gratuito já é útil. O plano mostra como executar." />
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <h3 className="text-lg font-bold">Avaliação gratuita</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {['Seu perfil e visão geral', 'Principal hipótese, com o que a sustenta', 'Uma ação inicial útil', 'Limitações claras da análise'].map((f) => (
                <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />{f}</li>
              ))}
            </ul>
          </Card>
          <Card className="border-2 border-brand p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-lg font-bold">{plan.name}</h3>
              <span className="tabular text-xl font-extrabold">{plan.price}</span>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {['Relação entre suas respostas e cada prioridade', 'Cálculos compatíveis com seus números', 'Sequência de execução em sete dias', 'Modelos aplicáveis e critérios de conclusão', 'Plano de acompanhamento'].map((f) => (
                <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />{f}</li>
              ))}
            </ul>
            <Link to="/planos" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">Ver detalhes e comparação</Link>
          </Card>
        </div>
      </section>

      {/* 7. Responsável e método */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <Card className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center sm:p-8">
          {photo ? (
            <img src={photo} alt="Robson, fundador da Qvn Ads" className="h-28 w-28 rounded-2xl object-cover" />
          ) : (
            <div className="grid h-28 w-28 place-items-center rounded-2xl border-2 border-dashed border-line bg-canvas text-ink-mute" role="img" aria-label="Espaço reservado para a foto de Robson">
              <UserRound className="h-8 w-8" aria-hidden />
            </div>
          )}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand">Quem está por trás</p>
            <h2 className="mt-1 text-xl font-bold sm:text-2xl">Robson, gestor de tráfego e fundador da Qvn Ads</h2>
            <p className="mt-2 text-ink-soft">
              {authority ? `${authority}. ` : ''}Criou o Relatório do Tráfego para transformar dúvidas sobre campanhas em prioridades claras, com regras transparentes: cada conclusão aponta a resposta que a sustenta, e o que é hipótese aparece como hipótese.
            </p>
          </div>
        </Card>
      </section>

      {/* 8. Para quem serve */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <h2 className="text-lg font-bold">Para quem serve</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {FOR.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />{f}</li>)}
            </ul>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-bold">Para quem não serve</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {NOT_FOR.map((f) => <li key={f} className="flex gap-2"><Minus className="mt-0.5 h-4 w-4 shrink-0 text-ink-mute" aria-hidden />{f}</li>)}
            </ul>
          </Card>
        </div>
      </section>

      {/* 9. FAQ */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6" aria-labelledby="faq">
        <h2 id="faq" className="text-2xl font-bold tracking-tight">Perguntas frequentes</h2>
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

      {/* 10. CTA final */}
      <section className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
        <div className="card flex flex-col items-start gap-4 bg-gradient-to-br from-white to-brand-50/60 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">Comece pelo diagnóstico gratuito</h2>
            <p className="mt-1 text-ink-soft">Você vê o resultado na hora e decide depois se quer o plano.</p>
          </div>
          <LinkButton to="/diagnostico" size="lg" className="w-full sm:w-auto" onClick={ctaFree('final')}>
            Fazer meu diagnóstico gratuito <ArrowRight className="h-5 w-5" aria-hidden />
          </LinkButton>
        </div>
      </section>
    </>
  );
}
