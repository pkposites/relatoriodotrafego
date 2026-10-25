import { ArrowLeft, ArrowRight, Info, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FieldInput } from '../components/FieldInput';
import { Button, ProgressBar } from '../components/ui';
import { isComplete, pruneHidden, resolve, screenComplete, visibleFields, visibleScreens } from '../domain/questionnaire';
import type { Answers, RawValue } from '../domain/types';
import { track } from '../lib/analytics';
import { loadQuiz, newQuiz, saveQuiz, type QuizState } from '../lib/storage';

const AUTO_ADVANCE_MS = 320;
/** Campos cuja mudança altera quais telas/campos aparecem. */
const BRANCHING = ['campanhas_status', 'caminho_venda', 'margem_faixa', 'ticket_faixa', 'plataformas'];

export function validUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export default function Quiz() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const editing = params.has('tela');
  const [state, setState] = useState<QuizState>(() => {
    const stored = loadQuiz() ?? newQuiz();
    const t = Number(params.get('tela'));
    return Number.isInteger(t) && t >= 1 ? { ...stored, screen: t - 1 } : stored;
  });
  const [resumed] = useState(() => !params.has('tela') && !!loadQuiz() && !loadQuiz()!.completedAt && Object.keys(loadQuiz()!.answers).length > 0);
  const [showResume, setShowResume] = useState(resumed);
  const [notice, setNotice] = useState<string>();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const timer = useRef<number>();

  const screens = useMemo(() => visibleScreens(state.answers), [state.answers]);
  const index = Math.min(state.screen, screens.length - 1);
  const screen = screens[index];
  const fields = visibleFields(screen, state.answers);
  const complete = screenComplete(screen, state.answers);
  const linkValue = typeof state.answers.link === 'string' ? state.answers.link : '';
  const linkError = fields.some((f) => f.id === 'link') && linkValue && !validUrl(linkValue) ? 'Use um endereço completo, começando com https://' : undefined;
  const note = screen.note?.(state.answers);

  useEffect(() => saveQuiz(state), [state]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
    track('tela_vista', { screen_id: screen.id, screen_index: index + 1 });
  }, [screen.id, index]);

  const goTo = (i: number) => {
    window.clearTimeout(timer.current);
    setNotice(undefined);
    setState((s) => ({ ...s, screen: Math.max(0, i) }));
  };

  const finish = (answers: Answers) => {
    if (!isComplete(answers)) {
      const first = visibleScreens(answers).findIndex((s) => !screenComplete(s, answers));
      setNotice('Falta responder algumas perguntas para gerar o resultado.');
      return goTo(first);
    }
    const completedAt = new Date().toISOString();
    const next = { ...state, answers, completedAt };
    setState(next);
    saveQuiz(next);
    track('diagnostico_concluido', { duration_s: Math.round((Date.parse(completedAt) - Date.parse(state.startedAt)) / 1000) });
    navigate('/resultado');
  };

  const next = (answers = state.answers) => {
    const list = visibleScreens(answers);
    if (index >= list.length - 1) return finish(answers);
    goTo(index + 1);
  };

  const change = (id: string, value: RawValue | undefined) => {
    window.clearTimeout(timer.current);
    setShowResume(false);
    setNotice(undefined);
    if (!Object.keys(state.answers).length) track('diagnostico_inicio');
    let answers: Answers = { ...state.answers, [id]: value };
    if (value === undefined) delete answers[id];
    if (BRANCHING.includes(id)) answers = pruneHidden(answers);
    setState((s) => ({ ...s, answers, completedAt: undefined }));
    // Avança sozinho só em telas de uma única pergunta de escolha única.
    const only = visibleFields(screen, answers);
    if (only.length === 1 && only[0].kind === 'single' && !screen.note?.(answers) && !editing) {
      timer.current = window.setTimeout(() => next(answers), AUTO_ADVANCE_MS);
    }
  };

  const restart = () => {
    window.clearTimeout(timer.current);
    setState(newQuiz());
    setShowResume(false);
    if (editing) setParams({}, { replace: true });
  };

  const progress = (index / screens.length) * 100;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-10 pt-6 sm:px-6 sm:pt-10">
      <div className="sr-only" aria-live="polite">{`Pergunta ${index + 1} de ${screens.length}`}</div>

      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="chip bg-brand-50 text-brand-700">{screen.stage}</span>
          <div className="flex items-center gap-3">
            <span className="tabular text-sm font-semibold text-ink-mute">
              {index + 1} de {screens.length}
            </span>
            {Object.keys(state.answers).length > 0 && (
              <button type="button" onClick={restart} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-ink-mute hover:text-ink">
                <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Recomeçar
              </button>
            )}
          </div>
        </div>
        <ProgressBar value={progress} label="Progresso do diagnóstico" />
      </div>

      {showResume && (
        <div className="anim-rise mb-4 flex flex-col gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-brand-700">
            <strong>Retomamos de onde você parou.</strong> Suas respostas ficaram salvas neste navegador.
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

      <div key={screen.id} className="anim-rise">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold leading-tight tracking-tight outline-none sm:text-[28px]">
          {resolve(screen.title, state.answers)}
        </h1>
        {screen.subtitle && <p className="mt-2 text-ink-soft">{resolve(screen.subtitle, state.answers)}</p>}

        <div className="mt-6 space-y-6">
          {fields.map((f) => (
            <FieldInput key={f.id} field={f} answers={state.answers} onChange={change} compact={fields.length > 1} />
          ))}
        </div>
        {linkError && <p role="alert" className="mt-2 text-xs font-semibold text-bad-700">{linkError}</p>}

        {note && (
          <div role="status" className="anim-rise mt-4 flex gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-700">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>{note}</p>
          </div>
        )}

        <div className="sticky bottom-0 -mx-4 mt-8 flex gap-3 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
          <Button variant="secondary" onClick={() => (index === 0 ? navigate('/') : goTo(index - 1))} className="flex-1 sm:flex-none">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar
          </Button>
          {editing && isComplete(state.answers) ? (
            <Button onClick={() => finish(state.answers)} className="flex-[2] sm:ml-auto sm:flex-none">
              Ver resultado atualizado <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          ) : (
            <Button onClick={() => next()} disabled={!complete || !!linkError} className="flex-[2] sm:ml-auto sm:flex-none">
              {index === screens.length - 1 ? 'Ver meu resultado' : 'Continuar'} <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
