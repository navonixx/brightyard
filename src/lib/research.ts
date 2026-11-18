import "server-only";

export type SiteResearch = {
  url: string;
  pages: number;
  text: string;
  emails: string[];
  builder: string | null;
};

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const MAX_HTML = 1_500_000;
const MAX_TEXT = 12_000;

/** Only public http(s) sites — never localhost or private network addresses. */
function assertPublicUrl(raw: string): URL {
  const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  const host = url.hostname.toLowerCase();
  const privateHost =
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host.includes(":");
  if (!/^https?:$/.test(url.protocol) || privateHost) throw new Error("Not a public website address.");
  return url;
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: AbortSignal.timeout(9000),
      redirect: "follow",
      cache: "no-store",
    });
    if (!response.ok || !(response.headers.get("content-type") ?? "").includes("html")) return null;
    return (await response.text()).slice(0, MAX_HTML);
  } catch {
    return null;
  }
}

function toText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>|<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;|&#8203;/g, " ")
    .replace(/&amp;|&#038;/g, "&")
    .replace(/&#39;|&rsquo;|&#8217;|&apos;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&mdash;|&#8212;/g, "—")
    .replace(/\s+/g, " ")
    .trim();
}

function findEmails(html: string): string[] {
  const found = new Set<string>();
  // Cloudflare-obfuscated addresses
  for (const [, hex] of html.matchAll(/data-cfemail="([0-9a-f]+)"/g)) {
    const key = parseInt(hex.slice(0, 2), 16);
    let out = "";
    for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
    found.add(out.toLowerCase());
  }
  for (const match of html.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g) ?? []) {
    found.add(match.toLowerCase());
  }
  return [...found].filter(
    (e) => !/\.(png|jpe?g|webp|gif|svg|css|js)$|sentry|wixpress|example\.|godaddy|domain\.com|email\.com$|@2x|schema\.org/i.test(e),
  );
}

function detectBuilder(html: string): string | null {
  const generator = html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i)?.[1];
  if (generator) return generator.slice(0, 60);
  const hit = /(wix\.com|weebly|squarespace|godaddy|duda|webflow|wp-content)/i.exec(html)?.[1];
  return hit ? hit.toLowerCase().replace("wp-content", "WordPress") : null;
}

/** Reads a business's homepage plus up to three about/contact/services pages. */
export async function researchSite(rawUrl: string): Promise<SiteResearch | null> {
  const home = assertPublicUrl(rawUrl);
  const html = await fetchHtml(home.toString());
  if (!html) return null;

  const links = new Set<string>();
  for (const [, href] of html.matchAll(/href=["']([^"'#]+)["']/gi)) {
    if (!/about|contact|service/i.test(href)) continue;
    try {
      const url = new URL(href, home);
      if (url.hostname === home.hostname && url.pathname !== home.pathname && !/\.(pdf|jpg|png)$/i.test(url.pathname)) {
        links.add(url.origin + url.pathname);
      }
    } catch {
      /* ignore malformed links */
    }
    if (links.size >= 3) break;
  }

  const extra = (await Promise.all([...links].map(fetchHtml))).filter((page): page is string => Boolean(page));
  const all = [html, ...extra];
  const text = all
    .map(toText)
    .join("\n\n--- next page ---\n\n")
    .slice(0, MAX_TEXT);

  return {
    url: home.toString(),
    pages: all.length,
    text,
    emails: [...new Set(all.flatMap(findEmails))].slice(0, 8),
    builder: detectBuilder(html),
  };
}
