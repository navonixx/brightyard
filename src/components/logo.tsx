import Image from "next/image";

/** The neon "A orbit" mark from the Alderwell Creative brand kit. */
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <Image
      src="/brand/mark-96.png"
      alt=""
      width={96}
      height={96}
      className={`shrink-0 rounded-full ${className}`}
      aria-hidden="true"
    />
  );
}

/** Mark + wordmark. `tone` only affects the wordmark colour; the mark is always full colour. */
export function Logo({ className = "", size = "md" }: { className?: string; size?: "sm" | "md" }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} aria-label="Alderwell Creative">
      <LogoMark className={size === "sm" ? "size-[22px]" : "size-8"} />
      <span className="flex flex-col leading-none">
        <span className={`font-display font-semibold tracking-[-0.02em] ${size === "sm" ? "text-[15px]" : "text-[19px]"}`}>
          Alderwell
        </span>
        <span
          className={`mt-[3px] font-semibold uppercase tracking-[0.32em] text-[#a78bfa] ${size === "sm" ? "text-[7.5px]" : "text-[9px]"}`}
        >
          Creative
        </span>
      </span>
    </span>
  );
}
