"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type Chapter = {
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  visual: ReactNode;
  mobileVisual: ReactNode;
};

/** Scrolling text chapters with a sticky visual that crossfades to match the chapter in view. */
export function Chapters({ chapters }: { chapters: Chapter[] }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="mx-auto grid max-w-[1100px] gap-10 px-4 sm:px-6 md:grid-cols-2 md:gap-14">
      <div>
        {chapters.map((chapter, i) => (
          <div
            key={chapter.title}
            ref={(el) => {
              refs.current[i] = el;
            }}
            data-index={i}
            className="flex flex-col justify-center py-14 md:min-h-[78vh] md:py-0"
          >
            <div className={`transition-opacity duration-500 md:opacity-30 ${active === i ? "md:!opacity-100" : ""}`}>
              <p className="t-caption font-semibold text-action">{chapter.eyebrow}</p>
              <h3 className="t-section mt-3 max-w-[16ch]">{chapter.title}</h3>
              <p className="t-body mt-4 max-w-[38ch] text-graphite-80">{chapter.body}</p>
              <ul className="t-body mt-6 space-y-2.5">
                {chapter.points.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-action" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-10 md:hidden">{chapter.mobileVisual}</div>
          </div>
        ))}
      </div>

      <div className="relative hidden md:block">
        <div className="sticky top-[calc(50vh-300px)] h-[600px]">
          {chapters.map((chapter, i) => (
            <div
              key={chapter.title}
              className={`absolute inset-0 grid place-items-center transition-all duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] ${
                active === i ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
              }`}
              aria-hidden={active !== i}
            >
              {chapter.visual}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
