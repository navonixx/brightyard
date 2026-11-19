import "server-only";
import { assertPublicUrl, detectBuilder } from "./research";

export type SiteCheck = {
  /** 0–100. Higher means a weaker website, i.e. a better prospect for a redesign. */
  score: number;
  /** Plain-English findings, strongest first. */
  issues: string[];
  reachable: boolean;
};

/** A site at or above this score is worth rebuilding. */
export const WEAK_SITE_THRESHOLD = 35;

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const OLD_BUILDERS = /wix|weebly|godaddy|starfield|website builder|jimdo|yola|homestead|webs\.com|site123|webnode/i;

/** "Starfield Technologies; Go Daddy Website Builder 8.0" → "GoDaddy". */
function builderName(raw: string): string {
  if (/godaddy|go daddy|starfield/i.test(raw)) return "GoDaddy";
  if (/wix/i.test(raw)) return "Wix";
  if (/weebly/i.test(raw)) return "Weebly";
  if (/jimdo/i.test(raw)) return "Jimdo";
  if (/site123/i.test(raw)) return "SITE123";
  if (/webnode/i.test(raw)) return "Webnode";
  return "site-builder";
}

/** Free, keyless screenshot service used by the Before & After page. */
export function screenshotUrl(site: string): string {
  const full = /^https?:\/\//i.test(site) ? site : `https://${site}`;
  return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(full)}?w=1280&h=820`;
}

/**
 * Opens the homepage and scores how dated or weak it is from what the HTML shows:
 * mobile support, HTTPS, copyright year, platform, amount of content, contact options, speed.
 */
export async function checkSite(rawUrl: string, now = Date.now()): Promise<SiteCheck> {
  let url: URL;
  try {
    url = assertPublicUrl(rawUrl);
  } catch {
    return { score: 0, issues: ["Not a valid public website address"], reachable: false };
  }

  const started = performance.now();
  let html = "";
  let finalUrl = url.toString();
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: AbortSignal.timeout(9000),
      redirect: "follow",
      cache: "no-store",
    });
    finalUrl = response.url || finalUrl;
    if (!response.ok) return { score: 0, issues: [`Website returned an error (${response.status})`], reachable: false };
    html = (await response.text()).slice(0, 1_500_000);
  } catch {
    return { score: 0, issues: ["Website didn't load"], reachable: false };
  }
  const ms = performance.now() - started;

  const found: { points: number; text: string }[] = [];
  const add = (points: number, text: string) => found.push({ points, text });

  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) add(30, "Not built for phones (no mobile layout)");
  if (finalUrl.startsWith("http://")) add(15, "No HTTPS — browsers mark it “Not secure”");

  const year = new Date(now).getUTCFullYear();
  const copyright = [...html.matchAll(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/gi)]
    .map((m) => Number(m[1]))
    .filter((y) => y > 1995 && y <= year);
  if (copyright.length) {
    const latest = Math.max(...copyright);
    if (latest <= year - 3) add(15, `Footer still says © ${latest} — looks unmaintained`);
  }

  const builder = detectBuilder(html);
  if (builder && OLD_BUILDERS.test(builder)) add(10, `Built on a generic ${builderName(builder)} template`);

  const text = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = text ? text.split(" ").length : 0;
  if (words < 250) add(15, `Very little information (${words} words on the homepage)`);

  if (!/href=["']tel:/i.test(html)) add(10, "Phone number isn't tap-to-call");
  if (!/(free (estimate|quote)|get a quote|request a quote|book (now|online|an?)|schedule|call (us )?today)/i.test(text)) {
    add(10, "No clear call to action (quote, estimate or booking)");
  }

  const host = url.hostname.replace(/^www\./, "");
  const pages = new Set<string>();
  for (const [, href] of html.matchAll(/href=["']([^"'#?]+)["']/gi)) {
    try {
      const link = new URL(href, finalUrl);
      if (link.hostname.replace(/^www\./, "") === host && !/\.(png|jpe?g|gif|pdf|css|js|svg|webp|ico)$/i.test(link.pathname)) {
        pages.add(link.pathname.replace(/\/$/, "") || "/");
      }
    } catch {
      /* ignore */
    }
  }
  if (pages.size <= 3) add(10, `Only ${pages.size || 1} page${pages.size === 1 ? "" : "s"}`);

  if (ms > 4000) add(10, `Slow to load (${(ms / 1000).toFixed(1)}s)`);
  if (!/<meta[^>]+name=["']description["']/i.test(html)) add(5, "No search description (weak on Google)");
  if (/<font[\s>]|<marquee|<center>|\.swf["']|bgcolor=/i.test(html)) add(15, "Outdated code from an older era of the web");

  // Ask the screenshot service to start capturing now, so Before & After shows it sooner.
  void fetch(screenshotUrl(finalUrl), { cache: "no-store", signal: AbortSignal.timeout(5000) }).catch(() => {});

  found.sort((a, b) => b.points - a.points);
  return {
    score: Math.min(100, found.reduce((sum, f) => sum + f.points, 0)),
    issues: found.map((f) => f.text),
    reachable: true,
  };
}
