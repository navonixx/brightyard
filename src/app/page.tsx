import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { InquiryForm } from "@/components/inquiry-form";
import { BrowserRender, PhoneRender } from "@/components/site-render";
import { Reveal } from "@/components/motion/reveal";
import { CountUp } from "@/components/motion/count-up";
import { Chapters } from "@/components/motion/chapters";
import { DEMOS } from "@/lib/demos";
import { PHOTO } from "@/lib/photos";

const INDUSTRIES = [
  "Landscapers", "Bakeries", "Hair salons", "Gyms", "Cafés", "Painters", "Cleaners", "Handymen",
  "Restaurants", "Barbers", "Dentists", "Florists", "Pressure washers", "Photographers",
];

const STEPS = [
  { n: "01", title: "Tell us about your business.", body: "Two minutes. Your name, your city, what you do. No calls, no meetings." },
  { n: "02", title: "We build the whole site.", body: "Not a mock-up — a finished, working website with your services, your reviews and a tap-to-call button. Usually within 48 hours." },
  { n: "03", title: "Pay what it's worth.", body: "Love it? Choose your price and we put it live on your domain. Not for you? Walk away. No invoice, no hard feelings." },
];

const PRICES = [
  { name: "Starter", price: 99, note: "One-page website, set up on your domain.", items: ["Your services, reviews and photos", "Tap-to-call and quote button", "Domain connected"] },
  { name: "Plus", price: 149, note: "Everything in Starter, polished with you.", items: ["Copy refined together", "Two rounds of changes", "Google Business profile linked"], featured: true },
  { name: "Pro", price: 199, note: "Everything in Plus, looked after.", items: ["3 months of edits included", "Hosting for the first year", "Priority turnaround"] },
];

const FAQ = [
  { q: "Is it really free to see?", a: "Yes. We build the finished website first, so you know exactly what you're getting. You only pay if you want to keep it." },
  { q: "What does “pay what it's worth” mean?", a: "You choose the price. The amounts on this page are what most owners pick — pay what feels fair for your business." },
  { q: "Can I use my own photos?", a: "Please do — send them over and we'll swap them in. Until then we use fitting sample imagery so the preview never looks empty." },
  { q: "What if I want changes?", a: "Tell us what to change and we'll update the preview. The link stays the same, so you can share it with a partner or spouse." },
  { q: "Who owns the website?", a: "You do. Your domain, your content, your site — all in your name." },
  { q: "What happens after launch?", a: "Hosting plus small edits is an optional $15 a month. Cancel anytime." },
];

function Words({ text, offset = 0 }: { text: string; offset?: number }) {
  return text.split(" ").map((word, i) => (
    <span key={`${word}-${i}`} className="word" style={{ "--i": i + offset } as CSSProperties}>
      {word}&nbsp;
    </span>
  ));
}

const [greenline, maison, noir, forge, oak] = DEMOS;

