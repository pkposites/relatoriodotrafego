import type { Band, PillarResult } from '../types';
import { Badge } from './ui';

const TONE_HEX: Record<Band['tone'], string> = { bad: '#EF4444', warn: '#F59E0B', brand: '#0866FF', ok: '#16A34A' };

export function toneForScore(score: number): Band['tone'] {
  if (score < 40) return 'bad';
  if (score < 60) return 'warn';
  if (score < 80) return 'brand';
  return 'ok';
}

export function ScoreGauge({ score, band, size = 168 }: { score: number; band: Band; size?: number }) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(100, score)) / 100);
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EAECF0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={TONE_HEX[band.tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(.2,.7,.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="tabular text-5xl font-extrabold tracking-tight">{score}</div>
          <div className="text-xs font-semibold text-ink-mute">de 100</div>
        </div>
      </div>
    </div>
  );
}

const BAR: Record<Band['tone'], string> = { bad: 'bg-bad', warn: 'bg-warn', brand: 'bg-brand', ok: 'bg-ok' };

export function PillarBars({ pillars }: { pillars: PillarResult[] }) {
  return (
    <ul className="space-y-4">
      {pillars.map((p, i) => (
        <li key={p.id}>
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="text-sm font-semibold">
              {p.name} <span className="font-normal text-ink-mute">· peso {p.weight}</span>
            </span>
            <span className="flex items-center gap-2">
              {p.evidenceLevel === 'limitada' && <Badge tone="neutral">Evidência limitada</Badge>}
              {p.evidenceLevel === 'parcial' && <Badge tone="neutral">Evidência parcial</Badge>}
              <span className="tabular text-sm font-bold">{p.score}</span>
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#EAECF0]">
            <div
              className={`anim-grow h-full rounded-full ${BAR[toneForScore(p.score)]} ${p.evidenceLevel === 'limitada' ? 'opacity-50' : ''}`}
              style={{ width: `${Math.max(2, p.score)}%`, animationDelay: `${i * 80}ms` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Barras horizontais simples para distribuições no painel. */
export function DistributionList({ items, total }: { items: { label: string; count: number }[]; total: number }) {
  return (
    <ul className="space-y-2.5">
      {items.map((it) => (
        <li key={it.label}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-ink-soft" title={it.label}>{it.label}</span>
            <span className="tabular font-semibold">{it.count}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#EAECF0]">
            <div className="h-full rounded-full bg-brand" style={{ width: `${total ? (it.count / total) * 100 : 0}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
