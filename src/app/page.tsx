import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight, Camera, Check, Clapperboard, Gift, HeartHandshake, Mail, Megaphone, MonitorSmartphone,
  Palette, PenLine, Search, Share2, Smartphone, Sparkles,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { InquiryForm } from "@/components/inquiry-form";
import { BrowserRender, PhoneRender } from "@/components/site-render";
import { SiteHeader } from "@/components/home/site-header";
import { HeroStage } from "@/components/home/hero-stage";
import { Tilt } from "@/components/home/tilt";
import { AutoVideo } from "@/components/home/auto-video";
import { PhotoStudio } from "@/components/home/photo-studio";
import { DEMOS } from "@/lib/demos";
import { CAMPAIGNS, SHOWREEL } from "@/lib/portfolio";

const INDUSTRIES = [
  "Skincare brands", "Restaurants", "Fashion labels", "Product shops", "Real estate", "Gyms & studios",
  "Watchmakers", "SaaS teams", "Landscapers", "Salons", "Cafés", "Dentists", "Contractors", "Florists",
];

const SERVICES = [
  {
    icon: MonitorSmartphone,
    name: "Websites",
    line: "Built before you pay.",
    body: "A complete, working website for your business — phone-first, fast, with your services, reviews and a tap-to-call button. You see it finished, then decide.",
    items: ["Finished preview in 48 hours", "Your domain, your ownership", "Pay what you feel it's worth"],
    href: "#websites",
  },
  {
    icon: Camera,
    name: "Product photography",
    line: "Campaign-grade imagery.",
    body: "Hero shots, ad creatives, lifestyle scenes and social posts, art-directed as one campaign so your brand looks consistent everywhere it appears.",
    items: ["Hero, ad, lifestyle, social & detail", "Sized for web, ads and social", "AI-assisted, art-directed by us"],
    href: "#photography",
  },
  {
    icon: Clapperboard,
    name: "Video & motion ads",
    line: "Made to stop the scroll.",
    body: "Short vertical reels for Instagram, TikTok and Shorts, plus widescreen spots for your website and ads — cut from your campaign so everything matches.",
    items: ["9:16 reels and 16:9 spots", "Loop-ready, captions on request", "Delivered as MP4, ready to post"],
    href: "#video",
  },
];

// Everything else we help with, shown as a compact grid under the three flagship services.
const MORE_SERVICES = [
  { icon: Megaphone, name: "Ad campaigns", body: "We plan, launch and tune your Facebook, Instagram and Google ads so every dollar of budget works harder." },
  { icon: PenLine, name: "Ad content & copy", body: "Scroll-stopping ad creatives, captions, carousels and headlines — written and designed for your audience." },
  { icon: Search, name: "Digital marketing & SEO", body: "Google Business profile, local SEO and a clear plan so people nearby find you before your competitors." },
  { icon: Share2, name: "Social media", body: "A month of on-brand posts, stories and reels planned out, so your pages never look abandoned." },
  { icon: Smartphone, name: "Mobile apps", body: "iPhone and Android apps for bookings, orders or loyalty — designed and built for your customers." },
  { icon: Palette, name: "Branding & logo", body: "Logo, colours and a simple brand kit, so your website, ads and posts all look like one business." },
  { icon: Mail, name: "Email marketing", body: "Welcome emails, offers and newsletters that bring past customers back without you lifting a finger." },
  { icon: Sparkles, name: "Something else?", body: "Landing pages, menus, flyers, online stores — if it helps your business grow online, ask us." },
];

const STEPS = [
  { n: "01", title: "Tell us what you need.", body: "Two minutes: what you sell, who you sell to, and what you need — a website, photos, video, ads, an app or a mix." },
  { n: "02", title: "We do the first piece free.", body: "A finished website, a set of ad creatives, a marketing plan or your first app screens — real work, before any money changes hands." },
  { n: "03", title: "You decide what it's worth.", body: "Love it? Pay whatever you feel is fair. Not for you? Walk away and owe nothing. No packages, no contracts." },
];

