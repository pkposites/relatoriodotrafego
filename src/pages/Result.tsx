import { AlertTriangle, ArrowRight, Check, CheckCircle2, ChevronDown, ClipboardList, Lightbulb, Pencil, RotateCcw, ShieldAlert, Sparkles, Target } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PillarBars, ScoreGauge } from '../components/charts';
import { Badge, Button, Card, LinkButton } from '../components/ui';
import { PILLARS, QUESTIONS } from '../data/questions';
import { formatBRL, formatDec, formatPct } from '../lib/format';
import { buildReport } from '../lib/report';
import { clearQuiz, loadQuiz, upsertLocalLead } from '../lib/storage';
import type { ComputedMetrics, ConfidenceLevel } from '../types';

const CONFIDENCE: Record<ConfidenceLevel, { label: string; tone: 'ok' | 'brand' | 'warn'; text: string }> = {
  alta: { label: 'Confiança alta', tone: 'ok', text: 'Você respondeu com segurança às perguntas que compõem o índice.' },
  media: { label: 'Confiança média', tone: 'brand', text: 'Algumas áreas tiveram respostas incertas ou contexto não informado.' },
  baixa: { label: 'Confiança baixa', tone: 'warn', text: 'Há pouca informação em várias áreas; trate o índice como ponto de partida.' },
};

