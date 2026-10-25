export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0866FF" />
      <path d="M9 7h10l5 5v13a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" fill="#fff" />
      <path d="M19 7v4a1 1 0 0 0 1 1h4" fill="#D6E6FF" />
      <rect x="11" y="18" width="2.5" height="5" rx="1" fill="#0866FF" />
      <rect x="14.75" y="15" width="2.5" height="8" rx="1" fill="#0866FF" />
      <rect x="18.5" y="12.5" width="2.5" height="10.5" rx="1" fill="#1877F2" opacity=".55" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-bold tracking-tight text-ink">Relatório do Tráfego</span>
        {!compact && <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-mute">por Relatório RDA</span>}
      </span>
    </span>
  );
}