const PAY_POINTS = [
  { icon: Gift, title: "Your first project is free", body: "We start by doing real work for you — not a sales call, not a pitch deck." },
  { icon: HeartHandshake, title: "Pay what you feel", body: "If it helped your business, pay what you think it was worth. If not, you pay nothing." },
  { icon: Check, title: "No packages, no lock-in", body: "No compulsory plans or monthly fees. Want more work later? We agree it together, one project at a time." },
];

const FAQ = [
  { q: "Is the first project really free?", a: "Yes. We do the first piece of work before you pay anything — a finished website, ad creatives, a marketing plan or app screens. If you like it, you pay what you feel it's worth. If not, you owe nothing." },
  { q: "Do I have to buy a package or plan?", a: "No. There are no fixed packages or contracts. Every project after the first is agreed with you, and you can stop anytime." },
  { q: "Who pays for the ad budget?", a: "The money you spend on Facebook, Instagram or Google ads goes straight from your own card to those platforms — we never hold it. We handle the creatives, setup and optimisation." },
  { q: "Can you build a mobile app for my business?", a: "Yes — booking, ordering, loyalty or catalogue apps for iPhone and Android. We start with free designs of your first screens so you can see it before deciding to go further." },
  { q: "How does photography and video work?", a: "Tell us about the product and where the images will be used. We send a short creative direction and produce the set — usually within a week." },
  { q: "Are the campaign images real photoshoots?", a: "The campaigns on this page are concept work for fictional brands, produced with AI-assisted imaging and art-directed by us. For your brand we work from your real product photos so what customers see matches what they get." },
  { q: "Can I use my own photos on the website?", a: "Please do — send them over and we'll swap them in. Until then we use fitting sample imagery so the preview never looks empty." },
  { q: "Who owns everything?", a: "You do. Your domain, your website, your images and your videos — all yours to use anywhere." },
  { q: "What happens after launch?", a: "Your website keeps running on your domain. If you'd like us to look after edits, ads or posts going forward, we agree it together — it's always optional." },
];

const [greenline, maison, , forge] = DEMOS;
const hero = CAMPAIGNS[0];
const fitness = CAMPAIGNS.find((c) => c.slug === "turn-count")!;