export default function Result() {
  const navigate = useNavigate();
  const quiz = useMemo(() => loadQuiz(), []);
  const ready = !!quiz?.completedAt;
  const report = useMemo(() => (quiz && ready ? buildReport(quiz.answers, quiz.metrics) : undefined), [quiz, ready]);
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    if (quiz && ready) upsertLocalLead({ id: quiz.sessionId, answers: quiz.answers, metrics: quiz.metrics });
  }, [quiz, ready]);

  if (!quiz || !report) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand">
          <ClipboardList className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-bold">Ainda não há um resultado por aqui</h1>
        <p className="mt-2 text-ink-soft">
          {quiz && Object.keys(quiz.answers).length
            ? 'Seu diagnóstico está incompleto. Continue de onde parou para ver o resultado.'
            : 'Responda às 12 perguntas do diagnóstico para ver seu Relatório do Tráfego.'}
        </p>
        <LinkButton to="/diagnostico" size="lg" className="mt-6">
          {quiz && Object.keys(quiz.answers).length ? 'Continuar diagnóstico' : 'Começar diagnóstico'} <ArrowRight className="h-5 w-5" aria-hidden />
        </LinkButton>
      </div>
    );
  }

  const { score, mainGap, gaps, strength, firstStep, painContext, metrics } = report;
  const conf = CONFIDENCE[score.confidenceLevel];

  const redo = () => {
    clearQuiz();
    navigate('/diagnostico');
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-6 pt-6 sm:px-6 sm:pt-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand">Pré-diagnóstico gratuito</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Seu Relatório do Tráfego</h1>
        </div>
        <Badge tone={conf.tone} className="self-start sm:self-auto">{conf.label}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]" aria-live="polite">
        {/* Índice */}
        <Card className="anim-rise flex flex-col items-center p-6 text-center">
          <p className="text-sm font-semibold text-ink-soft">Índice indicativo de maturidade</p>
          <div className="my-4">
            <ScoreGauge score={score.overall} band={score.band} />
          </div>
          <Badge tone={score.band.tone}>{score.band.label}</Badge>
          <BandScale current={score.band.id} />
          <p className="mt-4 text-xs text-ink-mute">Esse é um indicador baseado no que você respondeu.</p>
        </Card>

        {/* Pilares */}
        <Card className="anim-rise p-6 [animation-delay:60ms]">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold">Cinco pilares</h2>
            <span className="text-xs text-ink-mute">0–100 por pilar</span>
          </div>
          <PillarBars pillars={score.pillars} />
          {score.pillars.some((p) => p.evidenceLevel === 'limitada') && (
            <p className="mt-4 text-xs text-ink-mute">“Evidência limitada”: houve pouca informação para esta área, então a nota é menos precisa.</p>
          )}
        </Card>
      </div>

      {/* Destaques */}
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Card className="anim-rise border-l-4 border-l-bad p-5 [animation-delay:120ms]">
          <div className="flex items-center gap-2 text-sm font-bold text-bad-700">
            <Target className="h-4 w-4" aria-hidden /> Principal ponto de atenção
          </div>
          <p className="mt-2 font-bold">{mainGap.title}</p>
          <p className="mt-1 text-sm text-ink-soft">{PILLARS[mainGap.pillar].name}</p>
        </Card>
        <Card className="anim-rise border-l-4 border-l-ok p-5 [animation-delay:160ms]">
          <div className="flex items-center gap-2 text-sm font-bold text-[#067647]">
            <CheckCircle2 className="h-4 w-4" aria-hidden /> Ponto positivo
          </div>
          <p className="mt-2 font-bold">{strength.title}</p>
          <p className="mt-1 text-sm text-ink-soft">{strength.text}</p>
        </Card>
        <Card className="anim-rise border-l-4 border-l-brand p-5 [animation-delay:200ms]">
          <div className="flex items-center gap-2 text-sm font-bold text-brand-700">
            <Lightbulb className="h-4 w-4" aria-hidden /> Primeiro passo gratuito
          </div>
          <p className="mt-2 text-sm">{firstStep}</p>
        </Card>
      </div>

      {painContext && (
        <p className="mt-4 rounded-xl border border-line bg-white p-4 text-sm text-ink-soft">{painContext}</p>
      )}

      {/* Lacunas */}
      <section className="mt-8" aria-labelledby="gaps-title">
        <h2 id="gaps-title" className="text-xl font-bold">Três prioridades identificadas</h2>
        <p className="mt-1 text-sm text-ink-soft">Separamos o que você declarou, a hipótese provável e uma ação sugerida.</p>
        <ol className="mt-4 grid gap-4 lg:grid-cols-3">
          {gaps.map((g, i) => (
            <li key={g.pillar} className="card flex flex-col p-5">
              <div className="flex items-center gap-2">
                <span className="tabular grid h-7 w-7 place-items-center rounded-lg bg-canvas text-sm font-bold">{i + 1}</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-mute">{PILLARS[g.pillar].name}</span>
              </div>
              <h3 className="mt-3 font-bold">{g.title}</h3>
              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="font-semibold text-ink">Fato declarado</dt>
                  <dd className="text-ink-soft">{g.declared}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-ink">Hipótese</dt>
                  <dd className="text-ink-soft">{g.hypothesis}</dd>
                </div>
                <div className="rounded-lg bg-brand-50 p-3">
                  <dt className="font-semibold text-brand-700">Ação sugerida</dt>
                  <dd className="text-ink">{g.action}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      </section>


      {/* Oferta Express */}
      <section className="card relative mt-8 overflow-hidden border-2 border-brand shadow-lift" aria-labelledby="offer-title">
        <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div>
            <span className="chip bg-brand text-white">
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> Próximo passo recomendado
            </span>
            <h2 id="offer-title" className="mt-3 text-2xl font-extrabold tracking-tight">Receba o diagnóstico completo em PDF</h2>
            <p className="mt-2 text-ink-soft">
              Seu principal ponto de atenção é <strong className="text-ink">{mainGap.title.toLowerCase()}</strong>. O relatório completo aprofunda
              cada pilar e entrega um plano de ação de 7 dias para você aplicar sozinho.
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {['Os cinco pilares analisados um a um', 'Três gargalos com causa provável e impacto', 'Plano de ação de 7 dias, passo a passo', 'IA configurada com a metodologia de um gestor com mais de 45 contas ativas'].map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden /> {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-canvas p-5 text-center">
            <p className="text-sm font-semibold text-ink-soft">Diagnóstico Express com IA</p>
            <p className="tabular mt-1 text-4xl font-extrabold tracking-tight">R$ 59,90</p>
            <p className="text-xs text-ink-mute">pagamento único · entrega automática</p>
            <LinkButton to="/checkout-demo?plano=express" size="lg" className="mt-4 w-full">
              Quero meu PDF com IA <ArrowRight className="h-5 w-5" aria-hidden />
            </LinkButton>
            <Link to="/planos" className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">
              Ver todas as opções
            </Link>
          </div>
        </div>
      </section>

      {metrics.hasAny && <MetricsCard metrics={metrics} />}

      <Card className="mt-4 p-5">
        <p className="text-sm text-ink-soft">
          <strong className="text-ink">Confiança do resultado:</strong> {conf.text}
        </p>
        <p className="mt-2 flex items-start gap-2 text-sm text-ink-soft">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-ink-mute" aria-hidden />
          Baseado nas respostas fornecidas; não substitui auditoria técnica das contas.
        </p>
      </Card>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Button variant="secondary" onClick={() => setShowAnswers((v) => !v)} aria-expanded={showAnswers} aria-controls="answers">
          <ChevronDown className={`h-4 w-4 transition-transform ${showAnswers ? 'rotate-180' : ''}`} aria-hidden /> Revisar respostas
        </Button>
        <Button variant="secondary" onClick={redo}>
          <RotateCcw className="h-4 w-4" aria-hidden /> Refazer diagnóstico
        </Button>
      </div>

      {showAnswers && (
        <Card className="anim-rise mt-4 divide-y divide-line">
          <div id="answers">
            {QUESTIONS.map((q, i) => (
              <div key={q.id} className="flex items-start justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink-mute">{i + 1}. {q.title}</p>
                  <p className="mt-0.5 text-sm font-semibold">{q.options.find((o) => o.id === quiz.answers[q.id])?.label ?? '—'}</p>
                </div>
                <Link to={`/diagnostico?q=${i + 1}`} className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-brand hover:bg-brand-50">
                  <Pencil className="h-3.5 w-3.5" aria-hidden /> Editar
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function BandScale({ current }: { current: string }) {
  const bands = [
    { id: 'critica', label: '0–39', c: 'bg-bad' },
    { id: 'potencial', label: '40–59', c: 'bg-warn' },
    { id: 'desenvolvimento', label: '60–79', c: 'bg-brand' },
    { id: 'organizada', label: '80–100', c: 'bg-ok' },
  ];
  return (
    <div className="mt-4 grid w-full grid-cols-4 gap-1" aria-hidden>
      {bands.map((b) => (
        <div key={b.id}>
          <div className={`h-1.5 rounded-full ${b.c} ${current === b.id ? '' : 'opacity-25'}`} />
          <div className={`tabular mt-1 text-[10px] ${current === b.id ? 'font-bold text-ink' : 'text-ink-mute'}`}>{b.label}</div>
        </div>
      ))}
    </div>
  );
}

function MetricsCard({ metrics }: { metrics: ComputedMetrics }) {
  const items = [
    { label: 'Custo por contato (CPL)', value: metrics.cpl !== undefined ? formatBRL(metrics.cpl) : undefined },
    { label: 'Custo por venda (CPA)', value: metrics.cpa !== undefined ? formatBRL(metrics.cpa) : undefined },
    { label: 'Conversão contato → venda', value: metrics.leadToSale !== undefined ? formatPct(metrics.leadToSale) : undefined },
    { label: 'Receita atribuída estimada', value: metrics.revenue !== undefined ? formatBRL(metrics.revenue) : undefined },
    { label: 'ROAS estimado', value: metrics.roas !== undefined ? `${formatDec(metrics.roas)}x` : undefined },
  ];
  return (
    <section className="mt-8" aria-labelledby="metrics-title">
      <h2 id="metrics-title" className="text-xl font-bold">Indicadores dos últimos 30 dias</h2>
      <p className="mt-1 text-sm text-ink-soft">Estimativa baseada nos dados informados. Indicadores sem dados suficientes não são calculados.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {items.map((it) => (
          <div key={it.label} className="card p-4">
            <p className="text-xs font-semibold text-ink-mute">{it.label}</p>
            <p className={`tabular mt-1 text-xl font-bold ${it.value ? '' : 'text-ink-mute'}`}>{it.value ?? '—'}</p>
          </div>
        ))}
      </div>
      {metrics.roas !== undefined && (
        <p className="mt-2 text-xs text-ink-mute">ROAS compara receita e investimento; não representa lucro.</p>
      )}
      {metrics.warnings.map((w) => (
        <p key={w} role="status" className="mt-3 flex items-start gap-2 rounded-xl border border-warn bg-warn-50 p-3 text-sm text-warn-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {w}
        </p>
      ))}
    </section>
  );
}
