import type { CSSProperties } from "react";
import { SiteTemplate, type SiteData } from "./site-template";
import { AutoZoom } from "./motion/auto-zoom";

/*
 * Device frames that show a full client site scaled to fit. The site inside is the real
 * component, laid out at the device's true width (1280 desktop / 390 phone) and zoomed.
 */

type Scroll = "always" | "hover" | "none";

const scrollClass = (scroll: Scroll) =>
  scroll === "none" ? "" : scroll === "hover" ? "autoscroll-hover" : "autoscroll-always";

export function BrowserRender({
  data,
  url,
  scroll = "none",
  initialZoom = 0.6,
  className = "",
  shadow = true,
  bar = true,
}: {
  data: SiteData;
  url: string;
  scroll?: Scroll;
  initialZoom?: number;
  className?: string;
  shadow?: boolean;
  bar?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[12px] bg-white ring-1 ring-black/10 ${shadow ? "shadow-product" : ""} ${scrollClass(scroll)} ${className}`}
      aria-hidden="true"
    >
      {bar ? (
        <div className="flex items-center gap-1.5 border-b border-black/5 bg-[#f3f3f5] px-3 py-2">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
          <span className="mx-auto truncate rounded-md bg-white px-6 py-0.5 text-[11px] text-[#6e6e73]">{url}</span>
        </div>
      ) : null}
      <AutoZoom base={1280} height={820} initial={initialZoom}>
        <div className={scroll === "none" ? "" : "autoscroll"} style={{ "--frame-h": "820px" } as CSSProperties}>
          <SiteTemplate data={data} isStatic />
        </div>
      </AutoZoom>
    </div>
  );
}

export function PhoneRender({
  data,
  scroll = "none",
  initialZoom = 0.6,
  className = "",
}: {
  data: SiteData;
  scroll?: Scroll;
  initialZoom?: number;
  className?: string;
}) {
  return (
    <div className={`@container ${scrollClass(scroll)} ${className}`} aria-hidden="true">
      <div className="relative rounded-[13cqw] bg-[#0b0b0c] p-[2.8cqw] shadow-product ring-1 ring-white/15">
        <div className="relative overflow-hidden rounded-[10.5cqw] bg-white">
          <AutoZoom base={390} height={844} initial={initialZoom}>
            <div className={scroll === "none" ? "" : "autoscroll"} style={{ "--frame-h": "844px" } as CSSProperties}>
              <SiteTemplate data={data} isStatic />
            </div>
          </AutoZoom>
          {/* dynamic island */}
          <span className="pointer-events-none absolute left-1/2 top-[2.4cqw] h-[6cqw] w-[26cqw] -translate-x-1/2 rounded-full bg-black" />
        </div>
      </div>
    </div>
  );
}
