import { ArrowLeft, ArrowRight, Check, Info, RotateCcw, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, ProgressBar } from '../components/ui';
import { QUESTIONS, STAGES, TOTAL_QUESTIONS, answerIds } from '../data/questions';
import { validateMetrics, type MetricField } from '../lib/metrics';
import { answeredCount, isAnswered, isComplete } from '../lib/scoring';
import { loadQuiz, newQuizState, saveQuiz, type QuizState } from '../lib/storage';
import type { AnswerValue, FreeContext, Question } from '../types';

const OPTIONAL_STEP = TOTAL_QUESTIONS;
const AUTO_ADVANCE_MS = 320;

type Screen = { kind: 'question' } | { kind: 'transition'; stage: number; to: number };

function initialState(param: string | null): { state: QuizState; resumed: boolean } {
  const stored = loadQuiz();
  const state = stored ?? newQuizState();
  const q = param ? Number(param) : NaN;
  if (Number.isInteger(q) && q >= 1 && q <= TOTAL_QUESTIONS) return { state: { ...state, step: q - 1 }, resumed: false };
  const resumed = !!stored && !stored.completedAt && (stored.step > 0 || answeredCount(stored.answers) > 0);
  return { state, resumed };
}

export default function Quiz() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [{ state: init, resumed }] = useState(() => initialState(params.get('q')));
  const [state, setState] = useState<QuizState>(init);
  const [screen, setScreen] = useState<Screen>({ kind: 'question' });
  const [showResume, setShowResume] = useState(resumed);
  const [notice, setNotice] = useState<string>();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const timer = useRef<number>();
  const editing = params.has('q');

  useEffect(() => saveQuiz(state), [state]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [state.step, screen.kind]);

  const answered = answeredCount(state.answers);
  const progress = (answered / TOTAL_QUESTIONS) * 100;

  const goTo = useCallback((step: number) => {
    setScreen({ kind: 'question' });
    setState((s) => ({ ...s, step }));
  }, []);

  const goNext = useCallback(
    (from: number) => {
      window.clearTimeout(timer.current);
      const to = from + 1;
      if (to >= OPTIONAL_STEP) return goTo(OPTIONAL_STEP);
      if (QUESTIONS[to].stage !== QUESTIONS[from].stage && !editing) {
        setScreen({ kind: 'transition', stage: QUESTIONS[to].stage, to });
        setState((s) => ({ ...s, step: to }));
        return;
      }
      goTo(to);
    },
    [goTo, editing],
  );

  const goBack = () => {
    window.clearTimeout(timer.current);
    setNotice(undefined);
    if (screen.kind === 'transition') return goTo(screen.to - 1);
    if (state.step === 0) return navigate('/');
    goTo(state.step - 1);
  };

  const restart = () => {
    window.clearTimeout(timer.current);
    const fresh = newQuizState();
    setState(fresh);
    setScreen({ kind: 'question' });
    setShowResume(false);
    setNotice(undefined);
    if (editing) setParams({}, { replace: true });
  };

  const choose = (q: Question, optionId: string) => {
    window.clearTimeout(timer.current);
    setNotice(undefined);
    setShowResume(false);
    const option = q.options.find((o) => o.id === optionId)!;
    if (q.multi) {
      // Múltipla escolha: alterna a opção; opções exclusivas desmarcam as demais. Sem avanço automático.
      setState((s) => {
        const current = answerIds(q.id, s.answers[q.id]);
        let next: string[];
        if (current.includes(optionId)) next = current.filter((id) => id !== optionId);
        else if (option.exclusive) next = [optionId];
        else next = [...current.filter((id) => !q.options.find((o) => o.id === id)?.exclusive), optionId];
        return { ...s, answers: { ...s.answers, [q.id]: next }, completedAt: undefined };
      });
      return;
    }
    setState((s) => ({ ...s, answers: { ...s.answers, [q.id]: optionId }, completedAt: undefined }));
    if (!option.note) {
      const from = state.step;
      timer.current = window.setTimeout(() => goNext(from), AUTO_ADVANCE_MS);
    }
  };

  // Transição automática entre etapas (também pode avançar pelo botão).
  useEffect(() => {
    if (screen.kind !== 'transition') return;
    const t = window.setTimeout(() => setScreen({ kind: 'question' }), 2200);
    return () => window.clearTimeout(t);
  }, [screen]);

  const finish = (metrics?: QuizState['metrics'], skipped = false) => {
    if (!isComplete(state.answers)) {
      const first = QUESTIONS.findIndex((q) => !isAnswered(q, state.answers));
      setNotice('Falta responder algumas perguntas para gerar o resultado.');
      return goTo(Math.max(0, first));
    }
    const next = { ...state, metrics, metricsSkipped: skipped, completedAt: new Date().toISOString() };
    setState(next);
    saveQuiz(next);
    navigate('/resultado');
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-10 pt-6 sm:px-6 sm:pt-10">
      <div className="sr-only" aria-live="polite">
        {state.step < OPTIONAL_STEP ? `Pergunta ${state.step + 1} de ${TOTAL_QUESTIONS}` : 'Dados complementares opcionais'}
      </div>

      <QuizTopBar step={state.step} progress={progress} answered={answered} onRestart={restart} />

      {showResume && (
        <div className="anim-rise mb-4 flex flex-col gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-brand-700">
            <strong>Retomamos de onde você parou.</strong> Suas respostas anteriores foram mantidas neste navegador.
          </p>
          <Button variant="secondary" className="h-9 shrink-0 px-3 text-sm" onClick={restart}>
            <RotateCcw className="h-4 w-4" aria-hidden /> Recomeçar
          </Button>
        </div>
      )}

      {notice && (
        <div role="alert" className="mb-4 rounded-xl border border-warn bg-warn-50 p-3 text-sm text-warn-700">
          {notice}
        </div>
      )}

      {screen.kind === 'transition' ? (
        <StageTransition stage={screen.stage} headingRef={headingRef} onContinue={() => setScreen({ kind: 'question' })} onBack={goBack} />
      ) : state.step >= OPTIONAL_STEP ? (
        <OptionalMetrics
          key="optional"
          state={state}
          headingRef={headingRef}
          onChange={(metricsRaw) => setState((s) => ({ ...s, metricsRaw }))}
          onContextChange={(context) => setState((s) => ({ ...s, context }))}
          onBack={goBack}
          onFinish={finish}
        />
      ) : (
        <QuestionScreen
          key={state.step}
          step={state.step}
          value={state.answers[QUESTIONS[state.step].id]}
          headingRef={headingRef}
          onChoose={choose}
          onBack={goBack}
          onNext={() => goNext(state.step)}
          showResult={editing && isComplete(state.answers) ? () => finish(state.metrics, !!state.metricsSkipped) : undefined}
        />
      )}
    </div>
  );
}