function PhoneVideo({ src, poster, label, className = "" }: { src: string; poster: string; label: string; className?: string }) {
  return (
    <div className={`phone-frame ${className}`}>
      <div className="phone-screen">
        <AutoVideo src={src} poster={poster} label={label} className="absolute inset-0 size-full object-cover" />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex-1 bg-void text-white">
      <SiteHeader />

      <main>
        {/* ── Hero ── */}
        <section className="relative overflow-hidden pb-16 pt-28 sm:pb-24 sm:pt-32">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="aurora left-[8%] top-[6%] h-[460px] w-[460px] bg-[#e040fb]/50" />
            <div className="aurora right-[6%] top-[14%] h-[420px] w-[420px] bg-[#22d3ee]/40" style={{ animationDelay: "-6s" }} />
            <div className="aurora left-[38%] top-[38%] h-[380px] w-[520px] bg-[#7c3aed]/45" style={{ animationDelay: "-11s" }} />
            <div className="grid-floor" />
          </div>

          <div className="relative mx-auto max-w-[1240px] px-4 text-center sm:px-6">
            <p className="fade-in eyebrow">Alderwell Creative · Websites · Content · Ads · Apps</p>
            <h1 className="fade-in mx-auto mt-6 max-w-[15ch] font-display text-[46px] font-semibold leading-[0.98] tracking-[-0.04em] text-balance sm:text-[72px] lg:text-[88px]" style={{ "--d": "120ms" } as CSSProperties}>
              Make your brand <span className="text-aurora">impossible to scroll past.</span>
            </h1>
            <p className="fade-in mx-auto mt-7 max-w-[46ch] text-[18px] leading-relaxed text-white/65 sm:text-[21px]" style={{ "--d": "260ms" } as CSSProperties}>
              Websites, product photos, video, ads, marketing and mobile apps — one studio, one consistent look. Your first project is free; pay what you feel it&apos;s worth.
            </p>
            <div className="fade-in mt-9 flex flex-wrap items-center justify-center gap-3" style={{ "--d": "380ms" } as CSSProperties}>
              <a href="#start" className="btn-glow px-7 py-3.5 text-[16px]">Start a project</a>
              <a href="#photography" className="btn-outline-dark px-7 py-3.5 text-[16px]">See the work</a>
            </div>
          </div>

          {/* 3D stage: website in the middle, a campaign photo and a reel floating in depth */}
          <div className="fade-in relative mx-auto mt-12 max-w-[1180px] px-4 sm:mt-14 sm:px-10" style={{ "--d": "500ms" } as CSSProperties}>
            <HeroStage className="sd-flatten">
              <div className="relative mx-auto aspect-[16/10] w-full">
                <div className="stage-layer inset-x-[10%] top-[4%]" style={{ "--z": "0px" } as CSSProperties}>
                  <BrowserRender data={greenline} url="greenline-lawn.com" scroll="always" initialZoom={0.6} />
                </div>
                <div className="stage-layer float-a left-0 top-[34%] w-[24%]" style={{ "--z": "140px", "--ry0": "16deg" } as CSSProperties}>
                  <div className="overflow-hidden rounded-[16px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/15">
                    <div className="relative aspect-[4/5]">
                      <Image src={hero.shots[1].src} alt={hero.shots[1].alt} fill sizes="300px" className="object-cover" preload />
                    </div>
                  </div>
                  <span className="stage-tag">Photography</span>
                </div>
                <div className="stage-layer float-b right-[1%] top-[16%] w-[19%]" style={{ "--z": "200px", "--ry0": "-14deg" } as CSSProperties}>
                  <PhoneVideo src={fitness.reel} poster={fitness.reelPoster} label="Turn Count vertical video ad" />
                  <span className="stage-tag">Video</span>
                </div>
                <span className="stage-layer stage-tag left-[42%] top-[-2%]" style={{ "--z": "90px" } as CSSProperties}>Website</span>
              </div>
            </HeroStage>
          </div>
        </section>

        {/* ── Industries ── */}
        <section className="overflow-hidden border-y border-white/10 py-5" aria-label="Who we work with">
          <div className="marquee-track flex w-max gap-10 whitespace-nowrap">
            {[...INDUSTRIES, ...INDUSTRIES].map((name, i) => (
              <span key={`${name}-${i}`} className="text-[17px] font-medium text-white/45" aria-hidden={i >= INDUSTRIES.length}>
                {name} <span className="ml-10 text-white/20">✦</span>
              </span>
            ))}
          </div>
        </section>

        {/* ── Services ── */}
        <section id="services" className="scroll-mt-16 py-20 sm:py-28">
          <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
            <div className="sd-reveal max-w-[760px]">
              <p className="eyebrow">What we make</p>
              <h2 className="h-section mt-4">Everything your brand needs to look the part.</h2>
            </div>
            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {SERVICES.map((s, i) => (
                <Tilt key={s.name} max={7} className="sd-reveal rounded-[26px]" style={{ animationRangeStart: `entry ${i * 8}%` } as CSSProperties}>
                  <a href={s.href} className="group flex h-full flex-col rounded-[26px] border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-7 transition hover:border-white/25">
                    <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-[#e040fb] via-[#7c3aed] to-[#22d3ee] shadow-[0_10px_30px_-8px_rgba(167,139,250,0.7)]" style={{ transform: "translateZ(40px)" }}>
                      <s.icon className="size-6" />
                    </span>
                    <h3 className="mt-6 text-[24px] font-semibold tracking-[-0.02em]">{s.name}</h3>
                    <p className="text-aurora text-[17px] font-medium">{s.line}</p>
                    <p className="mt-3 flex-1 text-[15px] leading-relaxed text-white/60">{s.body}</p>
                    <ul className="mt-6 space-y-2 text-[14px] text-white/75">
                      {s.items.map((item) => (
                        <li key={item} className="flex gap-2">
                          <Check className="mt-0.5 size-4 shrink-0 text-[#a78bfa]" /> {item}
                        </li>
                      ))}
                    </ul>
                    <span className="mt-7 inline-flex items-center gap-1 text-[14px] font-medium text-white/80 group-hover:text-white">
                      See examples <ArrowUpRight className="size-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                  </a>
                </Tilt>
              ))}
            </div>

            <div className="sd-reveal mt-20 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <h3 className="text-[28px] font-semibold tracking-[-0.02em] sm:text-[36px]">And everything that helps you grow.</h3>
              <p className="max-w-[44ch] text-[16px] leading-relaxed text-white/60">Marketing, ads, content and apps — handled by the same team, so it all fits together.</p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {MORE_SERVICES.map((s, i) => (
                <Tilt key={s.name} max={8} className="sd-reveal rounded-[22px]" style={{ animationRangeStart: `entry ${(i % 4) * 6}%` } as CSSProperties}>
                  <a href="#start" className="group flex h-full flex-col rounded-[22px] border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/25 hover:bg-white/[0.05]">
                    <span className="grid size-10 place-items-center rounded-xl bg-white/[0.07] text-[#c4b5fd] ring-1 ring-white/10 transition group-hover:bg-gradient-to-br group-hover:from-[#e040fb] group-hover:to-[#22d3ee] group-hover:text-white" style={{ transform: "translateZ(30px)" }}>
                      <s.icon className="size-5" />
                    </span>
                    <h4 className="mt-5 text-[18px] font-semibold tracking-[-0.01em]">{s.name}</h4>
                    <p className="mt-2 flex-1 text-[14px] leading-relaxed text-white/55">{s.body}</p>
                    <span className="mt-5 inline-flex items-center gap-1 text-[13px] font-medium text-white/70 group-hover:text-white">
                      Ask about it <ArrowUpRight className="size-3.5" />
                    </span>
                  </a>
                </Tilt>
              ))}
            </div>
          </div>
        </section>

        {/* ── Websites ── */}
        <section id="websites" className="scroll-mt-16 border-t border-white/10 py-20 sm:py-28">
          <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
            <div className="sd-reveal flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-[720px]">
                <p className="eyebrow">Websites</p>
                <h2 className="h-section mt-4">Six sites. Six very different businesses.</h2>
              </div>
              <p className="max-w-[40ch] text-[17px] leading-relaxed text-white/60">
                Every one is a complete, working website — exactly what you&apos;d receive. Hover to scroll through, click to open it.
              </p>
            </div>
            <div className="mt-14 grid gap-6 md:grid-cols-2 md:gap-8">
              {DEMOS.map((demo, i) => (
                <div key={demo.slug} className={`sd-tilt ${i === 0 ? "md:col-span-2" : ""}`}>
                  <Tilt max={5} className="rounded-[24px]">
                    <Link href={`/demo/${demo.slug}`} className="group block">
                      <div className={`autoscroll-hover relative overflow-hidden rounded-[24px] bg-gradient-to-br from-white/[0.08] to-white/[0.02] ring-1 ring-white/10 ${i === 0 ? "aspect-[16/9]" : "aspect-[16/11]"}`}>
                        <div className={`absolute inset-x-[6%] ${i === 0 ? "top-[8%] sm:inset-x-[12%]" : "top-[9%]"}`}>
                          <BrowserRender data={demo} url={`${demo.slug}.com`} scroll="always" initialZoom={i === 0 ? 0.6 : 0.4} />
                        </div>
                        <div className={`absolute bottom-[-10%] ${i === 0 ? "right-[5%] w-[16%]" : "right-[4%] w-[23%]"}`}>
                          <PhoneRender data={demo} initialZoom={i === 0 ? 0.45 : 0.32} />
                        </div>
                      </div>
                      <div className="mt-5 flex items-start justify-between gap-4 px-1">
                        <div>
                          <p className="text-[13px] font-medium text-white/50">{demo.industry} · {demo.city}, {demo.state}</p>
                          <h3 className="mt-1 text-[22px] font-semibold tracking-[-0.01em]">{demo.businessName}</h3>
                          <p className="mt-1 text-[15px] text-white/60">{demo.blurb}</p>
                        </div>
                        <span className="mt-1 grid size-10 shrink-0 place-items-center rounded-full border border-white/20 transition group-hover:bg-white group-hover:text-void">
                          <ArrowUpRight className="size-5" />
                        </span>
                      </div>
                    </Link>
                  </Tilt>
                </div>
              ))}
            </div>

            <div className="mt-20 grid items-center gap-10 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 sm:p-10 lg:grid-cols-[1fr_auto]">
              <div className="sd-reveal">
                <h3 className="text-[28px] font-semibold tracking-[-0.02em] sm:text-[36px]">Built to get the call.</h3>
                <p className="mt-3 max-w-[52ch] text-[16px] leading-relaxed text-white/60">
                  Most customers find a local business on their phone. Every site is designed thumb-first: big readable type, your reviews up top, and one tap to call or ask for a quote.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {["Phone-first design", "Tap-to-call everywhere", "Google rating on the page", "Loads fast on mobile data", "Your service area spelled out"].map((t) => (
                    <span key={t} className="rounded-full border border-white/15 px-3 py-1.5 text-[13px] text-white/75">{t}</span>
                  ))}
                </div>
              </div>
              <div className="flex justify-center gap-4">
                <PhoneRender data={forge} scroll="always" initialZoom={0.5} className="w-[150px] sm:w-[190px]" />
                <PhoneRender data={maison} scroll="always" initialZoom={0.5} className="mt-10 w-[150px] sm:w-[190px]" />
              </div>
            </div>
          </div>
        </section>

        {/* ── Photography ── */}
        <section id="photography" className="relative scroll-mt-16 overflow-hidden border-t border-white/10 py-20 sm:py-28">
          <div aria-hidden="true" className="aurora left-1/2 top-24 h-[420px] w-[700px] -translate-x-1/2 bg-[#7c3aed]/25" />
          <div className="relative mx-auto max-w-[1240px] px-4 text-center sm:px-6">
            <div className="sd-reveal">
              <p className="eyebrow">Product photography</p>
              <h2 className="h-section mx-auto mt-4 max-w-[18ch]">Eight campaigns. Eight industries.</h2>
              <p className="mx-auto mt-5 max-w-[56ch] text-[17px] leading-relaxed text-white/60">
                Each brand gets a full set — hero, ad creative, lifestyle, social and detail — built around one idea. Drag the ring or pick a brand.
              </p>
            </div>
          </div>
          <div className="relative mt-14">
            <PhotoStudio campaigns={CAMPAIGNS} />
          </div>
          <p className="relative mx-auto mt-10 max-w-[1180px] px-4 text-[12px] text-white/40 sm:px-6">
            Concept campaigns for fictional brands, produced with AI-assisted imaging and art-directed by Alderwell Creative.
          </p>
        </section>

        {/* ── Video ── */}
        <section id="video" className="relative scroll-mt-16 overflow-hidden border-t border-white/10 py-20 sm:py-28">
          <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
            <div className="sd-reveal flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-[720px]">
                <p className="eyebrow">Video &amp; motion ads</p>
                <h2 className="h-section mt-4">Stills that move. Ads that stop thumbs.</h2>
              </div>
              <p className="max-w-[42ch] text-[17px] leading-relaxed text-white/60">
                Widescreen spots for your website and vertical reels for Instagram, TikTok and Shorts — cut from the same campaign, so every channel matches.
              </p>
            </div>

            <div className="sd-tilt mt-14">
              <Tilt max={3} glare={false} className="rounded-[26px]">
                <div className="overflow-hidden rounded-[26px] bg-black p-2 ring-1 ring-white/15 shadow-[0_40px_120px_-30px_rgba(124,58,237,0.6)]">
                  <div className="relative aspect-[16/9] overflow-hidden rounded-[20px]">
                    <AutoVideo src={SHOWREEL.src} poster={SHOWREEL.poster} label="Alderwell Creative showreel" className="absolute inset-0 size-full object-cover" />
                    <span className="absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1 text-[12px] text-white/85 backdrop-blur">Showreel · 16:9</span>
                  </div>
                </div>
              </Tilt>
            </div>

            <div className="mt-16 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-6 [scrollbar-width:thin] lg:grid lg:grid-cols-4 lg:overflow-visible">
              {CAMPAIGNS.map((c, i) => (
                <div key={c.slug} className={`sd-reveal w-[200px] shrink-0 snap-start sm:w-[230px] lg:w-auto ${i >= 4 ? "lg:mt-0" : ""}`}>
                  <Tilt max={10} glare={false} className="rounded-[2.1rem]">
                    <PhoneVideo src={c.reel} poster={c.reelPoster} label={`${c.brand} vertical video ad`} />
                  </Tilt>
                  <p className="mt-3 text-[15px] font-semibold">{c.brand}</p>
                  <p className="text-[13px] text-white/50">{c.industry} · reel 9:16</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Process ── */}
        <section id="process" className="scroll-mt-16 border-t border-white/10 py-20 sm:py-28">
          <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
            <div className="sd-reveal max-w-[720px]">
              <p className="eyebrow">Process</p>
              <h2 className="h-section mt-4">No risk. Not even a little.</h2>
            </div>
            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {STEPS.map((step) => (
                <Tilt key={step.n} max={6} className="sd-reveal rounded-[24px]">
                  <div className="h-full rounded-[24px] border border-white/10 bg-white/[0.03] p-8">
                    <p className="text-aurora font-display text-[64px] font-semibold leading-none tracking-[-0.04em]">{step.n}</p>
                    <h3 className="mt-6 text-[21px] font-semibold">{step.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-white/60">{step.body}</p>
                  </div>
                </Tilt>
              ))}
            </div>
          </div>
        </section>

        {/* ── How you pay: first project free, then pay what you feel ── */}
        <section id="pay" className="relative scroll-mt-16 overflow-hidden border-t border-white/10 py-20 sm:py-28">
          <div aria-hidden="true" className="aurora left-1/2 top-10 h-[380px] w-[760px] -translate-x-1/2 bg-[#e040fb]/20" />
          <div className="relative mx-auto max-w-[1240px] px-4 sm:px-6">
            <div className="sd-reveal mx-auto max-w-[800px] text-center">
              <p className="eyebrow">How you pay</p>
              <h2 className="h-section mt-4">
                Your first project is free. <span className="text-aurora">You decide what it&apos;s worth.</span>
              </h2>
              <p className="mx-auto mt-5 max-w-[52ch] text-[17px] leading-relaxed text-white/60">
                No price list, no packages to choose from. We do the work first — if it helps your business, pay whatever you feel is fair.
              </p>
            </div>
            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {PAY_POINTS.map((p, i) => (
                <Tilt key={p.title} max={6} className="sd-reveal rounded-[26px]" style={{ animationRangeStart: `entry ${i * 8}%` } as CSSProperties}>
                  <div className="flex h-full flex-col rounded-[26px] border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-8">
                    <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-[#e040fb] via-[#7c3aed] to-[#22d3ee]" style={{ transform: "translateZ(40px)" }}>
                      <p.icon className="size-6" />
                    </span>
                    <h3 className="mt-6 text-[22px] font-semibold tracking-[-0.01em]">{p.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-white/60">{p.body}</p>
                  </div>
                </Tilt>
              ))}
            </div>
            <div className="sd-reveal mt-6 flex flex-col items-start justify-between gap-4 rounded-[26px] border border-white/10 bg-gradient-to-r from-[#e040fb]/10 via-[#7c3aed]/10 to-[#22d3ee]/10 p-7 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-[20px] font-semibold">What counts as the first project?</h3>
                <p className="mt-1 max-w-[70ch] text-[15px] text-white/65">
                  A finished website, a set of ad creatives, a product photo set, a short video ad, a local marketing plan or the first screens of your app — you pick.
                  Ad spend you run on Facebook or Google is paid by you directly to those platforms.
                </p>
              </div>
              <a href="#start" className="btn-glow shrink-0">Claim my free project</a>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="scroll-mt-16 border-t border-white/10 py-20 sm:py-28">
          <div className="mx-auto max-w-[820px] px-4 sm:px-6">
            <h2 className="h-section sd-reveal text-center">Questions? Answers.</h2>
            <div className="mt-12 divide-y divide-white/10 border-y border-white/10">
              {FAQ.map((item) => (
                <details key={item.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[18px] font-semibold tracking-[-0.01em]">
                    {item.q}
                    <span className="text-[26px] font-light text-white/40 transition-transform duration-300 group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-[16px] leading-relaxed text-white/65">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Start ── */}
        <section id="start" className="relative scroll-mt-16 overflow-hidden border-t border-white/10 py-20 sm:py-28">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="aurora left-[10%] top-[10%] h-[400px] w-[400px] bg-[#e040fb]/35" />
            <div className="aurora right-[10%] bottom-[5%] h-[400px] w-[400px] bg-[#22d3ee]/30" style={{ animationDelay: "-8s" }} />
          </div>
          <div className="relative mx-auto max-w-[1240px] px-4 sm:px-6">
            <div className="sd-reveal mx-auto max-w-[760px] text-center">
              <h2 className="h-section">Let&apos;s make yours.</h2>
              <p className="mx-auto mt-5 max-w-[44ch] text-[18px] leading-relaxed text-white/65">
                Tell us about your business and what you need. We reply within a day, and your free first project starts right away.
              </p>
            </div>
            <div className="mx-auto mt-12 max-w-[760px]">
              <InquiryForm />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <Logo />
              <p className="mt-4 max-w-[38ch] text-[14px] leading-relaxed text-white/50">
                A creative and marketing studio for growing businesses: websites, photography, video, ads, content and mobile apps. First project free.
              </p>
              <a href="mailto:alderwellcreative@gmail.com" className="mt-3 inline-block text-[14px] text-[#a78bfa] hover:underline">
                alderwellcreative@gmail.com
              </a>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white">Work</p>
              <ul className="mt-2 text-[14px] leading-[2.2] text-white/60">
                <li><a href="#websites" className="hover:text-white">Websites</a></li>
                <li><a href="#photography" className="hover:text-white">Photography</a></li>
                <li><a href="#video" className="hover:text-white">Video</a></li>
              </ul>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white">Studio</p>
              <ul className="mt-2 text-[14px] leading-[2.2] text-white/60">
                <li><a href="#process" className="hover:text-white">Process</a></li>
                <li><a href="#pay" className="hover:text-white">How you pay</a></li>
                <li><a href="#start" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
          </div>
          <p className="mt-12 border-t border-white/10 pt-6 text-[12px] text-white/40">
            Websites shown are concept sites for fictional businesses, built with the same system your site will use. Campaign images and videos are concept work produced with AI-assisted imaging.
          </p>
        </div>
      </footer>
    </div>
  );
}
