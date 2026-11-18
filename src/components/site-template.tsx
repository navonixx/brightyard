/* eslint-disable @next/next/no-img-element -- previews use arbitrary ImageKit / external URLs */
import type { AnchorHTMLAttributes, CSSProperties } from "react";
import { Check, Droplets, Hammer, MapPin, PaintRoller, Phone, Sparkles, Star, Trees, House } from "lucide-react";
import type { LeadImage, SampleContent, Trade } from "@/lib/db/schema";
import { TRADE_META } from "@/lib/brand";

export type SiteData = {
  businessName: string;
  trade: Trade;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  sample: SampleContent;
  images: LeadImage[];
  videoUrl?: string | null;
};

const ICONS = {
  landscaping: Trees,
  painting: PaintRoller,
  cleaning: Sparkles,
  handyman: Hammer,
  pressure_washing: Droplets,
  other: House,
} satisfies Record<Trade, unknown>;

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** A link that becomes a plain <span> in static renders (which may sit inside another link). */
function Anchor({ isStatic, href, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { isStatic: boolean }) {
  return isStatic ? <span {...rest} /> : <a href={href} {...rest} />;
}

/** The mini website a prospect sees at /p/[token] (and the public demos). */
export function SiteTemplate({ data, isStatic = false }: { data: SiteData; isStatic?: boolean }) {
  const meta = TRADE_META[data.trade];
  const Icon = ICONS[data.trade];
  const { sample } = data;
  const [hero, ...gallery] = data.images;
  const style = { "--accent": meta.accent, "--accent-soft": meta.accentSoft } as CSSProperties;
  const quoteHref = data.phone ? telHref(data.phone) : "#quote";

  return (
    <div style={style} className="bg-white text-slate-900 [color-scheme:light]">
      {/* Nav */}
      <header className="sticky top-[var(--site-top,0px)] z-20 border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-lg bg-[var(--accent)] text-white">
              <Icon className="size-5" />
            </span>
            <span className="font-display text-lg font-bold leading-tight">{data.businessName}</span>
          </div>
          {data.phone ? (
            <Anchor
              isStatic={isStatic}
              href={telHref(data.phone)}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
            >
              <Phone className="size-4" />
              <span className="hidden sm:inline">{data.phone}</span>
              <span className="sm:hidden">Call</span>
            </Anchor>
          ) : (
            <Anchor isStatic={isStatic} href="#quote" className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">
              {sample.cta}
            </Anchor>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="bg-[var(--accent-soft)]">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 md:py-20">
          <div>
            {data.rating ? (
              <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-medium shadow-sm">
                <Star className="size-4 fill-amber-400 text-amber-400" />
                {data.rating.toFixed(1)} on Google
                {data.reviewCount ? <span className="text-slate-500">· {data.reviewCount} reviews</span> : null}
              </p>
            ) : null}
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
              {sample.headline}
            </h1>
            <p className="mt-5 max-w-lg text-lg text-slate-600">{sample.subheadline}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Anchor
                isStatic={isStatic}
                href={quoteHref}
                className="rounded-full bg-[var(--accent)] px-6 py-3 font-semibold text-white shadow-lg shadow-black/10"
              >
                {sample.cta}
              </Anchor>
              {data.phone ? (
                <Anchor
                  isStatic={isStatic}
                  href={telHref(data.phone)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 font-semibold"
                >
                  <Phone className="size-4" /> {data.phone}
                </Anchor>
              ) : null}
            </div>
          </div>
          <div className="relative">
            {hero ? (
              <img
                src={hero.url}
                alt={hero.alt}
                className="aspect-[4/3] w-full rounded-3xl object-cover shadow-2xl shadow-black/15"
              />
            ) : (
              <div className="relative grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-3xl bg-[var(--accent)] shadow-2xl shadow-black/15">
                <div className="absolute -right-16 -top-16 size-64 rounded-full bg-white/10" />
                <div className="absolute -bottom-20 -left-10 size-72 rounded-full bg-black/10" />
                <Icon className="relative size-28 text-white/90" strokeWidth={1.25} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-[var(--accent)]">What we do</p>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight">Services</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sample.services.map((service) => (
            <div key={service.title} className="rounded-2xl border border-slate-200 p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold">{service.title}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{service.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Gallery */}
      {gallery.length ? (
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <h2 className="font-display text-3xl font-bold tracking-tight">Recent work</h2>
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
            {gallery.map((image) => (
              <img
                key={image.url}
                src={image.url}
                alt={image.alt}
                className="aspect-square w-full rounded-2xl object-cover"
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Video */}
      {data.videoUrl ? (
        <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
          <video src={data.videoUrl} controls playsInline className="w-full rounded-3xl shadow-xl" />
        </section>
      ) : null}

      {/* Why us + about */}
      <section className="bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight">Why neighbors choose us</h2>
            <ul className="mt-6 space-y-3">
              {sample.whyUs.map((reason) => (
                <li key={reason} className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-white">
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                  <span className="text-slate-700">{reason}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight">About {data.businessName}</h2>
            <p className="mt-6 text-slate-700">{sample.about}</p>
            <p className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600">
              <MapPin className="size-4 text-[var(--accent)]" /> Serving {sample.serviceArea}
            </p>
          </div>
        </div>
      </section>

      {/* Quote band */}
      <section id="quote" className="bg-[var(--accent)] text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight">Ready for a free quote?</h2>
            <p className="mt-2 text-white/80">Tell us what you need — we usually reply the same day.</p>
          </div>
          <Anchor
            isStatic={isStatic}
            href={quoteHref}
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-[var(--accent)]"
          >
            <Phone className="size-4" /> {data.phone ?? sample.cta}
          </Anchor>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-500 sm:px-6">
          © {data.businessName}
          {data.city ? ` · ${data.city}${data.state ? `, ${data.state}` : ""}` : ""}
        </div>
      </footer>
    </div>
  );
}
