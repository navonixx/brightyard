import "server-only";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

/** Only public http(s) sites — never localhost or private network addresses. */
export function publicUrl(raw: string): URL | null {
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = url.hostname.toLowerCase();
    const blocked =
      host === "localhost" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      host.includes(":") ||
      !host.includes(".");
    return /^https?:$/.test(url.protocol) && !blocked ? url : null;
  } catch {
    return null;
  }
}

export function domainOf(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const url = publicUrl(raw);
  return url ? url.hostname.replace(/^www\./, "").toLowerCase() : null;
}

/** Social / directory hosts are not the business's own website. */
const NOT_A_SITE = /(^|\.)(facebook|fb|instagram|twitter|x|linkedin|youtube|youtu|tiktok|pinterest|yelp|google|goo|maps\.app|bit|linktr|linktree|nextdoor|houzz|angi|homeadvisor|thumbtack|bbb|yellowpages|tripadvisor|doordash|grubhub|ubereats|opentable|square|squareup|wa|apple|zocdoc|healthgrades|vagaro|booksy|mindbody|calendly|amazon|etsy|ebay)\.[a-z.]+$/i;
export const isRealSite = (raw: string | null | undefined) => {
  const d = domainOf(raw);
  return Boolean(d && !NOT_A_SITE.test(d));
};

export const phoneKey = (phone: string | null | undefined) => {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
};
export const formatPhone = (phone: string | null | undefined) => {
  const k = phoneKey(phone);
  return k ? `(${k.slice(0, 3)}) ${k.slice(3, 6)}-${k.slice(6)}` : (phone ?? null);
};

export type Page = { ok: true; finalUrl: string; html: string; ms: number; status: number } | { ok: false; error: string };

/** Tries HTTPS first (many listings store an old http:// address), then the address as given. */
export async function fetchPage(raw: string, timeoutMs = 10000): Promise<Page> {
  const url = publicUrl(raw);
  if (!url) return { ok: false, error: "Not a public website address" };
  if (url.protocol === "http:") {
    const secure = new URL(url);
    secure.protocol = "https:";
    const page = await fetchOnce(secure, timeoutMs);
    if (page.ok) return page;
  }
  return fetchOnce(url, timeoutMs);
}

const PARKED = /\/lander\b|sedoparking|parkingcrew|bodis\.com|above\.com|domain (is|may be) for sale|buy this domain|hugedomains|dan\.com|afternic|this domain (name )?(has been registered|is parked)|godaddy\.com\/domainsearch|domain-for-sale|parked free|courtesy of godaddy/i;

/**
 * Loads a homepage and follows a JavaScript / meta-refresh redirect once, then says what it is:
 * a normal page, a parked domain, or an app that builds its content with JavaScript.
 */
export async function fetchSite(raw: string): Promise<(Page & { ok: true; kind: "normal" | "parked" | "spa" }) | (Page & { ok: false })> {
  let page = await fetchPage(raw);
  if (!page.ok && /doesn't load|times out/.test(page.error)) {
    if (!(await online())) throw new Error("NETWORK_DOWN");
    await new Promise((r) => setTimeout(r, 2000));
    page = await fetchPage(raw, 15000);
  }
  if (!page.ok) return page;
  for (let hop = 0; hop < 2 && page.ok && wordCount(page.html) < 30; hop++) {
    const target =
      page.html.match(/http-equiv=["']refresh["'][^>]*url=([^"'>\s]+)/i)?.[1] ??
      page.html.match(/location(?:\.href)?\s*=\s*["']([^"']+)["']/i)?.[1] ??
      page.html.match(/location\.replace\(\s*["']([^"']+)["']/i)?.[1];
    if (!target) break;
    const next = new URL(target, page.finalUrl).toString();
    if (PARKED.test(next)) return { ...page, finalUrl: next, kind: "parked" };
    const followed = await fetchPage(next);
    if (!followed.ok) break;
    page = followed;
  }
  if (!page.ok) return page;
  if (PARKED.test(page.finalUrl) || (wordCount(page.html) < 400 && PARKED.test(page.html))) return { ...page, kind: "parked" };
  const spa = wordCount(page.html) < 40 && /<script[^>]+src=/i.test(page.html);
  return { ...page, kind: spa ? "spa" : "normal" };
}

/** Is this computer online? (so a dropped connection isn't blamed on the lead's website) */
const net = globalThis as unknown as { __online?: { at: number; ok: boolean } };
export async function online(): Promise<boolean> {
  if (net.__online && Date.now() - net.__online.at < 20000) return net.__online.ok;
  const ping = (url: string) =>
    fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) })
      .then((r) => r.status < 500)
      .catch(() => false);
  // Offline only if two unrelated services both fail to answer.
  const ok = (await ping("https://www.google.com/generate_204")) || (await ping("https://cloudflare.com/cdn-cgi/trace"));
  net.__online = { at: Date.now(), ok };
  return ok;
}

export const wordCount = (html: string) => {
  const t = textOf(html);
  return t ? t.split(" ").length : 0;
};

async function fetchOnce(url: URL, timeoutMs: number): Promise<Page> {
  const started = performance.now();
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, error: `Website returns an error (${res.status})` };
    if (!(res.headers.get("content-type") ?? "").includes("html")) return { ok: false, error: "Not a web page" };
    const html = (await res.text()).slice(0, 1_500_000);
    return { ok: true, finalUrl: res.url || url.toString(), html, ms: performance.now() - started, status: res.status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    return { ok: false, error: /certificate|SSL|TLS/i.test(msg) ? "Broken security certificate" : /timeout|aborted/i.test(msg) ? "Website times out" : "Website doesn't load" };
  }
}

