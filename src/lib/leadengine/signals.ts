import { nicheByKey } from "./niches";

/** One finding about a lead. Pay signals say "they can afford it", pain signals say "they need help". */
export type Signal = { key: string; label: string; points: number; solution?: string };

const OLD_BUILDER = /wix|weebly|godaddy|starfield|website builder|jimdo|yola|homestead|webs\.com|site123|webnode/i;

const PAID_TOOLS: [RegExp, string][] = [
  [/js\.hs-scripts\.com|js\.hsforms\.net|hs-analytics\.net|js\.hubspot\.com/i, "HubSpot"],
  [/static\.klaviyo\.com|klaviyo\.com\/onsite/i, "Klaviyo"],
  [/connect\.podium\.com|podium-widget|widgets\.podium\.com/i, "Podium"],
  [/birdeye\.com\/embed|birdeye-widget|api\.birdeye\.com/i, "Birdeye"],
  [/servicetitan\.com|st-booking/i, "ServiceTitan"],
  [/housecallpro\.com/i, "Housecall Pro"],
  [/getjobber\.com|clienthub\.getjobber/i, "Jobber"],
  [/nexhealth\.com/i, "NexHealth"],
  [/zocdoc\.com\/(practice|doctor|widget)|offsiteschedule\.zocdoc/i, "Zocdoc"],
  [/getweave\.com|weave-?widget/i, "Weave"],
  [/solutionreach\.com/i, "Solutionreach"],
  [/demandforce\.com/i, "Demandforce"],
  [/mindbodyonline\.com|healcode\.com/i, "Mindbody"],
  [/vagaro\.com/i, "Vagaro"],
  [/joinblvd\.com|blvd\.co\b/i, "Boulevard"],
  [/acuityscheduling\.com/i, "Acuity"],
  [/widget\.intercom\.io|intercomcdn\.com/i, "Intercom"],
  [/js\.driftt\.com/i, "Drift"],
  [/cdn\.livechatinc\.com/i, "LiveChat"],
  [/yextapis\.com|yext\.com\/plugin/i, "Yext"],
  [/cdn\.shopify\.com/i, "Shopify"],
];

const AGENCIES = /(scorpion|thryv|hibu|yodle|townsquare|reachlocal|web\.com|main street hub|officite|prosites|dental ?marketing|lawyer ?marketing|findlaw|justia|einstein ?medical|search ?influence)/i;
const BOOKING = /calendly|acuityscheduling|book(ing)?[\s-]?(now|online|an? appointment|appointment)|schedule[\s-]?(now|online|an? appointment|service)|request (an )?appointment|zocdoc|nexhealth|vagaro|booksy|mindbody|housecallpro|getjobber|servicetitan|opentable|resy\.com|squareup\.com\/appointments|square\.site/i;
const CHAT = /tawk\.to|intercom|js\.driftt|livechatinc|podium|birdeye|tidio|crisp\.chat|zdassets|olark|smartsupp|chatra|messenger/i;

export type SiteFacts = {
  ok: boolean;
  error?: string;
  html?: string;
  finalUrl?: string;
  ms?: number;
  /** Content is built by JavaScript, so text-based checks are skipped. */
  spa?: boolean;
  domainYear?: number | null;
};

export type LeadFacts = {
  kind: string;
  niche: string | null;
  hasWebsite: boolean;
  socials: Record<string, string>;
  rating: number | null;
  reviewCount: number | null;
  extra: Record<string, unknown>;
};

