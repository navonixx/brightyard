import "server-only";
import { one, q } from "./db";
import { domainOf, formatPhone, isRealSite, phoneKey } from "./web";
import type { Signal } from "./signals";

export type NewLead = {
  source: string;
  sourceId: string;
  kind?: "business" | "creator" | "company";
  name: string;
  niche?: string | null;
  category?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  phone?: string | null;
  website?: string | null;
  email?: string | null;
  socials?: Record<string, string>;
  rating?: number | null;
  reviewCount?: number | null;
  extra?: Record<string, unknown>;
};

export const nameKey = (name: string) =>
  name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(llc|inc|co|corp|pllc|pc|ltd|the|dds|dmd|md)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Saves leads from any source. The same business found on two platforms becomes ONE lead:
 * matched by website domain, then phone number, then name in the same state — the missing
 * details (email, website, socials…) are filled in from the newer source.
 */
export async function saveLeads(list: NewLead[]): Promise<{ added: number; merged: number }> {
  let added = 0;
  let merged = 0;
  for (const raw of list) {
    if (!raw.name?.trim()) continue;
    const socials = { ...(raw.socials ?? {}) };
    let website = raw.website?.trim() || null;
    if (website && !isRealSite(website)) {
      if (/facebook\.com/i.test(website) && !socials.facebook) socials.facebook = website;
      if (/instagram\.com/i.test(website) && !socials.instagram) socials.instagram = website;
      website = null;
    }
    const domain = website ? domainOf(website) : null;
    const pk = phoneKey(raw.phone);
    const nk = nameKey(raw.name);
    const state = raw.state?.toUpperCase().slice(0, 2) || null;

    const same = await one<{ id: number }>("SELECT id FROM le_leads WHERE source = $1 AND source_id = $2", [raw.source, raw.sourceId]);
    if (same) continue;

    const match =
      (domain && (await one<{ id: number }>("SELECT id FROM le_leads WHERE domain = $1 LIMIT 1", [domain]))) ||
      (pk && (await one<{ id: number }>("SELECT id FROM le_leads WHERE phone_key = $1 LIMIT 1", [pk]))) ||
      (nk && state && (await one<{ id: number }>("SELECT id FROM le_leads WHERE name_key = $1 AND state = $2 LIMIT 1", [nk, state]))) ||
      null;

    if (match) {
      await q(
        `UPDATE le_leads SET
           sources = CASE WHEN $2 = ANY(sources) THEN sources ELSE array_append(sources, $2) END,
           enrich_status = CASE WHEN website IS NULL AND $3::text IS NOT NULL THEN 'pending' ELSE enrich_status END,
           website = COALESCE(website, $3), domain = COALESCE(domain, $4),
           phone = COALESCE(phone, $5), phone_key = COALESCE(phone_key, $6),
           email = COALESCE(email, $7),
           socials = $8::jsonb || socials,
           rating = COALESCE(rating, $9), review_count = GREATEST(review_count, $10),
           extra = extra || $11::jsonb,
           niche = COALESCE(niche, $12), city = COALESCE(city, $13), address = COALESCE(address, $14),
           updated_at = now()
         WHERE id = $1`,
        [match.id, raw.source, website, domain, formatPhone(raw.phone), pk, raw.email ?? null, JSON.stringify(socials), raw.rating ?? null, raw.reviewCount ?? null, JSON.stringify(raw.extra ?? {}), raw.niche ?? null, raw.city ?? null, raw.address ?? null],
      );
      merged++;
      continue;
    }

    await q(
      `INSERT INTO le_leads (source, source_id, sources, kind, name, name_key, niche, category, city, state, address, lat, lng,
         phone, phone_key, website, domain, email, emails, socials, rating, review_count, extra)
       VALUES ($1,$2,ARRAY[$1],$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::jsonb,$19::jsonb,$20,$21,$22::jsonb)
       ON CONFLICT (source, source_id) DO NOTHING`,
      [raw.source, raw.sourceId, raw.kind ?? "business", raw.name.trim().slice(0, 200), nk, raw.niche ?? null, raw.category ?? null, raw.city ?? null, state, raw.address ?? null, raw.lat ?? null, raw.lng ?? null,
        formatPhone(raw.phone), pk, website, domain, raw.email ?? null, JSON.stringify(raw.email ? [raw.email] : []), JSON.stringify(socials), raw.rating ?? null, raw.reviewCount ?? null, JSON.stringify(raw.extra ?? {})],
    );
    added++;
  }
  return { added, merged };
}