function QuizTopBar({ step, progress, answered, onRestart }: { step: number; progress: number; answered: number; onRestart: () => void }) {
  const stage = step < OPTIONAL_STEP ? QUESTIONS[step].stage : STAGES.length;
  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <ol className="flex gap-1.5" aria-label="Etapas">
          {STAGES.map((s) => (
            <li
              key={s.id}
              aria-current={s.id === stage ? 'step' : undefined}
              className={`h-1.5 w-8 rounded-full transition-colors sm:w-12 ${s.id < stage ? 'bg-brand' : s.id === stage ? 'bg-brand/60' : 'bg-[#EAECF0]'}`}
              title={`Etapa ${s.id}: ${s.name}`}
            />
          ))}
        </ol>
        {answered > 0 && (
          <button type="button" onClick={onRestart} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-ink-mute hover:text-ink">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Recomeçar
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <ProgressBar value={progress} label="Progresso do diagnóstico" />
        <span className="tabular w-10 shrink-0 text-right text-xs font-bold text-ink-soft">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}

function StageTransition({
  stage,
  headingRef,
  onContinue,
  onBack,
}: {
  stage: number;
  headingRef: React.RefObject<HTMLHeadingElement>;
  onContinue: () => void;
  onBack: () => void;
}) {
  const s = STAGES[stage - 1];
  return (
    <div className="card anim-rise p-6 text-center sm:p-10">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand">
        <Sparkles className="h-6 w-6" aria-hidden />
      </span>
      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-brand">
        Etapa {s.id} de {STAGES.length} · {s.name}
      </p>
      <h1 ref={headingRef} tabIndex={-1} className="mx-auto mt-2 max-w-md text-2xl font-bold tracking-tight outline-none">
        {s.intro}
      </h1>
      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar
        </Button>
        <Button onClick={onContinue}>
          Continuar <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function QuestionScreen({
  step,
  value,
  headingRef,
  onChoose,
  onBack,
  onNext,
  showResult,
}: {
  step: number;
  value?: AnswerValue;
  headingRef: React.RefObject<HTMLHeadingElement>;
  onChoose: (q: Question, optionId: string) => void;
  onBack: () => void;
  onNext: () => void;
  showResult?: () => void;
}) {
  const q = QUESTIONS[step];
  const stage = STAGES[q.stage - 1];
  const chosen = answerIds(q.id, value);
  const selected = chosen.length > 0;
  const note = q.options.find((o) => chosen.includes(o.id))?.note;
  const headingId = `q-${q.id}`;

  return (
    <div className="anim-rise">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="chip bg-brand-50 text-brand-700">Etapa {q.stage} · {stage.name}</span>
        <span className="tabular text-sm font-semibold text-ink-mute">
          {step + 1} de {TOTAL_QUESTIONS}
        </span>
      </div>
      <h1 ref={headingRef} id={headingId} tabIndex={-1} className="text-2xl font-bold leading-tight tracking-tight outline-none sm:text-[28px]">
        {q.title}
      </h1>
      <p className="mt-2 text-ink-soft">{q.subtitle}</p>
      {q.multi && <p className="mt-1 text-sm font-semibold text-brand">Marque uma ou mais opções.</p>}

      <div role="group" aria-labelledby={headingId} className="mt-6 space-y-2.5">
        {q.options.map((o) => {
          const active = chosen.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChoose(q, o.id)}
              className={`group flex min-h-[56px] w-full items-center gap-3 rounded-xl border bg-white px-4 py-3.5 text-left text-[15px] font-medium transition-all duration-150 sm:text-base ${
                active
                  ? 'border-brand bg-brand-50/60 shadow-[0_0_0_3px_rgba(8,102,255,0.12)]'
                  : 'border-line hover:border-[#B2CCFF] hover:bg-[#F8FAFF]'
              }`}
            >
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center ${q.multi ? 'rounded-md' : 'rounded-full'} border-2 transition-colors ${
                  active ? 'border-brand bg-brand text-white' : 'border-[#D0D5DD] group-hover:border-brand/50'
                }`}
                aria-hidden
              >
                {active && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <span>{o.label}</span>
            </button>
          );
        })}
      </div>

      {note && (
        <div role="status" className="anim-rise mt-4 flex gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-700">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>{note}</p>
        </div>
      )}

      <div className="sticky bottom-0 -mx-4 mt-8 flex gap-3 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <Button variant="secondary" onClick={onBack} className="flex-1 sm:flex-none">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar
        </Button>
        {showResult ? (
          <Button onClick={showResult} className="flex-[2] sm:ml-auto sm:flex-none">
            Ver resultado atualizado <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        ) : (
          <Button onClick={onNext} disabled={!selected} className={`flex-[2] sm:ml-auto sm:flex-none ${note || (q.multi && selected) ? 'ring-4 ring-brand-100' : ''}`}>
            Continuar <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}

const METRIC_FIELDS: { key: MetricField; label: string; prefix?: string; hint: string; inputMode: 'decimal' | 'numeric' }[] = [
  { key: 'investment', label: 'Investimento total em anúncios', prefix: 'R$', hint: 'Soma de todas as plataformas', inputMode: 'decimal' },
  { key: 'leads', label: 'Leads / contatos atribuídos aos anúncios', hint: 'Mensagens, formulários ou ligações', inputMode: 'numeric' },
  { key: 'sales', label: 'Vendas atribuídas aos anúncios', hint: 'Somente vendas fechadas', inputMode: 'numeric' },
  { key: 'avgTicket', label: 'Ticket médio da venda', prefix: 'R$', hint: 'Valor médio de cada venda', inputMode: 'decimal' },
];

function OptionalMetrics({
  state,
  headingRef,
  onChange,
  onContextChange,
  onBack,
  onFinish,
}: {
  state: QuizState;
  headingRef: React.RefObject<HTMLHeadingElement>;
  onChange: (raw: QuizState['metricsRaw']) => void;
  onContextChange: (context: FreeContext) => void;
  onBack: () => void;
  onFinish: (metrics?: QuizState['metrics'], skipped?: boolean) => void;
}) {
  const [errors, setErrors] = useState<Partial<Record<MetricField, string>>>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const { values, errors } = validateMetrics(state.metricsRaw);
    setErrors(errors);
    if (Object.keys(errors).length) {
      document.getElementById(`m-${Object.keys(errors)[0]}`)?.focus();
      return;
    }
    onFinish(Object.keys(values).length ? values : undefined, Object.keys(values).length === 0);
  };

  return (
    <form className="anim-rise" onSubmit={submit} noValidate>
      <span className="chip bg-ok-50 text-[#067647]">Opcional</span>
      <h1 ref={headingRef} tabIndex={-1} className="mt-3 text-2xl font-bold leading-tight tracking-tight outline-none sm:text-[28px]">
        Deixe seu diagnóstico mais preciso
      </h1>
      <p className="mt-2 text-ink-soft">
        Considere os <strong className="text-ink">últimos 30 dias</strong>. Você pode pular números que não conhece — não sabe? Sem problemas.
      </p>

      <div className="card mt-6 grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
        {METRIC_FIELDS.map((f) => (
          <div key={f.key}>
            <label htmlFor={`m-${f.key}`} className="label">
              {f.label}
            </label>
            <div className="relative">
              {f.prefix && <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-mute">{f.prefix}</span>}
              <input
                id={`m-${f.key}`}
                className={`input tabular ${f.prefix ? 'pl-11' : ''}`}
                inputMode={f.inputMode}
                autoComplete="off"
                placeholder={f.prefix ? '0,00' : '0'}
                value={state.metricsRaw[f.key]}
                aria-invalid={!!errors[f.key]}
                aria-describedby={`m-${f.key}-hint`}
                onChange={(e) => {
                  onChange({ ...state.metricsRaw, [f.key]: e.target.value });
                  if (errors[f.key]) setErrors((x) => ({ ...x, [f.key]: undefined }));
                }}
              />
            </div>
            <p id={`m-${f.key}-hint`} className={`mt-1.5 text-xs ${errors[f.key] ? 'font-semibold text-bad-700' : 'text-ink-mute'}`}>
              {errors[f.key] ?? f.hint}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-mute">Os números ficam apenas neste navegador e servem para estimativas baseadas nos dados informados.</p>

      <div className="card mt-5 grid gap-5 p-5 sm:p-6">
        <div>
          <p className="font-bold">Contexto para a análise (opcional)</p>
          <p className="mt-0.5 text-sm text-ink-soft">Quanto mais contexto, mais personalizado fica o relatório completo.</p>
        </div>
        <div>
          <label htmlFor="ctx-produto" className="label">O que você vende e para quem?</label>
          <textarea
            id="ctx-produto"
            rows={2}
            maxLength={300}
            className="input resize-y"
            placeholder="Ex.: harmonização facial para mulheres de 30 a 50 anos em Campinas"
            value={state.context?.produto ?? ''}
            onChange={(e) => onContextChange({ ...state.context, produto: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="ctx-obs" className="label">Algo mais que devemos saber?</label>
          <textarea
            id="ctx-obs"
            rows={3}
            maxLength={600}
            className="input resize-y"
            placeholder="Ex.: os resultados caíram depois de março; o melhor mês foi dezembro; vendemos mais pelo WhatsApp"
            value={state.context?.observacoes ?? ''}
            onChange={(e) => onContextChange({ ...state.context, observacoes: e.target.value })}
          />
          <p className="mt-1.5 text-xs text-ink-mute">Não inclua dados pessoais de clientes (nomes, telefones, documentos).</p>
        </div>
      </div>

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar
        </Button>
        <Button variant="ghost" onClick={() => onFinish(undefined, true)} className="sm:ml-auto">
          Pular esta etapa
        </Button>
        <Button type="submit" size="lg">
          Ver meu resultado <ArrowRight className="h-5 w-5" aria-hidden />
        </Button>
      </div>
    </form>
  );
}
