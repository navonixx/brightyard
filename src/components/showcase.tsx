/* Showcase pieces for the studio homepage: promo reel, AI photo stack. Pure CSS motion. */
import type { CSSProperties } from "react";
import Image from "next/image";
import { LogoMark } from "./logo";

export const SHOWCASE = [
  { src: "/showcase/yard.webp", label: "Landscaping", alt: "Freshly landscaped front yard at golden hour" },
  { src: "/showcase/cafe.webp", label: "Café", alt: "Latte with latte art on an oak counter" },
  { src: "/showcase/salon.webp", label: "Hair salon", alt: "Leather salon chair beside a round mirror" },
  { src: "/showcase/bakery.webp", label: "Bakery", alt: "Fresh croissants and pastries on a baking tray" },
  { src: "/showcase/paint.webp", label: "House painting", alt: "Freshly painted sage living room with roller" },
  { src: "/showcase/kitchen.webp", label: "Cleaning", alt: "Spotless white kitchen after a deep clean" },
  { src: "/showcase/gym.webp", label: "Fitness studio", alt: "Kettlebells in a moody boutique gym" },
  { src: "/showcase/tools.webp", label: "Handyman", alt: "Hand tools neatly arranged on a workbench" },
] as const;

const REEL = [
  { img: SHOWCASE[1], line: "Fresh every morning." },
  { img: SHOWCASE[3], line: "Baked before sunrise." },
  { img: SHOWCASE[2], line: "Your chair is waiting." },
  { img: SHOWCASE[0], line: "Book this week." },
];

/** A phone playing a 12-second, four-scene promo reel. */
export function PromoReel({ className = "", label = "Brightyard Café" }: { className?: string; label?: string }) {
  return (
    <div className={`@container ${className}`} aria-hidden="true">
    <div className="relative aspect-[9/19] rounded-[14cqw] bg-[#0b0b0c] p-[2.6cqw] shadow-product ring-1 ring-white/10">
      <div className="relative h-full overflow-hidden rounded-[11.5cqw] bg-black">
        {REEL.map((scene, i) => (
          <div key={scene.img.src} className="reel-scene absolute inset-0" style={{ "--i": i } as CSSProperties}>
            <Image src={scene.img.src} alt="" fill sizes="240px" className="object-cover" />
            <div className="absolute inset-0 bg-black/25" />
          </div>
        ))}
        {/* story progress */}
        <div className="absolute inset-x-[5cqw] top-[5cqw] flex gap-[1.5cqw]">
          {REEL.map((scene) => (
            <div key={scene.img.src} className="reel-seg h-[1.2cqw] min-h-[2px] flex-1 overflow-hidden rounded-full bg-white/35">
              <span className="block h-full bg-white" />
            </div>
          ))}
        </div>
        <div className="absolute inset-x-[5cqw] top-[10cqw] flex items-center gap-[2.5cqw] text-white">
          <span className="grid size-[10cqw] place-items-center rounded-full bg-white text-black">
            <LogoMark className="size-[6cqw]" />
          </span>
          <span className="truncate text-[4.6cqw] font-semibold">{label}</span>
        </div>
        {/* captions */}
        <div className="absolute inset-x-[6cqw] bottom-[22%]">
          {REEL.map((scene, i) => (
            <p
              key={scene.line}
              className="reel-caption absolute inset-x-0 bottom-0 text-[9cqw] font-semibold leading-[1.05] tracking-[-0.02em] text-white"
              style={{ "--i": i } as CSSProperties}
            >
              {scene.line}
            </p>
          ))}
        </div>
        <div className="absolute inset-x-[6cqw] bottom-[7cqw] rounded-full bg-white py-[3.2cqw] text-center text-[4.8cqw] font-semibold text-black">
          Order ahead
        </div>
      </div>
    </div>
    </div>
  );
}

/** Four AI photos in a slow-drifting 2×2 grid. */
export function PhotoStack({ className = "" }: { className?: string }) {
  const picks = [SHOWCASE[0], SHOWCASE[2], SHOWCASE[3], SHOWCASE[5]];
  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`} aria-hidden="true">
      {picks.map((img, i) => (
        <div key={img.src} className={`relative overflow-hidden rounded-[14px] ${i % 2 ? "translate-y-6" : ""}`}>
          <div className="relative aspect-[4/5]">
            <Image src={img.src} alt="" fill sizes="(min-width: 768px) 260px, 45vw" className="ken-burns object-cover" style={{ animationDelay: `${i * -3}s` }} />
          </div>
          <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
            {img.label}
          </span>
        </div>
      ))}
    </div>
  );
}
