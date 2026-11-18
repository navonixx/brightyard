import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { InquiryForm } from "@/components/inquiry-form";
import { SiteRender } from "@/components/site-render";
import { PhotoStack, PromoReel, SHOWCASE } from "@/components/showcase";
import { Reveal } from "@/components/motion/reveal";
import { CountUp } from "@/components/motion/count-up";
import { Chapters } from "@/components/motion/chapters";
import { DEMOS } from "@/lib/demos";

const INDUSTRIES = [
  "Landscapers", "Cafés", "Salons", "Painters", "Bakeries", "Fitness studios",
  "Cleaners", "Handymen", "Restaurants", "Pressure washers", "Barbers", "Florists",
];

const STEPS = [
  { n: "01", title: "Tell us about you.", body: "Your business, your city, what you need. Two minutes, no calls." },
  { n: "02", title: "We make it first.", body: "Your website, photo set or promo video — finished, not a mock-up. Usually within 48 hours." },
  { n: "03", title: "Pay what it's worth.", body: "Love it? Choose the price and it's yours. Not for you? Walk away. No invoices, no hard feelings." },
];

const PRICES = [
  { name: "Website", price: 99, note: "One-page site, tap-to-call, on your domain." },
  { name: "AI photo set", price: 49, note: "Six polished photos for your site and socials." },
  { name: "Promo video", price: 79, note: "A 15-second vertical reel for Google, Instagram and Facebook." },
  { name: "Everything", price: 199, note: "Website, photo set and promo video together.", featured: true },
];

const FAQ = [
  { q: "Is it really free to see?", a: "Yes. We make the finished thing first so you know exactly what you're getting. You only pay if you want to keep it." },
  { q: "What does “pay what it's worth” mean?", a: "You choose the price. The amounts on this page are what most owners pick — pay what feels fair for your business." },
  { q: "Are the photos real?", a: "They're made with AI and art-directed by us to match your business. Want your own photos instead? Send them and we'll use those." },
  { q: "Who owns the work?", a: "You do. Your domain, your files, your video — all in your name." },
  { q: "What happens after launch?", a: "Hosting plus small edits is an optional $15 a month. Cancel anytime." },
];

function Words({ text, offset = 0 }: { text: string; offset?: number }) {
  return text.split(" ").map((word, i) => (
    <span key={`${word}-${i}`} className="word" style={{ "--i": i + offset } as CSSProperties}>
      {word}&nbsp;
    </span>
  ));
}

const demo = DEMOS[0];

