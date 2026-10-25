import { Check, FileText, Lightbulb, Loader2, Target } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { TOTAL_QUESTIONS } from '../data/questions';

/**
 * Demonstração animada (≈10 s, em loop) do produto: parte do quiz sendo
 * respondida e o resultado aparecendo. Todos os valores são ilustrativos.
 */

const DEMO_QUESTIONS = [
  {
    n: 11,
    title: 'Você sabe quantas vendas vieram dos anúncios no último mês?',
    options: ['Sim, com números confiáveis', 'Tenho uma estimativa', 'Acompanho leads, não vendas'],
    pick: 2,
  },
  {
    n: 15,
    title: 'Para qual resultado as campanhas são otimizadas?',
    options: ['Vendas no site', 'Mensagens no WhatsApp', 'Cliques ou engajamento'],
    pick: 2,
  },
  {
    n: 22,
    title: 'Quanto tempo leva para responder um novo contato?',
    options: ['Até 5 minutos', 'Até 1 hora', 'No mesmo dia'],
    pick: 2,
  },
];

const BARS = [
  { label: 'Mensuração', value: 42, color: 'bg-warn' },
  { label: 'Criativos', value: 68, color: 'bg-brand' },
  { label: 'Conversão', value: 31, color: 'bg-bad' },
];

const SCORE = 54;
const CYCLE_MS = 10000;

type Frame =
  | { phase: 'quiz'; q: number; picked: boolean }
  | { phase: 'loading' }
  | { phase: 'result' };

