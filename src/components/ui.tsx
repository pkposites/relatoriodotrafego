import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 select-none disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]';
const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white shadow-sm hover:bg-brand-600 active:bg-brand-700',
  secondary: 'border border-line bg-white text-ink hover:bg-[#F9FAFB] hover:border-[#D0D5DD]',
  ghost: 'text-brand hover:bg-brand-50',
};
const sizes: Record<Size, string> = {
  md: 'h-11 px-4 text-[15px]',
  lg: 'h-[52px] px-6 text-base',
};

export function btnClass(variant: Variant = 'primary', size: Size = 'md', extra = '') {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={btnClass(variant, size, className)} {...rest} />;
}

export function LinkButton({
  to,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
}: {
  to: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className={btnClass(variant, size, className)}>
      {children}
    </Link>
  );
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`card ${className}`}>{children}</div>;
}

type Tone = 'brand' | 'ok' | 'warn' | 'bad' | 'neutral';
const tones: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-700',
  ok: 'bg-ok-50 text-[#067647]',
  warn: 'bg-warn-50 text-warn-700',
  bad: 'bg-bad-50 text-bad-700',
  neutral: 'bg-[#F2F4F7] text-ink-soft',
};

export function Badge({ tone = 'neutral', className = '', children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return <span className={`chip ${tones[tone]} ${className}`}>{children}</span>;
}

export function DemoBanner({ children }: { children: ReactNode }) {
  return (
    <div role="note" className="rounded-xl border border-dashed border-warn bg-warn-50 px-4 py-3 text-sm text-warn-700">
      {children}
    </div>
  );
}

export function SectionTitle({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-6 max-w-2xl">
      {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-wider text-brand">{eyebrow}</p>}
      <h2 className="text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h2>
      {subtitle && <p className="mt-2 text-ink-soft">{subtitle}</p>}
    </div>
  );
}

export function ProgressBar({ value, label, tone = 'brand' }: { value: number; label?: string; tone?: Tone }) {
  const color = { brand: 'bg-brand', ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad', neutral: 'bg-ink-mute' }[tone];
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-[#EAECF0]"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      aria-label={label}
    >
      <div className={`h-full rounded-full ${color} transition-[width] duration-300 ease-out`} style={{ width: `${v}%` }} />
    </div>
  );
}