export default function Home() {
  const chapters = [
    {
      eyebrow: "Websites",
      title: "A website that works while you do.",
      body: "Built for the phone in your customer's hand. Your services, your reviews, one tap to call.",
      points: ["Phone-first design", "Tap-to-call and quote requests", "Live on your domain in days"],
      visual: <div className="w-full"><SiteRender data={{ ...demo, images: [] }} url={`${demo.slug}.com`} size="panel" /></div>,
      mobileVisual: <SiteRender data={{ ...demo, images: [] }} url={`${demo.slug}.com`} size="panel" />,
    },
    {
      eyebrow: "AI photos",
      title: "Photos that look like a shoot. Without the shoot.",
      body: "Hero images, gallery shots and social posts, art-directed to fit your business and your brand.",
      points: ["Six photos per set", "Sized for web and social", "Your own photos welcome too"],
      visual: <PhotoStack className="w-full max-w-[460px]" />,
      mobileVisual: <PhotoStack />,
    },
    {
      eyebrow: "Promo video",
      title: "Fifteen seconds that stop the scroll.",
      body: "A vertical reel with your best moments and a clear call to action — ready for Google, Instagram and Facebook.",
      points: ["15-second vertical format", "Captions that read without sound", "Your offer, front and center"],
      visual: <PromoReel className="w-[270px]" />,
      mobileVisual: <PromoReel className="mx-auto w-[230px]" />,
    },
  ];

  return (
    <div className="flex-1 bg-void text-graphite">
      {/* Global nav */}
      <nav className="bg-void text-white">
        <div className="mx-auto flex h-11 max-w-[1024px] items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Brightyard home" className="opacity-90 hover:opacity-100">
            <Logo size="sm" />
          </Link>
          <div className="hidden items-center gap-8 t-fine text-white/80 md:flex">
            <a href="#what" className="hover:text-white">What we make</a>
            <a href="#work" className="hover:text-white">Work</a>
            <a href="#how" className="hover:text-white">How it works</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
          </div>
          <a href="#start" className="t-fine text-white/80 hover:text-white">Contact</a>
        </div>
      </nav>

      {/* Frosted sub-nav */}
      <div className="sticky top-0 z-40 border-b border-white/10 bg-[#161617]/90 text-white backdrop-blur-xl backdrop-saturate-[180%]">
        <div className="mx-auto flex h-[52px] max-w-[1024px] items-center justify-between px-4 sm:px-6">
          <span className="t-tagline">Brightyard Studio</span>
          <div className="flex items-center gap-6">
            <a href="#work" className="hidden t-caption text-white/80 hover:text-white sm:block">Work</a>
            <a href="#pricing" className="hidden t-caption text-white/80 hover:text-white sm:block">Pricing</a>
            <a href="#start" className="rounded-full bg-action px-3.5 py-1.5 t-caption text-white transition-transform active:scale-95">
              Get a free sample
            </a>
          </div>
        </div>
      </div>

      <main>
        {/* ── Hero: dark stage ── */}
        <section className="relative overflow-hidden bg-void pt-20 text-white sm:pt-28">
          <div className="mx-auto max-w-[980px] px-4 text-center sm:px-6">
            <p className="fade-in text-[15px] font-semibold tracking-[-0.01em] text-white/60 sm:text-[21px]">Websites · AI photos · Promo videos</p>
            <h1 className="mx-auto mt-4 max-w-[18ch] text-balance font-display text-[40px] font-semibold leading-[1.06] tracking-[-0.025em] sm:text-[56px] lg:text-[72px] lg:leading-[1.03]">
              <Words text="We make it first." />
              <span className="text-white/45">
                <Words text="You pay if you love it." offset={4} />
              </span>
            </h1>
            <p className="fade-in t-lead mx-auto mt-6 max-w-[34ch] text-on-dark-muted" style={{ "--d": "900ms" } as CSSProperties}>
              A small studio making websites, photos and short videos for local businesses.
            </p>
            <div className="fade-in mt-9 flex flex-wrap items-center justify-center gap-4" style={{ "--d": "1100ms" } as CSSProperties}>
              <a href="#start" className="pill-primary">Get a free sample</a>
              <a href="#work" className="pill-ghost-dark">See our work</a>
            </div>
          </div>

          {/* Stage: website + photo + phone */}
          <div className="fade-in relative mx-auto mt-16 max-w-[1040px] px-4 pb-24 sm:mt-20 sm:px-10 sm:pb-32" style={{ "--d": "1300ms" } as CSSProperties}>
            <div className="mx-auto max-w-[948px]">
              <SiteRender data={{ ...demo, images: [] }} url={`${demo.slug}.com`} />
            </div>
            <div className="float-slow absolute bottom-10 left-1 w-[34%] max-w-[260px] -rotate-6 sm:bottom-14 sm:left-4">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] shadow-product ring-1 ring-white/10">
                <Image src={SHOWCASE[0].src} alt="" fill preload sizes="260px" className="ken-burns object-cover" />
                <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-medium backdrop-blur sm:text-[11px]">
                  AI photo
                </span>
              </div>
            </div>
            <div className="float-slower absolute bottom-4 right-2 w-[24%] max-w-[200px] rotate-[5deg] sm:bottom-8 sm:right-6">
              <PromoReel />
            </div>
          </div>
        </section>

        {/* ── Industries marquee ── */}
        <section className="overflow-hidden border-y border-hairline bg-canvas py-6" aria-label="Businesses we work with">
          <div className="marquee-track flex w-max gap-10 whitespace-nowrap">
            {[...INDUSTRIES, ...INDUSTRIES].map((name, i) => (
              <span key={`${name}-${i}`} className="t-tagline text-graphite-48" aria-hidden={i >= INDUSTRIES.length}>
                {name} <span className="ml-10 text-hairline">•</span>
              </span>
            ))}
          </div>
        </section>

        {/* ── What we make: sticky chapters ── */}
        <section id="what" className="bg-canvas pt-24 sm:pt-32">
          <Reveal className="mx-auto max-w-[980px] px-4 text-center sm:px-6">
            <h2 className="t-display">Three things. Done properly.</h2>
            <p className="t-lead mx-auto mt-4 max-w-[30ch] text-graphite-48">
              Everything a local business needs to look as good online as it is in person.
            </p>
          </Reveal>
          <div className="pb-16 sm:pb-24">
            <Chapters chapters={chapters} />
          </div>
        </section>

        {/* ── Work gallery ── */}
        <section id="work" className="bg-tile py-24 text-white sm:py-32">
          <Reveal className="mx-auto max-w-[980px] px-4 text-center sm:px-6">
            <h2 className="t-display">Made by us. Made with AI.</h2>
            <p className="t-lead mx-auto mt-4 max-w-[32ch] text-on-dark-muted">
              A few photos from recent sets. Every one art-directed for the business it&apos;s for.
            </p>
          </Reveal>
          <div className="mx-auto mt-14 grid max-w-[1180px] grid-cols-2 gap-3 px-4 sm:px-6 md:grid-cols-4 md:gap-4">
            {SHOWCASE.map((img, i) => (
              <Reveal
                key={img.src}
                delay={(i % 4) * 90}
                className={`group relative overflow-hidden rounded-[14px] ${i === 0 || i === 5 ? "md:col-span-2 md:row-span-2" : ""}`}
              >
                <div className={`relative aspect-[4/5] ${i === 0 || i === 5 ? "md:aspect-auto md:h-full" : ""}`}>
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    sizes="(min-width: 768px) 45vw, 50vw"
                    className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:scale-105"
                  />
                </div>
                <span className="absolute bottom-3 left-3 rounded-full bg-black/55 px-3 py-1 text-[12px] font-medium backdrop-blur">
                  {img.label}
                </span>
              </Reveal>
            ))}
          </div>
          <Reveal className="mx-auto mt-16 grid max-w-[1100px] gap-5 px-4 sm:px-6 md:grid-cols-3">
            {DEMOS.map((d) => (
              <Link
                key={d.slug}
                href={`/demo/${d.slug}`}
                className="group rounded-[18px] bg-tile-2 p-5 ring-1 ring-white/10 transition-transform active:scale-[0.98]"
              >
                <SiteRender data={{ ...d, images: [] }} url={`${d.slug}.com`} size="card" shadow={false} />
                <p className="t-body mt-5 font-semibold">{d.businessName}</p>
                <span className="t-body mt-1 inline-flex items-center text-action-on-dark group-hover:underline">
                  View example website <ChevronRight className="size-4" />
                </span>
              </Link>
            ))}
          </Reveal>
        </section>

        {/* ── How it works ── */}
        <section id="how" className="bg-parchment py-24 sm:py-32">
          <Reveal className="mx-auto max-w-[980px] px-4 text-center sm:px-6">
            <h2 className="t-display">No risk. Not even a little.</h2>
            <p className="t-lead mx-auto mt-4 max-w-[30ch] text-graphite-48">You never pay for something you haven&apos;t seen.</p>
          </Reveal>
          <div className="mx-auto mt-16 grid max-w-[1100px] gap-5 px-4 sm:px-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <Reveal key={step.n} delay={i * 120} className="rounded-[18px] bg-canvas p-8">
                <p className="font-display text-[56px] font-semibold leading-none tracking-[-0.03em] text-action">{step.n}</p>
                <h3 className="t-tagline mt-6">{step.title}</h3>
                <p className="t-body mt-2 text-graphite-80">{step.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Numbers ── */}
        <section className="bg-canvas py-20 sm:py-24">
          <div className="mx-auto grid max-w-[1100px] grid-cols-2 gap-y-12 px-4 text-center sm:px-6 md:grid-cols-4">
            {[
              { value: <CountUp to={48} suffix="h" />, label: "to your first sample" },
              { value: <CountUp to={0} prefix="$" />, label: "upfront, ever" },
              { value: <CountUp to={15} suffix="s" />, label: "promo videos that convert" },
              { value: <CountUp to={100} suffix="%" />, label: "yours to keep" },
            ].map((stat, i) => (
              <Reveal key={stat.label} delay={i * 100}>
                <p className="font-display text-[48px] font-semibold leading-none tracking-[-0.03em] sm:text-[64px]">{stat.value}</p>
                <p className="t-caption mt-3 text-graphite-48">{stat.label}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="bg-tile-2 py-24 text-white sm:py-32">
          <Reveal className="mx-auto max-w-[980px] px-4 text-center sm:px-6">
            <h2 className="t-display">Pay what it&apos;s worth.</h2>
            <p className="t-lead mx-auto mt-4 max-w-[34ch] text-on-dark-muted">
              See the finished work first, then choose your price. These are the amounts most owners pick.
            </p>
          </Reveal>
          <div className="mx-auto mt-14 grid max-w-[1180px] gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            {PRICES.map((p, i) => (
              <Reveal
                key={p.name}
                delay={i * 90}
                className={`flex flex-col rounded-[18px] p-7 ${p.featured ? "bg-canvas text-graphite" : "bg-tile-3 ring-1 ring-white/10"}`}
              >
                <p className={`t-caption font-semibold ${p.featured ? "text-action" : "text-action-on-dark"}`}>
                  {p.featured ? "Best value" : "Suggested"}
                </p>
                <h3 className="t-tagline mt-2">{p.name}</h3>
                <p className="mt-4 font-display text-[44px] font-semibold leading-none tracking-[-0.02em]">${p.price}</p>
                <p className={`t-body mt-4 flex-1 ${p.featured ? "text-graphite-80" : "text-on-dark-muted"}`}>{p.note}</p>
                <a href="#start" className={`mt-8 self-start ${p.featured ? "pill-primary" : "pill-ghost-dark"}`}>
                  Get a free sample
                </a>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="bg-canvas py-24 sm:py-32">
          <div className="mx-auto max-w-[760px] px-4 sm:px-6">
            <Reveal>
              <h2 className="t-display text-center">Questions? Answers.</h2>
            </Reveal>
            <div className="mt-12 divide-y divide-hairline border-y border-hairline">
              {FAQ.map((item) => (
                <details key={item.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[19px] font-semibold tracking-[-0.01em]">
                    {item.q}
                    <span className="text-[26px] font-light text-graphite-48 transition-transform duration-300 group-open:rotate-45">+</span>
                  </summary>
                  <p className="t-body mt-3 text-graphite-80">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Start ── */}
        <section id="start" className="relative overflow-hidden bg-void py-24 text-white sm:py-32">
          <Image src={SHOWCASE[6].src} alt="" fill sizes="100vw" className="object-cover opacity-25" />
          <div className="relative">
            <Reveal className="mx-auto max-w-[980px] px-4 text-center sm:px-6">
              <h2 className="t-display">Let&apos;s make something for you.</h2>
              <p className="t-lead mx-auto mt-4 max-w-[32ch] text-on-dark-muted">
                Tell us about your business. Your free sample lands in your inbox within 48 hours.
              </p>
            </Reveal>
            <Reveal delay={150} className="mx-auto mt-12 max-w-[760px] px-4 sm:px-6">
              <InquiryForm />
            </Reveal>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-parchment text-graphite-80">
        <div className="mx-auto max-w-[1024px] px-4 py-16 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <Logo className="text-graphite" />
              <p className="t-caption mt-3 max-w-[34ch] text-graphite-48">
                A small creative studio making websites, AI photos and promo videos for local businesses. We make it first — you pay if you love it.
              </p>
            </div>
            <div>
              <p className="t-caption font-semibold text-graphite">Studio</p>
              <ul className="mt-2 text-[14px] leading-[2.2]">
                <li><a href="#what" className="hover:underline">What we make</a></li>
                <li><a href="#work" className="hover:underline">Work</a></li>
                <li><a href="#pricing" className="hover:underline">Pricing</a></li>
              </ul>
            </div>
            <div>
              <p className="t-caption font-semibold text-graphite">Help</p>
              <ul className="mt-2 text-[14px] leading-[2.2]">
                <li><a href="#how" className="hover:underline">How it works</a></li>
                <li><a href="#faq" className="hover:underline">FAQ</a></li>
                <li><a href="#start" className="hover:underline">Contact</a></li>
              </ul>
            </div>
          </div>
          <p className="t-fine mt-12 border-t border-hairline pt-6 text-graphite-48">
            Photos on this page are AI-generated samples. Example websites show fictional businesses.
          </p>
        </div>
      </footer>
    </div>
  );
}
