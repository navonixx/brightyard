"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { ASPECT, type Campaign } from "@/lib/portfolio";
import { Tilt } from "./tilt";

const STEP = (n: number) => 360 / n;

/** 3D ring of campaign covers: drifts slowly, drag or click to choose a campaign. */
function CoverRing({ campaigns, active, onPick }: { campaigns: Campaign[]; active: number; onPick: (i: number) => void }) {
  const ringRef = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLButtonElement | null)[]>([]);
  const angle = useRef(0);
  const target = useRef<number | null>(null);
  const drag = useRef<{ x: number; start: number; moved: boolean } | null>(null);
  const hover = useRef(false);
  const n = campaigns.length;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const tick = () => {
      if (target.current !== null) {
        const diff = target.current - angle.current;
        angle.current += diff * 0.1;
        if (Math.abs(diff) < 0.05) {
          angle.current = target.current;
          target.current = null;
        }
      } else if (!drag.current && !hover.current && !reduce) {
        angle.current -= 0.06;
      }
      const ring = ringRef.current;
      if (ring) ring.style.transform = `translateZ(calc(var(--ring-r) * -1)) rotateY(${angle.current}deg)`;
      // Cards facing away fade back so the front one reads clearly.
      cards.current.forEach((card, i) => {
        if (!card) return;
        const a = (((i * STEP(n) + angle.current) % 360) + 360) % 360;
        const facing = Math.cos((a * Math.PI) / 180);
        card.style.opacity = String(0.25 + 0.75 * Math.max(0, facing));
        card.style.filter = `brightness(${0.55 + 0.45 * Math.max(0, facing)})`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [n]);

  // Turn the chosen campaign to the front by the shortest way round.
  const face = useCallback(
    (i: number) => {
      const want = -i * STEP(n);
      const current = angle.current;
      const delta = ((((want - current) % 360) + 540) % 360) - 180;
      target.current = current + delta;
    },
    [n],
  );
  useEffect(() => face(active), [active, face]);

  return (
    <div
      className="ring-scene"
      onPointerEnter={() => (hover.current = true)}
      onPointerLeave={() => {
        hover.current = false;
        drag.current = null;
      }}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, start: angle.current, moved: false };
        target.current = null;
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const dx = e.clientX - drag.current.x;
        if (Math.abs(dx) > 4) drag.current.moved = true;
        angle.current = drag.current.start + dx * 0.3;
      }}
      onPointerUp={() => {
        if (drag.current?.moved) {
          // Settle on the nearest campaign after a drag.
          const nearest = Math.round(-angle.current / STEP(n));
          onPick(((nearest % n) + n) % n);
        }
        setTimeout(() => (drag.current = null), 0);
      }}
    >
      <div ref={ringRef} className="ring">
        {campaigns.map((c, i) => (
          <button
            key={c.slug}
            ref={(el) => {
              cards.current[i] = el;
            }}
            type="button"
            className={`ring-card ${i === active ? "ring-card-active" : ""}`}
            style={{ transform: `rotateY(${i * STEP(n)}deg) translateZ(var(--ring-r))` }}
            onClick={() => {
              if (drag.current?.moved) return;
              onPick(i);
            }}
            aria-label={`Show the ${c.brand} campaign`}
          >
            <Image src={c.shots[0].src} alt="" fill sizes="(max-width: 640px) 220px, 340px" className="object-cover" draggable={false} />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-left">
              <span className="block text-[11px] uppercase tracking-[0.18em] text-white/60">{c.industry}</span>
              <span className="block text-[15px] font-semibold text-white">{c.brand}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Lightbox({ campaign, index, onClose, onMove }: { campaign: Campaign; index: number; onClose: () => void; onMove: (d: number) => void }) {
  const shot = campaign.shots[index];
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onMove(1);
      if (e.key === "ArrowLeft") onMove(-1);
    };
    document.addEventListener("keydown", key);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
    };
  }, [onClose, onMove]);

  return (
    <div role="dialog" aria-modal="true" aria-label={`${campaign.brand} — ${shot.kind}`} className="fixed inset-0 z-[60] grid place-items-center bg-black/90 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="relative max-h-full w-full max-w-[1200px]" onClick={(e) => e.stopPropagation()}>
        <div className={`relative mx-auto max-h-[80vh] ${ASPECT[shot.format]} ${shot.format === "16:9" ? "w-full" : "h-[80vh] max-w-full"}`}>
          <Image src={shot.src} alt={shot.alt} fill sizes="100vw" className="rounded-xl object-contain" />
        </div>
        <div className="mt-4 flex items-center justify-between gap-4 text-white">
          <p className="text-sm">
            <span className="font-semibold">{campaign.brand}</span> <span className="text-white/60">· {shot.kind} · {shot.format}</span>
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => onMove(-1)} className="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Previous image">
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" onClick={() => onMove(1)} className="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Next image">
              <ChevronRight className="size-5" />
            </button>
            <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Close">
              <X className="size-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PhotoStudio({ campaigns }: { campaigns: Campaign[] }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const c = campaigns[active];
  const [hero, ...rest] = c.shots;
  const close = useCallback(() => setZoom(null), []);
  const move = useCallback((d: number) => setZoom((z) => (z === null ? z : (z + d + c.shots.length) % c.shots.length)), [c.shots.length]);

  return (
    <div>
      <CoverRing campaigns={campaigns} active={active} onPick={setActive} />

      <div className="mx-auto mt-6 flex max-w-[1180px] flex-wrap justify-center gap-2 px-4 sm:px-6">
        {campaigns.map((item, i) => (
          <button
            key={item.slug}
            type="button"
            onClick={() => setActive(i)}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] transition ${
              i === active ? "border-white bg-white text-void" : "border-white/15 text-white/70 hover:border-white/40 hover:text-white"
            }`}
          >
            {item.brand}
          </button>
        ))}
      </div>

      <div key={c.slug} className="campaign-swap mx-auto mt-12 max-w-[1180px] px-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.2em]" style={{ color: c.accent }}>
              {c.industry} · concept campaign
            </p>
            <h3 className="mt-2 font-display text-[34px] font-semibold leading-tight tracking-[-0.02em] text-white sm:text-[44px]">
              {c.brand} <span className="text-white/45">— {c.title}</span>
            </h3>
          </div>
          <p className="max-w-[46ch] text-[15px] leading-relaxed text-white/60">{c.story}</p>
        </div>

        <div className="mt-8 grid gap-4">
          <Tilt max={4} className="rounded-[20px]">
            <button type="button" onClick={() => setZoom(0)} className="group relative block aspect-[16/9] w-full overflow-hidden rounded-[20px]">
              <Image src={hero.src} alt={hero.alt} fill sizes="(max-width: 1200px) 100vw, 1180px" className="object-cover transition duration-700 group-hover:scale-[1.03]" />
              <span className="shot-label">{hero.kind} · {hero.format}</span>
              <Expand className="absolute right-4 top-4 size-5 text-white/0 transition group-hover:text-white/90" />
            </button>
          </Tilt>
          <div className={`grid grid-cols-2 gap-4 ${rest.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
            {rest.map((shot, i) => (
              <Tilt key={shot.src} max={8} className="rounded-[18px]">
                <button type="button" onClick={() => setZoom(i + 1)} className="group relative block aspect-[4/5] w-full overflow-hidden rounded-[18px]">
                  <Image src={shot.src} alt={shot.alt} fill sizes="(max-width: 1024px) 50vw, 300px" className="object-cover transition duration-700 group-hover:scale-[1.05]" />
                  <span className="shot-label">{shot.kind} · {shot.format}</span>
                </button>
              </Tilt>
            ))}
          </div>
        </div>
      </div>

      {zoom !== null ? <Lightbox campaign={c} index={zoom} onClose={close} onMove={move} /> : null}
    </div>
  );
}