export type Lead = {
  id: number;
  source: string;
  source_id: string;
  sources: string[];
  kind: string;
  name: string;
  niche: string | null;
  category: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  domain: string | null;
  email: string | null;
  emails: string[];
  socials: Record<string, string>;
  rating: number | null;
  review_count: number | null;
  extra: Record<string, unknown>;
  enrich_status: string;
  pay_score: number;
  pain_score: number;
  pay_signals: Signal[];
  pain_signals: Signal[];
  status: string;
  notes: string | null;
  follow_up: string | null;
  contacted_at: string | null;
  lead_id: string | null;
  created_at: string;
};

export type LeadFilter = {
  source?: string;
  niche?: string;
  state?: string;
  city?: string;
  kind?: string;
  status?: string;
  email?: string; // "yes" | "no"
  site?: string; // "yes" | "no"
  minPay?: number;
  minPain?: number;
  q?: string;
  sort?: string; // "best" | "pay" | "pain" | "new"
  page?: number;
};

export const PAGE_SIZE = 50;

function where(f: LeadFilter) {
  const parts: string[] = [];
  const args: unknown[] = [];
  const add = (sql: string, v: unknown) => {
    args.push(v);
    parts.push(sql.replace("?", `$${args.length}`));
  };
  if (f.source) add("? = ANY(sources)", f.source);
  if (f.niche) add("niche = ?", f.niche);
  if (f.state) add("state = ?", f.state);
  if (f.city) add("city ILIKE ?", f.city);
  if (f.kind) add("kind = ?", f.kind);
  if (f.status) add("status = ?", f.status);
  else parts.push("status <> 'skip'");
  if (f.email === "yes") parts.push("email IS NOT NULL");
  if (f.email === "no") parts.push("email IS NULL");
  if (f.site === "yes") parts.push("website IS NOT NULL");
  if (f.site === "no") parts.push("website IS NULL");
  if (f.minPay) add("pay_score >= ?", f.minPay);
  if (f.minPain) add("pain_score >= ?", f.minPain);
  if (f.q) add("(name ILIKE ? OR domain ILIKE $X OR email ILIKE $X)".replace(/\$X/g, `$${args.length + 1}`), `%${f.q}%`);
  return { sql: parts.length ? `WHERE ${parts.join(" AND ")}` : "", args };
}

const ORDER: Record<string, string> = {
  // Both matter: a rich business with no problem (or a needy one with no money) ranks below one with both.
  best: "(pay_score * 0.4 + pain_score * 0.4 + LEAST(pay_score, pain_score) * 0.6 + CASE WHEN email IS NOT NULL THEN 8 ELSE 0 END) DESC, id DESC",
  pay: "pay_score DESC, id DESC",
  pain: "pain_score DESC, id DESC",
  new: "id DESC",
};

export async function listLeads(f: LeadFilter) {
  const { sql, args } = where(f);
  const page = Math.max(1, f.page ?? 1);
  const rows = await q<Lead>(
    `SELECT * FROM le_leads ${sql} ORDER BY ${ORDER[f.sort ?? "best"] ?? ORDER.best} LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
    args,
  );
  const total = Number((await one<{ n: number }>(`SELECT count(*)::int n FROM le_leads ${sql}`, args))?.n ?? 0);
  return { rows, total, page };
}

export async function leadsForExport(f: LeadFilter) {
  const { sql, args } = where(f);
  return q<Lead>(`SELECT * FROM le_leads ${sql} ORDER BY ${ORDER[f.sort ?? "best"] ?? ORDER.best} LIMIT 20000`, args);
}

export const getLead = (id: number) => one<Lead>("SELECT * FROM le_leads WHERE id = $1", [id]);

export async function stats() {
  const totals = await one<{ total: number; site: number; email: number; scored: number; pending: number; hot: number; contacted: number; won: number }>(
    `SELECT count(*)::int total, count(website)::int site, count(email)::int email,
       count(*) FILTER (WHERE enrich_status IN ('done','no_site','failed'))::int scored,
       count(*) FILTER (WHERE enrich_status = 'pending')::int pending,
       count(*) FILTER (WHERE pay_score >= 30 AND pain_score >= 30 AND email IS NOT NULL AND status = 'new')::int hot,
       count(*) FILTER (WHERE status IN ('contacted','replied'))::int contacted,
       count(*) FILTER (WHERE status = 'won')::int won
     FROM le_leads`,
  );
  const bySource = await q<{ source: string; n: number; email: number }>(
    `SELECT s AS source, count(*)::int n, count(email)::int email FROM le_leads, unnest(sources) s GROUP BY s ORDER BY n DESC`,
  );
  const multi = Number((await one<{ n: number }>("SELECT count(*)::int n FROM le_leads WHERE cardinality(sources) > 1"))?.n ?? 0);
  return { ...totals!, bySource, multi };
}

export async function facets() {
  const states = await q<{ state: string }>("SELECT DISTINCT state FROM le_leads WHERE state IS NOT NULL ORDER BY state");
  return { states: states.map((s) => s.state) };
}
