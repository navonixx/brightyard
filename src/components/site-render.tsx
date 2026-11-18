import type { CSSProperties } from "react";
import { SiteTemplate, type SiteData } from "./site-template";

type Size = "hero" | "card" | "panel";

// A 1280px-wide desktop site rendered at reduced zoom — the "product" on our shelves.
// --z is the zoom. The frame is capped at 1280px × z, so it always hugs the zoomed site exactly.
const ZOOM: Record<Size, string> = {
  hero: "[--z:0.26] min-[420px]:[--z:0.28] sm:[--z:0.46] md:[--z:0.56] lg:[--z:0.74]",
  // Half-width sticky panel on the homepage chapters (mobile: full width).
  panel: "[--z:0.26] min-[420px]:[--z:0.28] sm:[--z:0.45] md:[--z:0.26] lg:[--z:0.38] xl:[--z:0.4]",
  // Card renders sit inside 20px card padding in a 1/3/3-column grid.
  card: "[--z:0.23] sm:[--z:0.42] md:[--z:0.145] lg:[--z:0.21] xl:[--z:0.24]",
};

export function SiteRender({
  data,
  url,
  size = "hero",
  shadow = true,
}: {
  data: SiteData;
  url: string;
  size?: Size;
  shadow?: boolean;
}) {
  return (
    <div
      className={`mx-auto w-full max-w-[calc(1280px*var(--z))] overflow-hidden rounded-[10px] bg-white ring-1 ring-black/5 ${ZOOM[size]} ${shadow ? "shadow-product" : ""}`}
      aria-hidden="true"
    >
      <div className="flex items-center gap-1.5 border-b border-black/5 bg-[#f6f6f8] px-3 py-2">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="mx-auto truncate rounded-md bg-white px-6 py-0.5 text-[11px] text-graphite-48">{url}</span>
      </div>
      <div
        className="pointer-events-none h-[820px] w-[1280px] overflow-hidden select-none [zoom:var(--z)]"
        inert
      >
        <div style={{ "--site-top": "0px" } as CSSProperties}>
          <SiteTemplate data={data} isStatic />
        </div>
      </div>
    </div>
  );
}
