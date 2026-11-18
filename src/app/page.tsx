import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { InquiryForm } from "@/components/inquiry-form";
import { SiteRender } from "@/components/site-render";
import { DEMOS } from "@/lib/demos";
import { TRADE_META } from "@/lib/brand";

const STEPS = [
  { n: "01", title: "We look you up.", body: "Your Google reviews, your services, your service area. Nothing for you to fill out." },
  { n: "02", title: "We build your homepage.", body: "A custom, phone-first preview with your name and your work. Usually within 48 hours." },
  { n: "03", title: "You decide.", body: "Love it? Pay what you think it's worth and we put it live. Not for you? Walk away." },
];

const FEATURES = [
  { title: "Built for phones.", body: "Most customers find you on a phone. Every page is designed for a thumb first." },
  { title: "Tap to call. Everywhere.", body: "One tap from any section to your phone. More calls, fewer bounces." },
  { title: "Fast and findable.", body: "Clean, quick pages that search engines can read." },
  { title: "AI photo set.", body: "Polished hero and gallery images when you don't have great photos yet." },
  { title: "15‑second promo video.", body: "A short clip for your Google profile, Facebook or Instagram." },
  { title: "Words that sound like you.", body: "Plain, friendly copy about what you actually do. No fluff." },
];

const PRICES = [
  { name: "Homepage", price: "$99", items: ["Custom one‑page site", "Tap‑to‑call and quote section", "Set up on your domain"] },
  { name: "Homepage + Photos", price: "$149", items: ["Everything in Homepage", "Six AI‑made photos", "Gallery section"], featured: true },
  { name: "Homepage + Video", price: "$199", items: ["Everything in Homepage + Photos", "15‑second promo video", "Sized for Google and social"] },
];

const FAQ = [
  { q: "Is the preview really free?", a: "Yes. We build it first so you can see exactly what you'd get. You only pay if you want it live." },
  { q: "What does “pay what it's worth” mean?", a: "You pick the price. Most owners choose between $99 and $199 — whatever feels fair for your business." },
  { q: "Do I need a domain?", a: "If you have one, we connect it. If not, we'll help you register one in your name. You always own it." },
  { q: "What about hosting and changes later?", a: "Hosting plus small edits is an optional $15 a month after launch. Cancel anytime." },
  { q: "I already have a website.", a: "We'll show you a fresh version side by side. If yours does the job, keep it." },
];

const hero = DEMOS[0];

