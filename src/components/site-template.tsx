/* eslint-disable @next/next/no-img-element -- client sites mix local sample photos with ImageKit uploads */
import type { AnchorHTMLAttributes, CSSProperties, ReactNode } from "react";
import { ArrowRight, Check, MapPin, Phone, Star } from "lucide-react";
import type { LeadImage, SampleContent, Trade } from "@/lib/db/schema";
import { TRADE_META } from "@/lib/brand";
import { Reveal } from "./motion/reveal";

/*
 * The website a client receives. Layout responds to its *container* (not the viewport),
 * so the same component renders a true mobile layout inside a phone frame and a desktop
 * layout inside a browser frame on the studio homepage.
 */

type ThemeVars = {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  accentInk: string;
  accentSoft: string;
  radius: string;
  btnRadius: string;
};

export type SiteTheme = {
  font: "sans" | "serif" | "condensed";
  hero: "photo" | "split" | "editorial";
  dark?: boolean;
  upper?: boolean;
  vars: ThemeVars;
};

export const THEMES = {
  fresh: {
    font: "sans",
    hero: "photo",
    vars: { bg: "#ffffff", surface: "#f2f7f3", ink: "#13201a", muted: "#55665c", line: "#e1e9e3", accent: "#1f6f43", accentInk: "#ffffff", accentSoft: "#e2f0e7", radius: "16px", btnRadius: "999px" },
  },
  clean: {
    font: "sans",
    hero: "split",
    vars: { bg: "#ffffff", surface: "#f4f6fb", ink: "#141a2b", muted: "#5a6378", line: "#e3e7f0", accent: "#2b59c3", accentInk: "#ffffff", accentSoft: "#e6ecfa", radius: "12px", btnRadius: "10px" },
  },
  airy: {
    font: "sans",
    hero: "split",
    vars: { bg: "#fbfdfd", surface: "#eef7f7", ink: "#102b2c", muted: "#4f6b6b", line: "#d9ebeb", accent: "#0f8b8d", accentInk: "#ffffff", accentSoft: "#dcf1f1", radius: "22px", btnRadius: "999px" },
  },
  workshop: {
    font: "sans",
    hero: "photo",
    vars: { bg: "#fffaf3", surface: "#f6ecdd", ink: "#231a12", muted: "#6b5a48", line: "#eadcc8", accent: "#c2410c", accentInk: "#ffffff", accentSoft: "#fde4d3", radius: "6px", btnRadius: "6px" },
  },
  blue: {
    font: "sans",
    hero: "photo",
    vars: { bg: "#ffffff", surface: "#eef4fb", ink: "#0f1b2d", muted: "#4e5d73", line: "#dde6f0", accent: "#1971c2", accentInk: "#ffffff", accentSoft: "#e1eefa", radius: "10px", btnRadius: "999px" },
  },
  warm: {
    font: "sans",
    hero: "split",
    vars: { bg: "#fbf7f1", surface: "#f2eadf", ink: "#2a211b", muted: "#6b5d52", line: "#e7dccd", accent: "#7a4a2b", accentInk: "#ffffff", accentSoft: "#eedfd2", radius: "18px", btnRadius: "999px" },
  },
  editorial: {
    font: "serif",
    hero: "editorial",
    vars: { bg: "#f7f1e6", surface: "#efe5d4", ink: "#2b211a", muted: "#6f5f52", line: "#e3d6c2", accent: "#b4532a", accentInk: "#ffffff", accentSoft: "#f3dccd", radius: "4px", btnRadius: "2px" },
  },
  noir: {
    font: "serif",
    hero: "editorial",
    dark: true,
    vars: { bg: "#0f0e0e", surface: "#1a1817", ink: "#f3ede4", muted: "#a79f94", line: "#2a2624", accent: "#c9a35c", accentInk: "#141210", accentSoft: "#2a241a", radius: "2px", btnRadius: "0px" },
  },
  bold: {
    font: "condensed",
    hero: "photo",
    dark: true,
    upper: true,
    vars: { bg: "#0b0b0c", surface: "#151517", ink: "#ffffff", muted: "#a3a3a8", line: "#262629", accent: "#e63b2e", accentInk: "#ffffff", accentSoft: "#2a1513", radius: "0px", btnRadius: "0px" },
  },
} satisfies Record<string, SiteTheme>;