export function textOf(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>|<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Emails ──
const FREE_MAIL = /@(gmail|yahoo|ymail|outlook|hotmail|live|msn|aol|icloud|me|mac|comcast|att|sbcglobal|bellsouth|cox|verizon|charter|frontier|protonmail)\.[a-z.]+$/i;
const JUNK = /wix|sentry|example\.|domain\.|yourdomain|yourcompany|yoursite|youremail|email\.com$|godaddy|squarespace|wordpress|jquery|bootstrap|cloudflare|schema\.org|@2x|\.(png|jpe?g|gif|webp|svg|css|js)$/i;
const ROLE_JUNK = /^(noreply|no-reply|donotreply|do-not-reply|privacy|abuse|webmaster|postmaster|hostmaster|dmca|legal|example|sample|test|demo|name|yourname|your|email|youremail|user|username|someone|john|jane|johndoe|janedoe|jdoe|first\.last|firstname|me)@/i;

export function findEmails(html: string): string[] {
  const found = new Set<string>();
  for (const [, hex] of html.matchAll(/data-cfemail="([0-9a-f]+)"/g)) {
    const key = parseInt(hex.slice(0, 2), 16);
    let out = "";
    for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
    found.add(out.toLowerCase());
  }
  for (const m of html.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g) ?? []) found.add(m.toLowerCase());
  return [...found]
    .map((e) => e.trim().replace(/^(u003e|%20|mailto:)/, ""))
    .filter((e) => e.length <= 60 && !JUNK.test(e) && !ROLE_JUNK.test(e) && !/[0-9a-f]{16,}/.test(e));
}

/** Own-domain address first, then a personal Gmail-style one; never another company's domain. */
export function pickEmail(found: string[], site: string | null): string | null {
  const host = domainOf(site) ?? "";
  const own = (e: string) => {
    const d = e.split("@")[1] ?? "";
    return host && (d === host || d.endsWith(`.${host}`) || host.endsWith(`.${d}`));
  };
  const clean = [...new Set(found)];
  return clean.find(own) ?? clean.find((e) => FREE_MAIL.test(e)) ?? null;
}

/** Same-site links whose path matches the pattern (contact/about pages…). */
export function sameSiteLinks(html: string, base: string, pattern: RegExp, max = 2): string[] {
  const links = new Set<string>();
  const origin = new URL(base);
  for (const [, href] of html.matchAll(/href=["']([^"'#]+)["']/gi)) {
    if (!pattern.test(href)) continue;
    try {
      const link = new URL(href, origin);
      if (link.hostname === origin.hostname && !/\.(pdf|jpe?g|png|webp)$/i.test(link.pathname)) links.add(link.origin + link.pathname);
    } catch {
      /* ignore */
    }
    if (links.size >= max) break;
  }
  return [...links];
}

export function findSocials(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const patterns: [string, RegExp][] = [
    ["facebook", /https?:\/\/(?:www\.|m\.)?facebook\.com\/(?!sharer|share|plugins|tr\b|dialog)[A-Za-z0-9.\-_/?=]+/i],
    ["instagram", /https?:\/\/(?:www\.)?instagram\.com\/(?!p\/|explore)[A-Za-z0-9._]+/i],
    ["linkedin", /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[A-Za-z0-9\-_%]+/i],
    ["youtube", /https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/|c\/|user\/)[A-Za-z0-9\-_]+/i],
    ["tiktok", /https?:\/\/(?:www\.)?tiktok\.com\/@[A-Za-z0-9._]+/i],
    ["x", /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/(?!share|intent|home)[A-Za-z0-9_]+/i],
  ];
  for (const [name, re] of patterns) {
    const m = html.match(re);
    if (m) out[name] = m[0].replace(/["'<>].*$/, "");
  }
  return out;
}

/** Year the domain was first registered (free RDAP lookup). */
const rdapCache = globalThis as unknown as { __rdap?: Promise<Record<string, string>> };
function rdapServers(): Promise<Record<string, string>> {
  rdapCache.__rdap ??= fetch("https://data.iana.org/rdap/dns.json", { cache: "no-store", signal: AbortSignal.timeout(15000) })
    .then((r) => r.json())
    .then((b: { services: [string[], string[]][] }) => {
      const map: Record<string, string> = {};
      for (const [tlds, urls] of b.services) for (const t of tlds) map[t] = urls[0].endsWith("/") ? urls[0] : `${urls[0]}/`;
      return map;
    })
    .catch((e) => {
      rdapCache.__rdap = undefined;
      throw e;
    });
  return rdapCache.__rdap;
}

/** Year the domain was first registered — asks the TLD's own RDAP server (IANA bootstrap list). */
export async function domainYear(domain: string): Promise<number | null> {
  try {
    const base = (await rdapServers())[domain.split(".").at(-1) ?? ""];
    if (!base) return null;
    const res = await fetch(`${base}domain/${encodeURIComponent(domain)}`, {
      headers: { Accept: "application/rdap+json" },
      signal: AbortSignal.timeout(7000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { events?: { eventAction: string; eventDate: string }[] };
    const reg = data.events?.find((e) => e.eventAction === "registration")?.eventDate;
    return reg ? new Date(reg).getUTCFullYear() : null;
  } catch {
    return null;
  }
}