export default function Home() {
  return (
    <div className="flex-1 bg-canvas text-graphite">
      {/* Global nav */}
      <nav className="bg-void text-white">
        <div className="mx-auto flex h-11 max-w-[1024px] items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Brightyard home" className="opacity-90 hover:opacity-100">
            <Logo size="sm" />
          </Link>
          <div className="hidden items-center gap-8 t-fine text-white/80 md:flex">
            <a href="#how" className="hover:text-white">How it works</a>
            <a href="#examples" className="hover:text-white">Examples</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
          </div>
          <a href="#start" className="t-fine text-white/80 hover:text-white">Get started</a>
        </div>
      </nav>

      {/* Sub-nav (frosted) */}
      <div className="sticky top-0 z-40 border-b border-black/[0.08] bg-parchment/80 backdrop-blur-xl backdrop-saturate-[180%]">
        <div className="mx-auto flex h-[52px] max-w-[1024px] items-center justify-between px-4 sm:px-6">
          <span className="t-tagline">Brightyard</span>
          <div className="flex items-center gap-6">
            <a href="#examples" className="hidden t-caption text-graphite-80 hover:text-graphite sm:block">Examples</a>
            <a href="#pricing" className="hidden t-caption text-graphite-80 hover:text-graphite sm:block">Pricing</a>
            <a href="#start" className="rounded-full bg-action px-3.5 py-1.5 t-caption text-white transition-transform active:scale-95">
              Free preview
            </a>
          </div>
        </div>
      </div>

      <main>
        {/* Hero — light tile */}
        <section className="overflow-hidden bg-canvas pt-14 text-center sm:pt-20">
          <div className="mx-auto max-w-[980px] px-4 sm:px-6">
            <p className="t-tagline text-graphite-48">For landscapers, painters, cleaners and handymen</p>
            <h1 className="t-hero mx-auto mt-3 max-w-[16ch]">Your new website is already built.</h1>
            <p className="t-lead mx-auto mt-4 max-w-[30ch] text-graphite">
              See it first. Love it? Pay what it&apos;s worth.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <a href="#start" className="pill-primary">Get my free preview</a>
              <a href="#examples" className="pill-ghost">See examples</a>
            </div>
          </div>
          <div className="mx-auto mt-14 max-w-[980px] px-4 sm:mt-16 sm:px-6">
            <SiteRender data={{ ...hero, images: [] }} url={`${hero.slug}.com`} />
          </div>
          <div className="h-16 sm:h-20" />
        </section>

        {/* How it works — dark tile */}
        <section id="how" className="bg-tile py-20 text-white sm:py-24">
          <div className="mx-auto max-w-[980px] px-4 text-center sm:px-6">
            <h2 className="t-display">Three steps. Zero risk.</h2>
            <p className="t-lead mx-auto mt-3 max-w-[32ch] text-on-dark-muted">
              You don&apos;t pay for a website you haven&apos;t seen.
            </p>
          </div>
          <div className="mx-auto mt-14 grid max-w-[980px] gap-12 px-4 text-center sm:px-6 md:grid-cols-3 md:gap-8">
            {STEPS.map((step) => (
              <div key={step.n}>
                <p className="t-caption font-semibold text-action-on-dark">{step.n}</p>
                <h3 className="t-tagline mt-3">{step.title}</h3>
                <p className="t-body mt-2 text-on-dark-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Examples — parchment tile */}
        <section id="examples" className="bg-parchment py-20 sm:py-24">
          <div className="mx-auto max-w-[980px] px-4 text-center sm:px-6">
            <h2 className="t-display">Previews we&apos;ve built.</h2>
            <p className="t-lead mx-auto mt-3 max-w-[30ch] text-graphite-48">Fictional businesses. Real templates.</p>
          </div>
          <div className="mx-auto mt-12 grid max-w-[1100px] gap-5 px-4 sm:px-6 md:grid-cols-3">
            {DEMOS.map((demo) => (
              <Link
                key={demo.slug}
                href={`/demo/${demo.slug}`}
                className="group rounded-[18px] border border-hairline bg-canvas p-5 transition-transform active:scale-[0.98]"
              >
                <SiteRender data={{ ...demo, images: [] }} url={`${demo.slug}.com`} size="card" />
                <p className="t-caption mt-5 font-semibold text-graphite-48">{TRADE_META[demo.trade].label}</p>
                <p className="t-body mt-1 font-semibold">{demo.businessName}</p>
                <p className="t-body text-graphite-48">{demo.city}, {demo.state}</p>
                <span className="t-body mt-3 inline-flex items-center text-action group-hover:underline">
                  View example <ChevronRight className="size-4" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Features — dark tile 2 */}
        <section className="bg-tile-2 py-20 text-white sm:py-24">
          <div className="mx-auto max-w-[980px] px-4 text-center sm:px-6">
            <h2 className="t-display">Everything a local pro needs.</h2>
            <p className="t-lead mx-auto mt-3 max-w-[30ch] text-on-dark-muted">Nothing you don&apos;t.</p>
          </div>
          <div className="mx-auto mt-14 grid max-w-[980px] gap-x-10 gap-y-12 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <h3 className="t-tagline">{f.title}</h3>
                <p className="t-body mt-2 text-on-dark-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing — light tile */}
        <section id="pricing" className="bg-canvas py-20 sm:py-24">
          <div className="mx-auto max-w-[980px] px-4 text-center sm:px-6">
            <h2 className="t-display">Pay what it&apos;s worth.</h2>
            <p className="t-lead mx-auto mt-3 max-w-[34ch] text-graphite-48">
              See the finished preview, then choose the price. These are the amounts most owners pick.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-[1100px] gap-5 px-4 sm:px-6 md:grid-cols-3">
            {PRICES.map((p) => (
              <div
                key={p.name}
                className={`flex flex-col rounded-[18px] bg-parchment p-8 ${p.featured ? "ring-2 ring-action-focus" : ""}`}
              >
                {p.featured ? <p className="t-caption font-semibold text-action">Most chosen</p> : <p className="t-caption">&nbsp;</p>}
                <h3 className="t-tagline mt-2">{p.name}</h3>
                <p className="mt-4 font-display text-[40px] font-semibold leading-none tracking-[-0.01em]">
                  {p.price}
                  <span className="t-caption ml-2 font-normal text-graphite-48">suggested</span>
                </p>
                <ul className="t-body mt-6 flex-1 space-y-2 text-graphite-80">
                  {p.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <a href="#start" className={`mt-8 self-start ${p.featured ? "pill-primary" : "pill-ghost"}`}>
                  Get my preview
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ — parchment tile */}
        <section id="faq" className="bg-parchment py-20 sm:py-24">
          <div className="mx-auto max-w-[760px] px-4 sm:px-6">
            <h2 className="t-display text-center">Questions? Answers.</h2>
            <div className="mt-12 divide-y divide-hairline border-y border-hairline">
              {FAQ.map((item) => (
                <details key={item.q} className="group py-5">
                  <summary className="t-tagline flex cursor-pointer list-none items-center justify-between gap-4 text-[19px]">
                    {item.q}
                    <span className="text-[24px] font-light text-graphite-48 transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="t-body mt-3 text-graphite-80">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Start — dark tile 3 */}
        <section id="start" className="bg-tile-3 py-20 text-white sm:py-24">
          <div className="mx-auto max-w-[980px] px-4 text-center sm:px-6">
            <h2 className="t-display">Get your free preview.</h2>
            <p className="t-lead mx-auto mt-3 max-w-[32ch] text-on-dark-muted">
              Tell us who you are. Your new homepage lands in your inbox within 48 hours.
            </p>
          </div>
          <div className="mx-auto mt-12 max-w-[760px] px-4 sm:px-6">
            <InquiryForm />
          </div>
        </section>
      </main>

      {/* Footer — parchment */}
      <footer className="bg-parchment text-graphite-80">
        <div className="mx-auto max-w-[1024px] px-4 py-16 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-3">
            <div>
              <Logo className="text-graphite" />
              <p className="t-caption mt-3 max-w-[28ch] text-graphite-48">
                Websites for home‑service pros. Built before you pay.
              </p>
            </div>
            <div>
              <p className="t-caption font-semibold text-graphite">Explore</p>
              <ul className="mt-2 text-[14px] leading-[2.2]">
                <li><a href="#how" className="hover:underline">How it works</a></li>
                <li><a href="#examples" className="hover:underline">Examples</a></li>
                <li><a href="#pricing" className="hover:underline">Pricing</a></li>
              </ul>
            </div>
            <div>
              <p className="t-caption font-semibold text-graphite">Help</p>
              <ul className="mt-2 text-[14px] leading-[2.2]">
                <li><a href="#faq" className="hover:underline">FAQ</a></li>
                <li><a href="#start" className="hover:underline">Get a free preview</a></li>
              </ul>
            </div>
          </div>
          <p className="t-fine mt-12 border-t border-hairline pt-6 text-graphite-48">
            Example sites show fictional businesses. Brightyard is an independent web studio.
          </p>
        </div>
      </footer>
    </div>
  );
}
