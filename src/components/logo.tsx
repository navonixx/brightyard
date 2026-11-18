/** Monochrome mark: a sun rising over a horizon. Inherits `currentColor`. */
export function LogoMark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none">
      <path d="M7 21a9 9 0 0 1 18 0Z" fill="currentColor" />
      <path d="M3.5 24.5h25" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M16 5.5v3.2M7.6 9.1l2.2 2.2M24.4 9.1l-2.2 2.2" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className = "", size = "md" }: { className?: string; size?: "sm" | "md" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <LogoMark className={size === "sm" ? "size-[18px]" : "size-6"} />
      <span className={`font-display font-semibold tracking-[-0.02em] ${size === "sm" ? "text-[15px]" : "text-[19px]"}`}>
        Brightyard
      </span>
    </span>
  );
}