export type ThemeKey = keyof typeof THEMES;

export const THEME_BY_TRADE: Record<Trade, ThemeKey> = {
  landscaping: "fresh",
  painting: "clean",
  cleaning: "airy",
  handyman: "workshop",
  pressure_washing: "blue",
  other: "warm",
};

export type SiteData = {
  businessName: string;
  trade: Trade;
  theme?: ThemeKey;
  industry?: string;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  sample: SampleContent;
  images: LeadImage[];
  videoUrl?: string | null;
};

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** A link that renders as a plain <span> in static renders (which may sit inside another link). */
function A({ isStatic, href, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { isStatic: boolean }) {
  return isStatic ? <span {...rest} /> : <a href={href} {...rest} />;
}

/** Scroll-reveal wrapper on the live site; a plain div inside static device renders. */
function R({ isStatic, delay, className, children }: { isStatic: boolean; delay?: number; className?: string; children: ReactNode }) {
  return isStatic ? <div className={className}>{children}</div> : <Reveal delay={delay} className={className}>{children}</Reveal>;
}

const DISPLAY_FONT = {
  sans: "",
  serif: "font-[family-name:var(--font-serif-display)] font-normal",
  condensed: "font-[family-name:var(--font-condensed)] font-semibold",
};

const H1 = {
  sans: "text-[38px] font-semibold leading-[1.02] tracking-[-0.025em] @md:text-[46px] @3xl:text-[60px] @5xl:text-[74px]",
  serif: "text-[42px] leading-[1.02] tracking-[-0.015em] @md:text-[52px] @3xl:text-[68px] @5xl:text-[84px]",
  condensed: "text-[58px] leading-[0.92] tracking-[-0.005em] @md:text-[72px] @3xl:text-[104px] @5xl:text-[128px]",
};

const H2 = {
  sans: "text-[30px] font-semibold leading-[1.08] tracking-[-0.02em] @3xl:text-[40px]",
  serif: "text-[34px] leading-[1.08] @3xl:text-[46px]",
  condensed: "text-[40px] leading-[0.95] @3xl:text-[56px]",
};

export function SiteTemplate({ data, isStatic = false }: { data: SiteData; isStatic?: boolean }) {
  const themeKey = data.theme ?? THEME_BY_TRADE[data.trade];
  const theme: SiteTheme = THEMES[themeKey];
  const v = theme.vars;
  const { sample } = data;
  const display = `${DISPLAY_FONT[theme.font]} ${theme.upper ? "uppercase" : ""}`;
  const industry = data.industry ?? TRADE_META[data.trade].label;
  const place = [data.city, data.state].filter(Boolean).join(", ");
  const hero = data.images[0];
  const gallery = data.images.length >= 3 ? data.images.slice(1) : data.images.length === 2 ? data.images : [];
  const quoteHref = data.phone ? telHref(data.phone) : "#contact";
  // Static renders sit inside another page (the studio homepage): no competing headings there.
  const H1Tag = isStatic ? "p" : "h1";
  const H2Tag = isStatic ? "p" : "h2";
  const H3Tag = isStatic ? "p" : "h3";

  const style = {
    "--bg": v.bg,
    "--surface": v.surface,
    "--ink": v.ink,
    "--muted": v.muted,
    "--line": v.line,
    "--accent": v.accent,
    "--accent-ink": v.accentInk,
    "--accent-soft": v.accentSoft,
    "--radius": v.radius,
    "--btn-radius": v.btnRadius,
  } as CSSProperties;

  const rise = isStatic ? "" : "fade-in";
  const kb = isStatic ? "" : "ken-burns";
  const lift = isStatic ? "" : "transition-transform duration-300 hover:-translate-y-1";
  const d = (ms: number) => (isStatic ? undefined : ({ "--d": `${ms}ms` } as CSSProperties));

  const btnPrimary =
    "inline-flex items-center justify-center gap-2 rounded-[var(--btn-radius)] bg-[var(--accent)] px-6 py-3.5 text-[15px] font-semibold text-[var(--accent-ink)]";
  const btnGhost =
    "inline-flex items-center justify-center gap-2 rounded-[var(--btn-radius)] border border-current px-6 py-3.5 text-[15px] font-semibold";

  const ctas = (onPhoto: boolean) => (
    <div className="flex flex-wrap gap-3">
      <A isStatic={isStatic} href={quoteHref} className={btnPrimary}>
        {sample.cta}
      </A>
      {data.phone ? (
        <A isStatic={isStatic} href={telHref(data.phone)} className={`${btnGhost} ${onPhoto ? "text-white" : "text-[var(--ink)]"}`}>
          <Phone className="size-4" /> {data.phone}
        </A>
      ) : null}
    </div>
  );

  const ratingBadge = data.rating ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg)] px-3 py-1.5 text-[13px] font-medium text-[var(--ink)] shadow-sm ring-1 ring-black/5">
      <Star className="size-3.5 fill-amber-400 text-amber-400" />
      {data.rating.toFixed(1)} on Google
      {data.reviewCount ? <span className="text-[var(--muted)]">· {data.reviewCount} reviews</span> : null}
    </span>
  ) : null;

  return (
    <div
      style={style}
      className={`@container bg-[var(--bg)] text-[var(--ink)] ${theme.dark ? "[color-scheme:dark]" : "[color-scheme:light]"}`}
    >
      {/* Nav */}
      <header
        className={`${isStatic ? "relative" : "sticky top-[var(--site-top,0px)]"} z-20 border-b border-[var(--line)] bg-[var(--bg)]/85 backdrop-blur`}
      >
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-5 py-3.5 @3xl:px-8">
          <span className="flex min-w-0 items-center gap-2.5">
            <span
              className={`grid size-9 shrink-0 place-items-center rounded-[var(--radius)] bg-[var(--accent)] text-[15px] font-bold text-[var(--accent-ink)] ${DISPLAY_FONT[theme.font]}`}
            >
              {data.businessName.trim().charAt(0).toUpperCase()}
            </span>
            <span className={`truncate text-[17px] font-semibold tracking-[-0.01em] ${display}`}>{data.businessName}</span>
          </span>
          <nav className="hidden items-center gap-7 text-[14px] text-[var(--muted)] @3xl:flex">
            <span>Services</span>
            <span>Work</span>
            <span>About</span>
          </nav>
          <A
            isStatic={isStatic}
            href={quoteHref}
            className="inline-flex shrink-0 items-center gap-2 rounded-[var(--btn-radius)] bg-[var(--accent)] px-4 py-2 text-[14px] font-semibold text-[var(--accent-ink)]"
          >
            <Phone className="size-4" />
            <span className="hidden @md:inline">{data.phone ?? sample.cta}</span>
            <span className="@md:hidden">Call</span>
          </A>
        </div>
      </header>

      {/* Hero */}
      {theme.hero === "photo" ? (
        <section className="relative isolate flex min-h-[560px] items-end overflow-hidden @3xl:min-h-[680px]">
          {hero ? (
            <img src={hero.url} alt={hero.alt} className={`absolute inset-0 -z-10 h-full w-full object-cover ${kb}`} />
          ) : (
            <div className="absolute inset-0 -z-10 bg-[var(--accent)]" />
          )}
          <div className="absolute inset-0 -z-10 bg-black/45" />
          <div className="mx-auto w-full max-w-[1200px] px-5 pb-14 pt-32 text-white @3xl:px-8 @3xl:pb-20">
            <p className={`mb-4 text-[13px] font-semibold uppercase tracking-[0.18em] text-white/75 ${rise}`}>
              {industry}
              {place ? ` · ${place}` : ""}
            </p>
            <H1Tag style={d(120)} className={`max-w-[14ch] text-balance ${rise} ${H1[theme.font]} ${display}`}>{sample.headline}</H1Tag>
            <p className="mt-5 max-w-[46ch] text-[17px] leading-[1.5] text-white/85 @3xl:text-[20px]">{sample.subheadline}</p>
            <div style={d(420)} className={`mt-8 ${rise}`}>{ctas(true)}</div>
          </div>
        </section>
      ) : theme.hero === "split" ? (
        <section className="mx-auto grid max-w-[1200px] items-center gap-10 px-5 pb-16 pt-12 @3xl:grid-cols-[1.05fr_1fr] @3xl:gap-14 @3xl:px-8 @3xl:pb-24 @3xl:pt-20">
          <div>
            <p className={`mb-4 text-[13px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)] ${rise}`}>
              {industry}
              {place ? ` · ${place}` : ""}
            </p>
            <H1Tag style={d(120)} className={`max-w-[14ch] text-balance ${rise} ${H1[theme.font]} ${display}`}>{sample.headline}</H1Tag>
            <p className="mt-5 max-w-[46ch] text-[17px] leading-[1.5] text-[var(--muted)] @3xl:text-[19px]">{sample.subheadline}</p>
            <div style={d(420)} className={`mt-8 ${rise}`}>{ctas(false)}</div>
          </div>
          <div className="relative">
            {hero ? (
              <img src={hero.url} alt={hero.alt} className="aspect-[4/3] w-full rounded-[var(--radius)] object-cover @3xl:aspect-[4/5]" />
            ) : (
              <div className="aspect-[4/3] w-full rounded-[var(--radius)] bg-[var(--accent-soft)] @3xl:aspect-[4/5]" />
            )}
            {ratingBadge ? <div className="absolute bottom-4 left-4">{ratingBadge}</div> : null}
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-[1200px] px-5 pb-12 pt-14 text-center @3xl:px-8 @3xl:pt-24">
          <p className={`mb-5 text-[13px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)] ${rise}`}>
            {industry}
            {place ? ` · ${place}` : ""}
          </p>
          <H1Tag style={d(120)} className={`mx-auto max-w-[16ch] text-balance ${rise} ${H1[theme.font]} ${display}`}>{sample.headline}</H1Tag>
          <p className="mx-auto mt-6 max-w-[52ch] text-[17px] leading-[1.5] text-[var(--muted)] @3xl:text-[20px]">{sample.subheadline}</p>
          <div style={d(420)} className={`mt-8 flex justify-center ${rise}`}>{ctas(false)}</div>
          {hero ? (
            <img
              src={hero.url}
              alt={hero.alt}
              className="mt-12 aspect-[4/3] w-full rounded-[var(--radius)] object-cover @3xl:mt-16 @3xl:aspect-[21/9]"
            />
          ) : null}
        </section>
      )}

      {/* Trust strip */}
      <div className="border-y border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 py-4 text-[14px] text-[var(--muted)] @3xl:px-8">
          {data.rating ? (
            <span className="inline-flex items-center gap-1.5">
              <Star className="size-4 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-[var(--ink)]">{data.rating.toFixed(1)}</span> on Google
              {data.reviewCount ? ` · ${data.reviewCount} reviews` : ""}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4 text-[var(--accent)]" /> Serving {sample.serviceArea}
          </span>
          {sample.whyUs[0] ? (
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-4 text-[var(--accent)]" /> {sample.whyUs[0]}
            </span>
          ) : null}
        </div>
      </div>

      {/* Services */}
      <section className="mx-auto max-w-[1200px] px-5 py-16 @3xl:px-8 @3xl:py-24">
        <div className="flex flex-col gap-3 @3xl:flex-row @3xl:items-end @3xl:justify-between">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Services</p>
            <H2Tag className={`mt-2 ${H2[theme.font]} ${display}`}>What we do</H2Tag>
          </div>
          <A isStatic={isStatic} href={quoteHref} className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-[var(--accent)]">
            Get a quote <ArrowRight className="size-4" />
          </A>
        </div>
        <div className="mt-10 grid gap-4 @md:grid-cols-2 @3xl:grid-cols-4">
          {sample.services.slice(0, 4).map((service, i) => (
            <R isStatic={isStatic} delay={i * 110} key={service.title} className={`rounded-[var(--radius)] bg-[var(--surface)] p-6 ${lift}`}>
              <p className={`text-[13px] font-semibold text-[var(--accent)] ${DISPLAY_FONT[theme.font]}`}>0{i + 1}</p>
              <H3Tag className="mt-5 text-[18px] font-semibold tracking-[-0.01em]">{service.title}</H3Tag>
              <p className="mt-2 text-[15px] leading-[1.5] text-[var(--muted)]">{service.description}</p>
            </R>
          ))}
        </div>
      </section>

      {/* Gallery */}
      {gallery.length ? (
        <section className="bg-[var(--surface)] py-16 @3xl:py-24">
          <div className="mx-auto max-w-[1200px] px-5 @3xl:px-8">
            <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Work</p>
            <H2Tag className={`mt-2 ${H2[theme.font]} ${display}`}>Recent projects</H2Tag>
            <div className={`mt-10 grid grid-cols-2 gap-3 @3xl:gap-4 ${gallery.length >= 3 ? "@3xl:grid-cols-3" : ""}`}>
              {gallery.slice(0, 5).map((image, i) => (
                <R
                  isStatic={isStatic}
                  delay={i * 110}
                  key={image.url + i}
                  className={`group/shot overflow-hidden rounded-[var(--radius)] ${
                    gallery.length < 3
                      ? "aspect-[4/5] @3xl:aspect-[4/3]"
                      : i === 0
                        ? "col-span-2 aspect-[16/10] @3xl:row-span-2 @3xl:aspect-auto @3xl:h-full"
                        : "aspect-square"
                  }`}
                >
                  <img
                    src={image.url}
                    alt={image.alt}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover/shot:scale-105"
                  />
                </R>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Video */}
      {data.videoUrl ? (
        <section className="mx-auto max-w-[1000px] px-5 py-16 @3xl:px-8">
          <video src={data.videoUrl} controls playsInline className="w-full rounded-[var(--radius)]" />
        </section>
      ) : null}

      {/* About + why */}
      <section className="mx-auto grid max-w-[1200px] gap-12 px-5 py-16 @3xl:grid-cols-[1.1fr_1fr] @3xl:gap-20 @3xl:px-8 @3xl:py-24">
        <R isStatic={isStatic}>
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">About</p>
          <H2Tag className={`mt-2 ${H2[theme.font]} ${display}`}>About {data.businessName}</H2Tag>
          <p className="mt-6 text-[18px] leading-[1.55] text-[var(--muted)] @3xl:text-[20px]">{sample.about}</p>
          {ratingBadge ? <div className="mt-8">{ratingBadge}</div> : null}
        </R>
        <R isStatic={isStatic} delay={150} className="rounded-[var(--radius)] bg-[var(--accent-soft)] p-7 @3xl:p-9">
          <H3Tag className="text-[20px] font-semibold tracking-[-0.01em]">Why neighbors choose us</H3Tag>
          <ul className="mt-6 space-y-4">
            {sample.whyUs.map((reason) => (
              <li key={reason} className="flex items-start gap-3 text-[16px] leading-[1.45]">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)]">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                {reason}
              </li>
            ))}
          </ul>
        </R>
      </section>

      {/* CTA band */}
      <section id="contact" className="bg-[var(--accent)] text-[var(--accent-ink)]">
        <div className="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-7 px-5 py-16 @3xl:flex-row @3xl:items-center @3xl:px-8 @3xl:py-20">
          <div>
            <H2Tag className={`${H2[theme.font]} ${display}`}>Ready for a free quote?</H2Tag>
            <p className="mt-3 max-w-[44ch] text-[17px] opacity-85">Tell us what you need — we usually reply the same day.</p>
          </div>
          <A
            isStatic={isStatic}
            href={quoteHref}
            className="inline-flex items-center gap-2 rounded-[var(--btn-radius)] bg-[var(--bg)] px-7 py-4 text-[16px] font-semibold text-[var(--ink)]"
          >
            <Phone className="size-4" /> {data.phone ?? sample.cta}
          </A>
        </div>
      </section>

      <footer className="border-t border-[var(--line)]">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-5 py-8 text-[14px] text-[var(--muted)] @3xl:flex-row @3xl:items-center @3xl:justify-between @3xl:px-8">
          <span className={`text-[16px] font-semibold text-[var(--ink)] ${display}`}>{data.businessName}</span>
          <span>
            {place}
            {data.phone ? ` · ${data.phone}` : ""} · Serving {sample.serviceArea}
          </span>
        </div>
      </footer>
    </div>
  );
}
