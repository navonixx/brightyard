"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Lays out children at a fixed `base` width (e.g. a 1280px desktop) and zooms them to fill
 * this element's width exactly. Height is reserved from the aspect ratio so nothing jumps.
 */
export function AutoZoom({
  base,
  height,
  initial,
  children,
}: {
  base: number;
  height: number;
  initial: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(initial);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (width > 0) setZoom(width / base);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [base]);

  return (
    <div ref={ref} className="relative w-full overflow-hidden" style={{ aspectRatio: `${base} / ${height}` }}>
      <div
        className="absolute left-0 top-0 overflow-hidden"
        style={{ width: base, height, zoom } as CSSProperties}
      >
        {children}
      </div>
    </div>
  );
}