export default function Home() {
  const chapters = [
    {
      eyebrow: "Phone-first",
      title: "Looks right on the phone in their hand.",
      body: "Most people find a local business on a phone, often while standing in the driveway. Every Brightyard site is designed thumb-first, then scaled up to desktop.",
      points: ["Big, readable type", "Photos that load fast on mobile data", "Nothing to pinch or zoom"],
      visual: <PhoneRender data={oak} scroll="always" initialZoom={0.67} className="w-[260px]" />,
      mobileVisual: <PhoneRender data={oak} scroll="always" initialZoom={0.56} className="mx-auto w-[220px]" />,
    },
    {
      eyebrow: "Instant contact",
      title: "One tap to call. One tap to ask for a quote.",
      body: "Your number and your quote button are in the header, the hero and the footer — wherever the visitor stops reading, the next step is right there.",
      points: ["Tap-to-call everywhere", "Clear quote button", "Your service area spelled out"],
      visual: <PhoneRender data={forge} scroll="always" initialZoom={0.67} className="w-[260px]" />,
      mobileVisual: <PhoneRender data={forge} scroll="always" initialZoom={0.56} className="mx-auto w-[220px]" />,
    },
    {
      eyebrow: "Proof",
      title: "Your reviews and your work, front and center.",
      body: "Your Google rating, your best photos and the three reasons customers choose you — all before the first scroll.",
      points: ["Google rating on the page", "Gallery of your work", "Why-us section written for you"],
      visual: <PhoneRender data={maison} scroll="always" initialZoom={0.67} className="w-[260px]" />,
      mobileVisual: <PhoneRender data={maison} scroll="always" initialZoom={0.56} className="mx-auto w-[220px]" />,
    },
  ];

  return (
    <div className="flex-1 bg-void text-graphite">
      {/* Global nav */}
      <nav className="bg-void text-white">
        <div className="mx-auto flex h-11 max-w-[1100px] items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Brightyard home" className="opacity-90 hover:opacity-100">
            <Logo size="sm" />
          </Link>
          <div className="hidden items-center gap-8 t-fine text-white/80 md:flex">
            <a href="#work" className="hover:text-white">Work</a>
            <a href="#inside" className="hover:text-white">What&apos;s inside</a>
            <a href="#how" className="hover:text-white">How it works</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
          </div>
          <a href="#start" className="t-fine text-white/80 hover:text-white">Contact</a>
        </div>
      </nav>

      {/* Frosted sub-nav */}
      <div className="sticky top-0 z-40 border-b border-white/10 bg-[#161617]/90 text-white backdrop-blur-xl backdrop-saturate-[180%]">
        <div className="mx-auto flex h-[52px] max-w-[1100px] items-center justify-between px-4 sm:px-6">
          <span className="t-tagline">Brightyard</span>
          <div className="flex items-center gap-6">
            <a href="#work" className="hidden t-caption text-white/80 hover:text-white sm:block">Work</a>
            <a href="#pricing" className="hidden t-caption text-white/80 hover:text-white sm:block">Pricing</a>
            <a href="#start" className="rounded-full bg-action px-3.5 py-1.5 t-caption text-white transition-transform active:scale-95">
              Get my free site
            </a>
          </div>
        </div>
      </div>

      <main>
        {/* ── Hero ── */}
        <section className="relative overflow-hidden bg-void pt-16 text-white sm:pt-24">
          <div className="mx-auto max-w-[1100px] px-4 text-center sm:px-6">
            <p className="fade-in text-[14px] font-semibold uppercase tracking-[0.2em] text-white/55 sm:text-[15px]">
              Web design studio for local businesses
            </p>
            <h1 className="mx-auto mt-5 max-w-[14ch] text-balance font-display text-[44px] font-semibold leading-[1.02] tracking-[-0.03em] sm:text-[64px] lg:text-[88px]">
              <Words text="Websites that win the call." />
            </h1>
            <p className="fade-in t-lead mx-auto mt-6 max-w-[34ch] text-on-dark-muted" style={{ "--d": "700ms" } as CSSProperties}>
              We build your whole website first. You pay only if you love it.
            </p>
            <div className="fade-in mt-9 flex flex-wrap items-center justify-center gap-4" style={{ "--d": "900ms" } as CSSProperties}>
              <a href="#start" className="pill-primary">Build my free website</a>
              <a href="#work" className="pill-ghost-dark">See the work</a>
            </div>
          </div>

          {/* Stage */}
          <div className="fade-in relative mx-auto mt-14 max-w-[1180px] px-4 pb-20 sm:mt-20 sm:px-16 sm:pb-28" style={{ "--d": "1100ms" } as CSSProperties}>
            <BrowserRender data={greenline} url="greenline-lawn.com" scroll="always" initialZoom={0.74} />
            <div className="float-slow absolute bottom-16 left-4 hidden w-[24%] max-w-[230px] -rotate-6 sm:block">
              <PhoneRender data={noir} scroll="always" initialZoom={0.5} />
            </div>
            <div className="float-slower absolute bottom-8 right-2 w-[30%] max-w-[230px] rotate-[5deg] sm:bottom-10 sm:right-4 sm:w-[24%]">
              <PhoneRender data={maison} scroll="always" initialZoom={0.5} />
            </div>
          </div>
        </section>

        {/* ── Industries marquee ── */}
        <section className="overflow-hidden border-y border-hairline bg-canvas py-5" aria-label="Businesses we build for">
          <div className="marquee-track flex w-max gap-10 whitespace-nowrap">
            {[...INDUSTRIES, ...INDUSTRIES].map((name, i) => (
              <span key={`${name}-${i}`} className="t-tagline text-graphite-48" aria-hidden={i >= INDUSTRIES.length}>
                {name} <span className="ml-10 text-hairline">•</span>
              </span>
            ))}
          </div>
        </section>

        {/* ── Selected work ── */}
        <section id="work" className="bg-tile py-24 text-white sm:py-32">
          <Reveal className="mx-auto max-w-[1100px] px-4 sm:px-6">
            <p className="t-caption font-semibold uppercase tracking-[0.18em] text-action-on-dark">Selected work</p>
            <h2 className="t-display mt-3 max-w-[16ch]">Six sites. Six very different businesses.</h2>
            <p className="t-lead mt-4 max-w-[38ch] text-on-dark-muted">
              Hover any site to scroll through it. Every one is a complete, working website — exactly what you&apos;d receive.
            </p>
          </Reveal>
          <div className="mx-auto mt-14 grid max-w-[1180px] gap-6 px-4 sm:px-6 md:grid-cols-2 md:gap-8">
            {DEMOS.map((demo, i) => (
              <Reveal key={demo.slug} delay={(i % 2) * 120} className={i === 0 ? "md:col-span-2" : ""}>
                <Link href={`/demo/${demo.slug}`} className="group block">
                  <div className={`autoscroll-hover relative overflow-hidden rounded-[22px] bg-tile-2 ring-1 ring-white/10 ${i === 0 ? "aspect-[16/9]" : "aspect-[16/11]"}`}>
                    <div className={`absolute inset-x-[6%] ${i === 0 ? "top-[9%] sm:inset-x-[12%]" : "top-[10%]"}`}>
                      <BrowserRender data={demo} url={`${demo.slug}.com`} scroll="always" initialZoom={i === 0 ? 0.6 : 0.4} />
                    </div>
                    <div className={`absolute bottom-[-10%] ${i === 0 ? "right-[5%] w-[16%]" : "right-[4%] w-[23%]"}`}>
                      <PhoneRender data={demo} initialZoom={i === 0 ? 0.45 : 0.32} />
                    </div>
                  </div>
                  <div className="mt-5 flex items-start justify-between gap-4">
                    <div>
                      <p className="t-caption font-semibold text-on-dark-muted">{demo.industry} · {demo.city}, {demo.state}</p>
                      <h3 className="t-tagline mt-1 text-[22px]">{demo.businessName}</h3>
                      <p className="t-body mt-1 text-on-dark-muted">{demo.blurb}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {demo.tags.map((tag) => (
                          <span key={tag} className="rounded-full border border-white/15 px-2.5 py-1 text-[12px] text-white/70">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <span className="mt-1 grid size-10 shrink-0 place-items-center rounded-full border border-white/20 text-white transition group-hover:bg-white group-hover:text-graphite">
                      <ArrowUpRight className="size-5" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── What's inside: sticky chapters ── */}
        <section id="inside" className="bg-canvas pt-24 sm:pt-32">
          <Reveal className="mx-auto max-w-[1100px] px-4 text-center sm:px-6">
            <h2 className="t-display">Built to get the call.</h2>
            <p className="t-lead mx-auto mt-4 max-w-[32ch] text-graphite-48">
              Every Brightyard site is built around the one thing that matters: a customer reaching you.
            </p>
          </Reveal>
          <div className="pb-16 sm:pb-24">
            <Chapters chapters={chapters} />
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how" className="bg-parchment py-24 sm:py-32">
          <Reveal className="mx-auto max-w-[1100px] px-4 text-center sm:px-6">
            <h2 className="t-display">No risk. Not even a little.</h2>
            <p className="t-lead mx-auto mt-4 max-w-[30ch] text-graphite-48">You never pay for something you haven&apos;t seen.</p>
          </Reveal>
          <div className="mx-auto mt-16 grid max-w-[1100px] gap-5 px-4 sm:px-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <Reveal key={step.n} delay={i * 120} className="rounded-[22px] bg-canvas p-8">
                <p className="font-display text-[64px] font-semibold leading-none tracking-[-0.04em] text-action">{step.n}</p>
                <h3 className="t-tagline mt-6">{step.title}</h3>
                <p className="t-body mt-2 text-graphite-80">{step.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Numbers ── */}
        <section className="bg-canvas py-20 sm:py-24">
          <div className="mx-auto grid max-w-[1100px] grid-cols-3 gap-3 px-4 text-center sm:gap-6 sm:px-6">
            {[
              { value: <CountUp to={48} suffix="h" />, label: "to your finished preview" },
              { value: <CountUp to={0} prefix="$" />, label: "upfront, ever" },
              { value: <CountUp to={100} suffix="%" />, label: "yours to keep" },
            ].map((stat, i) => (
              <Reveal key={stat.label} delay={i * 100}>
                <p className="font-display text-[32px] font-semibold leading-none tracking-[-0.04em] min-[420px]:text-[40px] sm:text-[72px]">{stat.value}</p>
                <p className="t-caption mt-3 text-graphite-48">{stat.label}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="bg-tile-2 py-24 text-white sm:py-32">
          <Reveal className="mx-auto max-w-[1100px] px-4 text-center sm:px-6">
            <h2 className="t-display">Pay what it&apos;s worth.</h2>
            <p className="t-lead mx-auto mt-4 max-w-[34ch] text-on-dark-muted">
              See the finished site first, then choose your price. These are the amounts most owners pick.
            </p>
          </Reveal>
          <div className="mx-auto mt-14 grid max-w-[1100px] gap-5 px-4 sm:px-6 md:grid-cols-3">
            {PRICES.map((p, i) => (
              <Reveal
                key={p.name}
                delay={i * 100}
                className={`flex flex-col rounded-[22px] p-8 ${p.featured ? "bg-canvas text-graphite" : "bg-tile-3 ring-1 ring-white/10"}`}
              >
                <p className={`t-caption font-semibold ${p.featured ? "text-action" : "text-action-on-dark"}`}>
                  {p.featured ? "Most chosen" : "Suggested"}
                </p>
                <h3 className="t-tagline mt-2">{p.name}</h3>
                <p className="mt-4 font-display text-[48px] font-semibold leading-none tracking-[-0.03em]">${p.price}</p>
                <p className={`t-body mt-4 ${p.featured ? "text-graphite-80" : "text-on-dark-muted"}`}>{p.note}</p>
                <ul className={`t-body mt-6 flex-1 space-y-2 ${p.featured ? "text-graphite-80" : "text-on-dark-muted"}`}>
                  {p.items.map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <span className={p.featured ? "text-action" : "text-action-on-dark"}>✓</span> {item}
                    </li>
                  ))}
                </ul>
                <a href="#start" className={`mt-8 self-start ${p.featured ? "pill-primary" : "pill-ghost-dark"}`}>
                  Build my free site
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
          <Image src={PHOTO.storefront} alt="" fill sizes="100vw" className="object-cover opacity-30" />
          <div className="relative">
            <Reveal className="mx-auto max-w-[1100px] px-4 text-center sm:px-6">
              <h2 className="t-display">Let&apos;s build yours.</h2>
              <p className="t-lead mx-auto mt-4 max-w-[32ch] text-on-dark-muted">
                Tell us about your business. Your finished website lands in your inbox within 48 hours.
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
        <div className="mx-auto max-w-[1100px] px-4 py-16 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <Logo className="text-graphite" />
              <p className="t-caption mt-3 max-w-[34ch] text-graphite-48">
                A small web design studio for local businesses. We build your site first — you pay if you love it.
              </p>
            </div>
            <div>
              <p className="t-caption font-semibold text-graphite">Studio</p>
              <ul className="mt-2 text-[14px] leading-[2.2]">
                <li><a href="#work" className="hover:underline">Work</a></li>
                <li><a href="#inside" className="hover:underline">What&apos;s inside</a></li>
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
            The sites shown are concept sites for fictional businesses, built with the same system your site will use. Photos are AI-generated samples.
          </p>
        </div>
      </footer>
    </div>
  );
}
