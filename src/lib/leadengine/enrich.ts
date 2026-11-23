import "server-only";
import { q } from "./db";
import type { Lead } from "./leads";
import { scoreLead, type SiteFacts } from "./signals";
import { domainYear, fetchPage, fetchSite, findEmails, findSocials, pickEmail, sameSiteLinks } from "./web";

/** Opens the lead's website (if any), finds email + socials, and scores "can pay" and "pain". */
export async function enrichLead(lead: Lead): Promise<void> {
  let site: SiteFacts | null = null;
  let email = lead.email;
  let emails = lead.emails ?? [];
  let socials = { ...(lead.socials ?? {}) };

  if (lead.website) {
    const [page, year] = await Promise.all([fetchSite(lead.website), lead.domain ? domainYear(lead.domain) : Promise.resolve(null)]);
    // 401/403/429/503 = the site's firewall blocked our checker (common for visitors outside the US) — not the owner's problem.
    if (!page.ok && /\((401|403|406|429|503|999)\)/.test(page.error)) {
      site = null;
    } else if (page.ok && page.kind === "parked") {
      site = { ok: false, error: "the address on their listing is a parked domain — no real website", domainYear: year };
    } else if (page.ok) {
      site = { ok: true, html: page.html, finalUrl: page.finalUrl, ms: page.ms, domainYear: year, spa: page.kind === "spa" };
      let found = findEmails(page.html);
      if (!pickEmail(found, page.finalUrl)) {
        const extra = await Promise.all(sameSiteLinks(page.html, page.finalUrl, /contact|about/i).map((u) => fetchPage(u, 7000)));
        found = [...found, ...extra.flatMap((p) => (p.ok ? findEmails(p.html) : []))];
      }
      emails = [...new Set([...emails, ...found])].slice(0, 10);
      email = email ?? pickEmail(found, page.finalUrl);
      socials = { ...findSocials(page.html), ...socials };
    } else {
      site = { ok: false, error: page.error, domainYear: year };
    }
  }

  const result = scoreLead(
    {
      kind: lead.kind,
      niche: lead.niche,
      hasWebsite: Boolean(lead.website),
      socials,
      rating: lead.rating,
      reviewCount: lead.review_count,
      extra: lead.extra ?? {},
    },
    site,
  );
  await q(
    `UPDATE le_leads SET email = $2, emails = $3::jsonb, socials = $4::jsonb, pay_score = $5, pain_score = $6,
       pay_signals = $7::jsonb, pain_signals = $8::jsonb, enrich_status = $9, enriched_at = now(), updated_at = now()
     WHERE id = $1`,
    [lead.id, email, JSON.stringify(emails), JSON.stringify(socials), result.payScore, result.painScore, JSON.stringify(result.pay), JSON.stringify(result.pain),
      !lead.website ? "no_site" : site === null || site.ok ? "done" : "failed"],
  );
}

let offlineSeen = false;

/** Enriches up to `n` waiting leads, a few at a time. Returns how many were processed (throws if the internet is down). */
export async function enrichBatch(n = 12, parallel = 6): Promise<number> {
  offlineSeen = false;
  const batch = await q<Lead>(
    `UPDATE le_leads SET enrich_status = 'working', claimed_at = now()
     WHERE id IN (SELECT id FROM le_leads WHERE enrich_status = 'pending' OR (enrich_status = 'working' AND claimed_at < now() - interval '5 minutes')
                  ORDER BY (website IS NULL), id LIMIT $1 FOR UPDATE SKIP LOCKED)
     RETURNING *`,
    [n],
  );
  for (let i = 0; i < batch.length; i += parallel) {
    await Promise.all(
      batch.slice(i, i + parallel).map((lead) =>
        Promise.race([enrichLead(lead), new Promise<never>((_, reject) => setTimeout(() => reject(new Error("slow")), 18_000))]).catch(async (e) => {
          // No internet → try this lead again later instead of calling its website broken.
          const offline = e instanceof Error && e.message === "NETWORK_DOWN";
          await q(`UPDATE le_leads SET enrich_status = $2, enriched_at = now() WHERE id = $1`, [lead.id, offline ? "pending" : "failed"]);
          if (offline) offlineSeen = true;
        }),
      ),
    );
  }
  if (offlineSeen) throw new Error("No internet connection — paused website checks, will retry");
  return batch.length;
}