/** Linha do tempo de um ciclo: [início em ms, quadro]. */
const TIMELINE: [number, Frame][] = [
  [0, { phase: 'quiz', q: 0, picked: false }],
  [900, { phase: 'quiz', q: 0, picked: true }],
  [1600, { phase: 'quiz', q: 1, picked: false }],
  [2500, { phase: 'quiz', q: 1, picked: true }],
  [3200, { phase: 'quiz', q: 2, picked: false }],
  [4100, { phase: 'quiz', q: 2, picked: true }],
  [4800, { phase: 'loading' }],
  [5800, { phase: 'result' }],
];

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function useCountUp(target: number, active: boolean, duration = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active) {
      setV(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return v;
}

export default function HeroDemo() {
  const reduced = useRef(prefersReducedMotion()).current;
  const [frame, setFrame] = useState<Frame>(reduced ? { phase: 'result' } : TIMELINE[0][1]);
  const [cycle, setCycle] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  // Só anima quando o cartão está na tela.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || !visible) return;
    const timers = TIMELINE.map(([at, f]) => window.setTimeout(() => setFrame(f), at));
    timers.push(window.setTimeout(() => setCycle((c) => c + 1), CYCLE_MS));
    return () => timers.forEach(clearTimeout);
  }, [cycle, reduced, visible]);

  const showResult = frame.phase === 'result';
  const score = useCountUp(SCORE, showResult);
  const step = frame.phase === 'quiz' ? 1 : 2;
  const progress = frame.phase === 'quiz' ? [42, 75, 92][frame.q] : 100;

  return (
    <div ref={rootRef} className="card relative overflow-hidden p-5 sm:p-6" aria-label="Demonstração ilustrativa: responda ao quiz e receba seu relatório">
      {/* Cabeçalho com etapas */}
      <div className="flex items-center justify-between gap-3">
        <ol className="flex items-center gap-2 text-xs font-semibold" aria-hidden>
          <li className={`flex items-center gap-1.5 transition-colors ${step === 1 ? 'text-brand' : 'text-ink-mute'}`}>
            <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] transition-colors ${step === 1 ? 'bg-brand text-white' : 'bg-ok text-white'}`}>
              {step === 1 ? '1' : <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            Responda
          </li>
          <li className="h-px w-4 bg-line" />
          <li className={`flex items-center gap-1.5 transition-colors ${step === 2 ? 'text-brand' : 'text-ink-mute'}`}>
            <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] transition-colors ${step === 2 ? 'bg-brand text-white' : 'bg-[#EAECF0] text-ink-mute'}`}>2</span>
            Seu relatório
          </li>
        </ol>
        <span className="chip shrink-0 border border-dashed border-ink-mute/40 bg-[#F9FAFB] text-ink-mute">Dados ilustrativos</span>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#EAECF0]">
        <div className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <div className="relative mt-5 min-h-[410px] sm:min-h-[350px]">
        {frame.phase === 'quiz' && <QuizFrame key={`${cycle}-${frame.q}`} q={frame.q} picked={frame.picked} />}

        {frame.phase === 'loading' && (
          <div key={`${cycle}-loading`} className="anim-rise absolute inset-0 grid place-items-center text-center">
            <div>
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand" aria-hidden />
              <p className="mt-3 font-semibold">Calculando seu índice…</p>
              <p className="text-sm text-ink-mute">Analisando os cinco pilares</p>
            </div>
          </div>
        )}

        {showResult && (
          <div key={`${cycle}-result`} className="anim-rise">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-mute">Seu Relatório do Tráfego</p>
            <div className="mt-1 flex items-end gap-3">
              <span className="tabular text-5xl font-extrabold tracking-tight">{score}</span>
              <span className="mb-1.5 text-sm text-ink-mute">/ 100</span>
              <span className="chip mb-2 ml-auto bg-warn-50 text-warn-700">Alto potencial de melhoria</span>
            </div>
            <ul className="mt-4 space-y-3">
              {BARS.map((b, i) => (
                <li key={b.label}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold">{b.label}</span>
                    <span className="tabular font-bold">{b.value}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[#EAECF0]">
                    <div className={`anim-grow h-full rounded-full ${b.color}`} style={{ width: `${b.value}%`, animationDelay: `${150 + i * 120}ms` }} />
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="anim-rise rounded-xl bg-bad-50 p-3 [animation-delay:700ms]">
                <p className="flex items-center gap-1.5 text-xs font-bold text-bad-700">
                  <Target className="h-3.5 w-3.5" aria-hidden /> Principal ponto de atenção
                </p>
                <p className="mt-0.5 text-sm text-ink">Acompanhamento do contato até a venda</p>
              </div>
              <div className="anim-rise rounded-xl bg-brand-50 p-3 [animation-delay:1100ms]">
                <p className="flex items-center gap-1.5 text-xs font-bold text-brand-700">
                  <Lightbulb className="h-3.5 w-3.5" aria-hidden /> Primeiro passo
                </p>
                <p className="mt-0.5 text-sm text-ink">Registrar o status de cada contato</p>
              </div>
            </div>
            <p className="anim-rise mt-3 flex items-center gap-1.5 text-xs text-ink-mute [animation-delay:1500ms]">
              <FileText className="h-3.5 w-3.5" aria-hidden /> + plano de ação completo em PDF (opcional)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function QuizFrame({ q, picked }: { q: number; picked: boolean }) {
  const d = DEMO_QUESTIONS[q];
  return (
    <div className="anim-rise">
      <p className="tabular text-xs font-semibold text-ink-mute">Pergunta {d.n} de {TOTAL_QUESTIONS}</p>
      <p className="mt-1 text-lg font-bold leading-snug">{d.title}</p>
      <ul className="mt-4 space-y-2">
        {d.options.map((o, i) => {
          const active = picked && i === d.pick;
          return (
            <li
              key={o}
              className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 text-sm font-medium transition-all duration-200 ${
                active ? 'scale-[1.01] border-brand bg-brand-50/60 shadow-[0_0_0_3px_rgba(8,102,255,0.12)]' : 'border-line bg-white'
              }`}
            >
              <span
                className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 transition-colors ${active ? 'border-brand bg-brand text-white' : 'border-[#D0D5DD]'}`}
              >
                {active && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
              </span>
              {o}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