export function scoreLead(lead: LeadFacts, site: SiteFacts | null, now = new Date()) {
  const pay: Signal[] = [];
  const pain: Signal[] = [];
  const year = now.getUTCFullYear();

  // ── Can they pay? ──
  const ticket = lead.niche ? nicheByKey.get(lead.niche)?.ticket : undefined;
  if (ticket === "high") pay.push({ key: "high_ticket", label: "High-value customers — one new client pays for any project", points: 20 });
  else if (ticket === "mid") pay.push({ key: "mid_ticket", label: "Solid value per customer", points: 10 });
  if (lead.reviewCount != null && lead.reviewCount >= 100) pay.push({ key: "busy", label: `Busy business: ${lead.reviewCount} reviews`, points: 15 });
  else if (lead.reviewCount != null && lead.reviewCount >= 40) pay.push({ key: "steady", label: `${lead.reviewCount} reviews — steady customers`, points: 8 });

  const raised = Number(lead.extra.amountRaised ?? 0);
  if (raised > 0) pay.push({ key: "funded", label: `Raised $${raised.toLocaleString("en-US")} (SEC Form D)`, points: raised >= 250_000 ? 40 : 25 });
  const subs = Number(lead.extra.subscribers ?? 0);
  if (subs >= 10_000) pay.push({ key: "audience", label: `${subs.toLocaleString("en-US")} YouTube subscribers`, points: 25 });
  else if (subs >= 1_000) pay.push({ key: "audience", label: `${subs.toLocaleString("en-US")} YouTube subscribers`, points: 10 });

  const html = site?.ok ? (site.html ?? "") : "";
  if (html) {
    if (/googleadservices\.com|AW-\d{6,}/.test(html)) pay.push({ key: "google_ads", label: "Runs Google Ads (pays for customers already)", points: 25 });
    if (/connect\.facebook\.net\/[^"']*fbevents\.js|fbq\(\s*['"]init/.test(html)) pay.push({ key: "meta_pixel", label: "Has the Facebook/Instagram ads pixel", points: 15 });
    if (/callrail|calltrackingmetrics|tctm\.co|whatconverts|invoca/i.test(html)) pay.push({ key: "call_tracking", label: "Pays for call tracking", points: 15 });
    const tools = PAID_TOOLS.filter(([re]) => re.test(html)).map(([, name]) => name);
    if (tools.length) pay.push({ key: "paid_tools", label: `Pays for software: ${tools.slice(0, 4).join(", ")}`, points: Math.min(24, tools.length * 8) });
    const agency = textTail(html).match(new RegExp(`(?:website|site|designed|powered|marketing)[^.]{0,30}?(?:by)\\s+[^.]{0,30}?${AGENCIES.source}`, "i"));
    if (agency) pay.push({ key: "agency", label: `Already pays a marketing agency (${agency[1]})`, points: 15, solution: "Show better results for less than their agency" });
    if (/careers|we['’]re hiring|join our team|now hiring/i.test(html)) pay.push({ key: "hiring", label: "Hiring right now — growing", points: 8 });
  }
  if (site?.domainYear && site.domainYear <= year - 8) pay.push({ key: "established", label: `Established — online since ${site.domainYear}`, points: 10 });
  else if (site?.domainYear && site.domainYear <= year - 4) pay.push({ key: "established", label: `In business since about ${site.domainYear}`, points: 5 });

  // ── What hurts? ──
  if (lead.kind === "creator") {
    if (!lead.hasWebsite) pain.push({ key: "no_website", label: "No website of their own — the audience isn't captured", points: 30, solution: "Creator website + email list + merch/booking page" });
    if (!lead.extra.hasEmail) pain.push({ key: "no_contact", label: "No business email for sponsors", points: 10, solution: "Media kit page with a contact form" });
  } else if (lead.kind === "company" && !lead.hasWebsite) {
    pain.push({ key: "launch", label: "New company with no website found", points: 30, solution: "Launch pack: website, branding, Google profile" });
  } else if (!lead.hasWebsite) {
    pain.push(
      lead.socials.facebook
        ? { key: "facebook_only", label: "Only a Facebook page — no website", points: 40, solution: "A real website (show them a free preview)" }
        : { key: "no_website", label: "No website at all", points: 40, solution: "A real website (show them a free preview)" },
    );
  }

  if (site && !site.ok && lead.hasWebsite) {
    // A connection timeout can also mean the site blocks visitors from outside the US — flag it, but ask to verify.
    const unsure = /doesn't load|times out/.test(site.error ?? "");
    pain.push(
      unsure
        ? { key: "site_unreachable", label: "Website didn't load when checked — open it in a browser to confirm before mentioning it", points: 20, solution: "Fix or rebuild the website" }
        : { key: "site_broken", label: `Website problem: ${site.error}`, points: 40, solution: "Fix or rebuild the website" },
    );
  }

  if (html && site?.ok) {
    if (!/<meta[^>]+name=["']viewport["']/i.test(html)) pain.push({ key: "not_mobile", label: "Not mobile-friendly", points: 25, solution: "Mobile-first redesign" });
    if (site.finalUrl?.startsWith("http://")) pain.push({ key: "no_https", label: "No HTTPS — browsers say “Not secure”", points: 12, solution: "SSL + redesign" });
    const years = [...html.matchAll(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/gi)].map((m) => Number(m[1])).filter((y) => y > 1995 && y <= year);
    if (years.length && Math.max(...years) <= year - 3) pain.push({ key: "stale", label: `Footer says © ${Math.max(...years)} — looks abandoned`, points: 12, solution: "Website refresh" });
    const gen = html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? (/(wix\.com|weebly|godaddy)/i.exec(html)?.[1] ?? "");
    if (OLD_BUILDER.test(gen)) pain.push({ key: "cheap_template", label: `Built on a cheap template (${gen.split(/[ ;]/)[0]})`, points: 8, solution: "Custom website" });
    const words = textOf(html).split(" ").length;
    if (!site.spa && words < 250) pain.push({ key: "thin", label: `Very little information (${words} words)`, points: 10, solution: "Rewrite with services, proof and FAQs" });
    if ((site.ms ?? 0) > 4000) pain.push({ key: "slow", label: `Slow to load (${((site.ms ?? 0) / 1000).toFixed(1)}s)`, points: 10, solution: "Faster rebuild" });
    if (!site.spa && !/href=["']tel:/i.test(html)) pain.push({ key: "no_tap_call", label: "Phone number isn't tap-to-call", points: 6, solution: "Click-to-call buttons" });
    const hasForm = /<form[\s\S]{0,4000}?(type=["']email["']|<textarea)/i.test(html);
    if (site.spa) {
      /* content not in the HTML — can't judge booking/forms */
    } else if (!BOOKING.test(html) && !CHAT.test(html) && !hasForm) {
      pain.push({ key: "missed_leads", label: "Only a phone number — no booking, form or chat (after-hours leads are lost)", points: 15, solution: "AI receptionist / missed-call text-back / online booking" });
    } else if (!BOOKING.test(html) && !CHAT.test(html)) {
      pain.push({ key: "no_booking", label: "No online booking or chat", points: 8, solution: "Online booking + chat widget" });
    }
    if (!/googletagmanager\.com|google-analytics\.com|gtag\(|G-[A-Z0-9]{6,}/.test(html)) pain.push({ key: "no_tracking", label: "No visitor tracking — they can't see what works", points: 6, solution: "Analytics + conversion tracking" });
    if (!/<meta[^>]+name=["']description["']/i.test(html)) pain.push({ key: "no_seo", label: "No search description (weak on Google)", points: 4, solution: "Local SEO setup" });
  }

  if (lead.reviewCount != null && lead.reviewCount < 15) pain.push({ key: "few_reviews", label: `Only ${lead.reviewCount} Google reviews`, points: 15, solution: "Automatic review requests" });
  if (lead.rating != null && lead.rating < 4) pain.push({ key: "low_rating", label: `Rating ${lead.rating}★ — losing customers to competitors`, points: 15, solution: "Reputation management" });

  const sum = (list: Signal[]) => Math.min(100, list.reduce((s, x) => s + x.points, 0));
  pay.sort((a, b) => b.points - a.points);
  pain.sort((a, b) => b.points - a.points);
  return { pay, pain, payScore: sum(pay), painScore: sum(pain) };
}

function textOf(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The last part of the page text, where "Website by …" credits live. */
function textTail(html: string) {
  const t = textOf(html);
  return t.slice(Math.max(0, t.length - 1500));
}
