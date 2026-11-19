import "server-only";
import { fetchHtml, findEmails } from "./research";

const FREE_MAIL = /@(gmail|yahoo|ymail|outlook|hotmail|live|msn|aol|icloud|me|mac|comcast|att|sbcglobal|bellsouth|cox|verizon|charter|frontier|protonmail)\.[a-z.]+$/i;
const JUNK =
  /wix|sentry|example\.|domain\.|yourdomain|yourcompany|yoursite|youremail|email\.com$|godaddy|squarespace|wordpress|jquery|bootstrap|cloudflare|schema\.org|\.(png|jpe?g|gif|webp|svg|css|js)$/i;
const ROLE_JUNK =
  /^(noreply|no-reply|donotreply|do-not-reply|privacy|abuse|webmaster|postmaster|hostmaster|dmca|legal|example|sample|test|demo|name|yourname|your|email|youremail|user|username|someone|john|jane|johndoe|janedoe|jdoe|first\.last|firstname|me)@/i;

/**
 * The address most likely to reach the owner: one on the business's own domain first,
 * then a personal Gmail/Yahoo-style address. An address on another company's domain
 * (often the web designer's) is never picked.
 */
export function pickEmail(found: string[], siteUrl: string): string | null {
  const host = (() => {
    try {
      return new URL(siteUrl).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      return "";
    }
  })();
  const clean = [
    ...new Set(
      found
        .map((e) => e.trim().toLowerCase().replace(/^(u003e|%20|mailto:)/, ""))
        .filter((e) => e.length <= 60 && !JUNK.test(e) && !ROLE_JUNK.test(e) && !/[0-9a-f]{16,}/.test(e)),
    ),
  ];
  const ownDomain = (e: string) => {
    const domain = e.split("@")[1] ?? "";
    return host && (domain === host || domain.endsWith(`.${host}`) || host.endsWith(`.${domain}`));
  };
  return clean.find(ownDomain) ?? clean.find((e) => FREE_MAIL.test(e)) ?? null;
}

/** Emails on the homepage; if none fit, also the contact/about pages. */
export async function fetchEmailsFrom(html: string, pageUrl: string): Promise<{ email: string | null; emails: string[] }> {
  let all = findEmails(html);
  let email = pickEmail(all, pageUrl);
  if (!email) {
    const base = new URL(pageUrl);
    const links = new Set<string>();
    for (const [, href] of html.matchAll(/href=["']([^"'#]+)["']/gi)) {
      if (!/contact|about/i.test(href)) continue;
      try {
        const link = new URL(href, base);
        if (link.hostname === base.hostname && !/\.(pdf|jpe?g|png)$/i.test(link.pathname)) links.add(link.origin + link.pathname);
      } catch {
        /* ignore malformed links */
      }
      if (links.size >= 2) break;
    }
    const pages = await Promise.all([...links].map((link) => fetchHtml(link, 7000)));
    all = [...new Set([...all, ...pages.flatMap((page) => (page ? findEmails(page) : []))])];
    email = pickEmail(all, pageUrl);
  }
  return { email, emails: all.filter((e) => !JUNK.test(e)) };
}
