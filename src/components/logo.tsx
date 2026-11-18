export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="var(--brand)" />
      <path d="M14 44a18 18 0 0 1 36 0" fill="var(--sun)" />
      <path d="M10 44h44" stroke="#faf7f0" strokeWidth="5" strokeLinecap="round" />
      <path d="M32 14v6M17 21l4 4M47 21l-4 4" stroke="var(--sun)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark />
      <span className="font-display text-xl font-bold tracking-tight">Brightyard</span>
    </span>
  );
}
