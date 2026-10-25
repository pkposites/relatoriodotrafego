import { ArrowRight, Check, CheckCircle2, ChevronDown, CircleDashed, ClipboardList, Compass, Info, Lightbulb, Lock, Pencil, RotateCcw, ShieldAlert, Target } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PillarBars, ScoreGauge } from '../components/charts';
import { Badge, Button, Card, LinkButton } from '../components/ui';
import { IS_DEMO } from '../config/env';
import { PRODUCTS } from '../data/plans';
import { buildDiagnostic, profileText, strengthOf } from '../domain/diagnostic';
import { optionLabel, resolve, visibleFields, visibleScreens } from '../domain/questionnaire';
import { PILLARS } from '../domain/scoring';
import type { ReadinessItem } from '../domain/types';
import { track } from '../lib/analytics';
import { clearQuiz, loadQuiz } from '../lib/storage';

const READY: Record<ReadinessItem['status'], { label: string; icon: typeof Check; cls: string }> = {
  pronto: { label: 'Pronto', icon: CheckCircle2, cls: 'text-[#067647]' },
  parcial: { label: 'Parcial', icon: CircleDashed, cls: 'text-warn-700' },
  pendente: { label: 'Pendente', icon: CircleDashed, cls: 'text-bad-700' },
};

export default function Result() {
  const navigate = useNavigate();
  const quiz = useMemo(() => loadQuiz(), []);
  const ready = !!quiz?.completedAt;
  const d = useMemo(
    () =>
      quiz && ready
        ? buildDiagnostic({
            id: quiz.sessionId,
            environment: IS_DEMO ? 'demo' : 'production',
            answers: quiz.answers,
            links: typeof quiz.answers.link === 'string' && quiz.answers.link ? [{ url: quiz.answers.link, status: 'informado' }] : [],
          })
        : undefined,
    [quiz, ready],
  );
  const [showAnswers, setShowAnswers] = useState(false);
  useEffect(() => {
    if (d) track('resultado_visto', { mode: d.record.assessment.mode });
  }, [d]);

  if (!quiz || !d) {
    const partial = quiz && Object.keys(quiz.answers).length > 0;
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand">
          <ClipboardList className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-bold">Ainda não há um resultado por aqui</h1>
        <p className="mt-2 text-ink-soft">{partial ? 'Seu diagnóstico está incompleto. Continue de onde parou.' : 'Responda ao diagnóstico para ver sua avaliação gratuita.'}</p>
        <LinkButton to="/diagnostico" size="lg" className="mt-6">
          {partial ? 'Continuar diagnóstico' : 'Começar diagnóstico'} <ArrowRight className="h-5 w-5" aria-hidden />
        </LinkButton>
      </div>
    );
  }

  const a = quiz.answers;
  const as = d.record.assessment;
  const pr = d.prioritized;
  const main = pr.structural ?? pr.ordered[0];
  const first = pr.quickWin ?? main;
  const strength = strengthOf(d);
  const others = pr.ordered.filter((f) => f.id !== main?.id && f.id !== first?.id).slice(0, 4);
  const hasLink = d.record.evidence.links.length > 0;
  const plan = PRODUCTS.plano;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-6 pt-6 sm:px-6 sm:pt-10">
      <p className="text-xs font-bold uppercase tracking-wider text-brand">Avaliação gratuita</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Seu Relatório do Tráfego</h1>

      <Card className="mt-5 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Compass className="h-4 w-4 text-brand" aria-hidden /> Seu perfil
        </div>
        <p className="mt-2">{profileText(a)}</p>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]" aria-live="polite">
        <Card className="flex flex-col items-center p-6 text-center">
          {as.mode === 'maturidade' && as.maturity !== null && as.band ? (
            <>
              <p className="text-sm font-semibold text-ink-soft">Maturidade declarada</p>
              <div className="my-4">
                <ScoreGauge score={as.maturity} band={as.band} />
              </div>
              <Badge tone={as.band.tone}>{as.band.label}</Badge>
              <p className="mt-3 text-xs text-ink-mute">Indicador baseado nas suas respostas — não mede o desempenho das campanhas.</p>
            </>
          ) : as.mode === 'prontidao' ? (
            <>
              <p className="text-sm font-semibold text-ink-soft">Avaliação de preparação</p>
              <p className="mt-3 text-sm text-ink-soft">Como você ainda não anuncia, não damos nota de campanha. Veja o que já está pronto para começar.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-ink-soft">Maturidade declarada</p>
              <p className="mt-3 text-sm text-ink-soft">Há respostas “não sei” demais para uma nota honesta. Veja abaixo o que levantar primeiro.</p>
            </>
          )}
          <div className="mt-5 w-full rounded-xl bg-canvas p-3 text-left text-sm">
            <p className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-mute" aria-hidden />
              <span>{as.confidenceStatement}</span>
            </p>
          </div>
        </Card>
        <Card className="min-w-0 p-6">
          {as.mode === 'prontidao' ? (
            <>
              <h2 className="mb-4 text-lg font-bold">O que já está pronto</h2>
              <ul className="space-y-3">
                {as.readiness!.map((r) => {
                  const s = READY[r.status];
                  return (
                    <li key={r.id} className="flex gap-3">
                      <s.icon className={`mt-0.5 h-5 w-5 shrink-0 ${s.cls}`} aria-hidden />
                      <div>
                        <p className="font-semibold">
                          {r.label} <span className={`text-xs font-bold ${s.cls}`}>· {s.label}</span>
                        </p>
                        <p className="text-sm text-ink-soft">{r.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <>
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold">Cinco pilares</h2>
                <span className="text-xs text-ink-mute">0–100</span>
              </div>
              <PillarBars pillars={as.pillars} />
            </>
          )}
        </Card>
      </div>

      {as.adjustments.length > 0 && (
        <Card className="mt-4 p-5">
          <p className="flex items-center gap-2 text-sm font-bold">
            <Lock className="h-4 w-4 text-warn-700" aria-hidden /> Por que a nota não é maior
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
            {as.adjustments.map((x) => (
              <li key={x.reason}>
                <strong className="text-ink">{x.scope === 'geral' ? 'Nota geral' : PILLARS[x.scope].name}: máximo {x.limit}.</strong> {x.reason}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {main && (
        <section className="mt-8" aria-labelledby="hip">
          <h2 id="hip" className="flex items-center gap-2 text-xl font-bold">
            <Target className="h-5 w-5 text-bad" aria-hidden /> Principal hipótese
          </h2>
          <Card className="mt-3 p-5 sm:p-6">
            <p className="text-lg font-bold">{main.title}</p>
            <p className="mt-2">{main.hypothesis}</p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-semibold">O que você informou</dt>
                <dd className="text-ink-soft">{main.fact}</dd>
              </div>
              <div>
                <dt className="font-semibold">Como confirmar</dt>
                <dd className="text-ink-soft">{main.howToConfirm}</dd>
              </div>
            </dl>
          </Card>
        </section>
      )}

      {first && (
        <section className="mt-6" aria-labelledby="acao">
          <h2 id="acao" className="flex items-center gap-2 text-xl font-bold">
            <Lightbulb className="h-5 w-5 text-brand" aria-hidden /> Uma ação para começar
          </h2>
          <Card className="mt-3 border-l-4 border-l-brand p-5 sm:p-6">
            <p className="text-lg font-bold">{first.action.what}</p>
            <p className="mt-1 text-sm text-ink-soft">{first.action.why}</p>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
              {first.action.how.slice(0, 3).map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ol>
            <p className="mt-3 text-sm">
              <strong>Pronto quando:</strong> {first.action.doneCriteria}
            </p>
            {pr.quickWinRationale && first.id !== main?.id && (
              <p className="mt-3 rounded-lg bg-brand-50 p-3 text-sm text-brand-700">
                <strong>Por que esta ação vem antes da principal hipótese?</strong> {pr.quickWinRationale}
              </p>
            )}
          </Card>
        </section>
      )}

      {strength && (
        <p className="mt-4 rounded-xl border border-ok bg-ok-50 p-4 text-sm text-[#067647]">
          <strong>Ponto já estruturado: {strength.pillar}.</strong> {strength.text}
        </p>
      )}

      {others.length > 0 && (
        <Card className="mt-6 p-5">
          <p className="font-bold">Também identificamos</p>
          <ul className="mt-2 space-y-1 text-sm text-ink-soft">
            {others.map((f) => (
              <li key={f.id}>• {f.title}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-mute">No Plano de Ação do Tráfego cada item vem com fato, evidência, ação e critério de conclusão.</p>
        </Card>
      )}

      <Card className="mt-6 p-5">
        <p className="flex items-center gap-2 font-bold">
          <ShieldAlert className="h-4 w-4 text-ink-mute" aria-hidden /> Limitações desta avaliação
        </p>
        <ul className="mt-2 space-y-1 text-sm text-ink-soft">
          <li>• Baseada nas suas respostas. Não acessamos contas de anúncio, site ou criativos.</li>
          {hasLink && <li>• O link que você informou foi registrado, mas não foi acessado.</li>}
          {as.coverage.unknownFields.length > 0 && <li>• {as.coverage.unknownFields.length} resposta(s) “não sei” ficaram fora da nota.</li>}
          <li>• {as.confidenceStatement}</li>
        </ul>
      </Card>

      <section className="card mt-8 overflow-hidden border-2 border-brand shadow-lift" aria-labelledby="oferta">
        <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div>
            <h2 id="oferta" className="text-2xl font-extrabold tracking-tight">{plan.name}</h2>
            <p className="mt-2 text-ink-soft">A avaliação gratuita mostra a principal hipótese. O plano mostra o que fazer, em que ordem e como verificar.</p>
            <ul className="mt-4 space-y-2 text-sm">
              {['Relação entre cada resposta e cada prioridade', 'Cálculos compatíveis com os seus números', 'Sequência de execução em sete dias', 'Modelos aplicáveis ao seu caso', 'Critérios de conclusão e plano de acompanhamento'].map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden /> {f}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-ink-mute">
              Depois da compra, você pode gerar com o que já informou ou responder um aprofundamento curto e opcional. O plano é montado por regras e cálculos do sistema, com apoio de IA na redação, e conferido automaticamente antes da entrega.
            </p>
          </div>
          <div className="rounded-2xl bg-canvas p-5 text-center">
            <p className="tabular text-4xl font-extrabold tracking-tight">{plan.price}</p>
            <p className="text-xs text-ink-mute">{plan.priceNote}</p>
            <LinkButton to={plan.href} size="lg" className="mt-4 h-auto w-full py-3" onClick={() => track('oferta_clique', { plan: 'plano', source: 'resultado' })}>
              {plan.cta}
            </LinkButton>
            <Link to="/amostra" className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">
              Ver um plano de exemplo
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Button variant="secondary" onClick={() => setShowAnswers((v) => !v)} aria-expanded={showAnswers} aria-controls="answers">
          <ChevronDown className={`h-4 w-4 transition-transform ${showAnswers ? 'rotate-180' : ''}`} aria-hidden /> Revisar respostas
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            clearQuiz();
            navigate('/diagnostico');
          }}
        >
          <RotateCcw className="h-4 w-4" aria-hidden /> Refazer diagnóstico
        </Button>
      </div>

      {showAnswers && (
        <Card className="anim-rise mt-4 divide-y divide-line">
          <div id="answers">
            {visibleScreens(a).map((s, i) => (
              <div key={s.id} className="flex items-start justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink-mute">
                    {i + 1}. {resolve(s.title, a)}
                  </p>
                  {visibleFields(s, a).map((f) => (
                    <p key={f.id} className="mt-0.5 break-words text-sm">
                      <span className="text-ink-mute">{resolve(f.label, a)}: </span>
                      <strong>{optionLabel(f.id, a[f.id], a) ?? '—'}</strong>
                    </p>
                  ))}
                </div>
                <Link to={`/diagnostico?tela=${i + 1}`} className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-brand hover:bg-brand-50">
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
