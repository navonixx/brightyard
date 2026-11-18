import Link from "next/link";
import { ArrowRight, Camera, Clapperboard, Gauge, MousePointerClick, PhoneCall, Search, Smartphone, Wand2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { InquiryForm } from "@/components/inquiry-form";
import { DEMOS } from "@/lib/demos";
import { TRADE_META } from "@/lib/brand";

const STEPS = [
  {
    icon: Search,
    title: "We look you up",
    body: "Your Google reviews, your services, your service area. No forms to fill out.",
  },
  {
    icon: Wand2,
    title: "We build your homepage",
    body: "A custom, mobile-first preview with your name, your services and AI-made photos — usually within 48 hours.",
  },
  {
    icon: MousePointerClick,
    title: "You decide",
    body: "Love it? Pay what you think it's worth and we put it live. Not for you? Walk away, no hard feelings.",
  },
];

const FEATURES = [
  { icon: Smartphone, title: "Built for phones", body: "Most of your customers find you on a phone. Your site is designed for that first." },
  { icon: PhoneCall, title: "Click-to-call everywhere", body: "One tap from any section to your phone. More calls, fewer bounces." },
  { icon: Gauge, title: "Fast & Google-friendly", body: "Clean, quick pages that search engines can read." },
  { icon: Camera, title: "AI photo set", body: "Polished hero and gallery images when you don't have great photos yet." },
  { icon: Clapperboard, title: "15-second promo video", body: "A short clip for your Google profile, Facebook or Instagram." },
  { icon: Wand2, title: "Copy that sounds like you", body: "Plain, friendly words about what you actually do — no fluff." },
];

const PRICES = [
  { name: "Homepage", price: "$99", note: "suggested", items: ["Custom one-page site", "Click-to-call + quote section", "Set up on your domain"] },
  { name: "Homepage + photos", price: "$149", note: "suggested", items: ["Everything in Homepage", "6 AI-made photos", "Gallery section"], featured: true },
  { name: "Homepage + video", price: "$199", note: "suggested", items: ["Everything in Homepage + photos", "15-second promo video", "Sized for Google & social"] },
];

const FAQ = [
  {
    q: "Is the preview really free?",
    a: "Yes. We build it first so you can see exactly what you'd get. You only pay if you want it live.",
  },
  {
    q: "What does “pay what it's worth” mean?",
    a: "You pick the price. Most owners choose between $99 and $199. If you like it, pay what feels fair for your business.",
  },
  {
    q: "Do I need a domain?",
    a: "If you have one, we connect it. If not, we'll help you register one in your name — you always own it.",
  },
  {
    q: "What about hosting and changes later?",
    a: "Hosting plus small edits is an optional $15/month after launch. You can cancel anytime.",
  },
  {
    q: "I already have a website.",
    a: "Great — we'll show you a fresh version side by side. If yours does the job, keep it.",
  },
];

export default function Home() {
  return (
    <main className="flex-1">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" aria-label="Brightyard home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-muted md:flex">
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#examples" className="hover:text-ink">Examples</a>
            <a href="#pricing" className="hover:text-ink">Pricing</a>
            <a href="#faq" className="hover:text-ink">FAQ</a>
          </nav>
          <a href="#start" className="btn-primary">Free preview</a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-40 -top-40 size-[34rem] rounded-full bg-sun/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-48 -left-40 size-[30rem] rounded-full bg-brand/15 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.1fr_1fr] md:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-xs font-semibold text-muted">
              <span className="size-2 rounded-full bg-sun" /> For landscapers, painters, cleaners & handymen
            </p>
            <h1 className="mt-5 font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl">
              Your new website is <span className="text-brand">already built.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted">
              We design a custom homepage for your business before you spend a cent. If you love it, pay what you
              think it&apos;s worth and we put it live. If not, walk away.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#start" className="btn-primary px-6 py-3 text-base">
                Build my free preview <ArrowRight className="size-4" />
              </a>
              <a href="#examples" className="btn-ghost px-6 py-3 text-base">See examples</a>
            </div>
            <p className="mt-6 text-sm text-muted">No credit card · Ready in ~48 hours · You own everything</p>
          </div>

          {/* Stacked browser mockups */}
          <div className="relative h-[27rem] sm:h-[29rem]">
            {DEMOS.map((demo, i) => {
              const meta = TRADE_META[demo.trade];
              return (
                <Link
                  key={demo.slug}
                  href={`/demo/${demo.slug}`}
                  className="absolute w-[85%] overflow-hidden rounded-2xl border border-line bg-white shadow-2xl shadow-black/10 transition hover:-translate-y-1"
                  style={{ top: `${i * 31}%`, left: `${i * 7.5}%`, zIndex: i + 1, rotate: `${(i - 1) * 1.5}deg` }}
                >
                  <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="size-2.5 rounded-full bg-red-300" />
                    <span className="size-2.5 rounded-full bg-amber-300" />
                    <span className="size-2.5 rounded-full bg-green-300" />
                    <span className="ml-2 truncate text-[11px] text-slate-500">{demo.slug}.com</span>
                  </div>
                  <div className="p-5" style={{ background: meta.accentSoft }}>
                    <p className="text-xs font-bold" style={{ color: meta.accent }}>{demo.businessName}</p>
                    <p className="mt-2 font-display text-xl font-bold leading-tight text-slate-900">
                      {demo.sample.headline}
                    </p>
                    <span
                      className="mt-4 inline-block rounded-full px-3 py-1.5 text-xs font-semibold text-white"
                      style={{ background: meta.accent }}
                    >
                      {demo.sample.cta}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-line bg-card">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-4xl font-bold tracking-tight">How it works</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="rounded-2xl border border-line bg-paper p-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-brand text-white">
                    <step.icon className="size-5" />
                  </span>
                  <span className="font-display text-sm font-bold text-muted">Step {i + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Examples */}
      <section id="examples" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="font-display text-4xl font-bold tracking-tight">Example previews</h2>
        <p className="mt-3 text-muted">Fictional businesses, real templates. Tap one to see the full site.</p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {DEMOS.map((demo) => {
            const meta = TRADE_META[demo.trade];
            return (
              <Link
                key={demo.slug}
                href={`/demo/${demo.slug}`}
                className="group card overflow-hidden transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="h-40 p-5" style={{ background: meta.accentSoft }}>
                  <p className="text-xs font-bold" style={{ color: meta.accent }}>{meta.label}</p>
                  <p className="mt-2 font-display text-2xl font-bold leading-tight text-slate-900">
                    {demo.sample.headline}
                  </p>
                </div>
                <div className="flex items-center justify-between p-5">
                  <div>
                    <p className="font-semibold">{demo.businessName}</p>
                    <p className="text-sm text-muted">{demo.city}, {demo.state}</p>
                  </div>
                  <ArrowRight className="size-5 text-muted transition group-hover:translate-x-1 group-hover:text-brand" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-line bg-card">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-4xl font-bold tracking-tight">Everything a local pro needs</h2>
          <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                  <f.icon className="size-5" />
                </span>
                <div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="font-display text-4xl font-bold tracking-tight">Pay what it&apos;s worth</h2>
        <p className="mt-3 max-w-2xl text-muted">
          You see the finished preview first, then choose the price. These are the amounts most owners pick.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {PRICES.map((p) => (
            <div
              key={p.name}
              className={`card relative p-6 ${p.featured ? "border-brand ring-2 ring-brand/20" : ""}`}
            >
              {p.featured ? (
                <span className="absolute -top-3 left-6 rounded-full bg-sun px-3 py-0.5 text-xs font-bold text-ink">
                  Most chosen
                </span>
              ) : null}
              <p className="font-semibold">{p.name}</p>
              <p className="mt-3 font-display text-4xl font-bold">
                {p.price} <span className="text-sm font-medium text-muted">{p.note}</span>
              </p>
              <ul className="mt-6 space-y-2 text-sm text-muted">
                {p.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-brand">✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-y border-line bg-card">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-4xl font-bold tracking-tight">Questions</h2>
          <div className="mt-8 divide-y divide-line">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                  {item.q}
                  <span className="text-muted transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Start */}
      <section id="start" className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <h2 className="text-center font-display text-4xl font-bold tracking-tight">Get your free preview</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted">
          Tell us who you are. We&apos;ll email you a link to your new homepage within 48 hours.
        </p>
        <div className="mt-10">
          <InquiryForm />
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:px-6">
          <Logo className="text-ink" />
          <p>Websites for home-service pros · Built before you pay</p>
        </div>
      </footer>
    </main>
  );
}
