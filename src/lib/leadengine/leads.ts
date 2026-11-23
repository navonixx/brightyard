import "server-only";
import { one, pgArray, q } from "./db";
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
 * Saves leads from any source in bulk. The same business found on two platforms becomes ONE lead:
 * matched by website domain, then phone number, then name in the same state — the missing
 * details (email, website, socials…) are filled in from the newer source.
 */
export async function saveLeads(list: NewLead[]): Promise<{ added: number; merged: number }> {
  type Item = { raw: NewLead; website: string | null; domain: string | null; pk: string | null; nk: string; state: string | null; socials: Record<string, string> };
  const items: Item[] = [];
  for (const raw of list) {
    if (!raw.name?.trim() || !raw.sourceId) continue;
    const socials = { ...(raw.socials ?? {}) };
    let website = raw.website?.trim() || null;
    if (website && !isRealSite(website)) {
      if (/facebook.com/i.test(website) && !socials.facebook) socials.facebook = website;
      if (/instagram.com/i.test(website) && !socials.instagram) socials.instagram = website;
      website = null;
    }
    items.push({ raw, website, domain: website ? domainOf(website) : null, pk: phoneKey(raw.phone), nk: nameKey(raw.name), state: raw.state?.toUpperCase().slice(0, 2) || null, socials });
  }
  if (!items.length) return { added: 0, merged: 0 };
  const source = items[0].raw.source;

  // Everything already stored that could match, in three queries.
  const known = new Set(
    (await q<{ source_id: string }>("SELECT source_id FROM le_leads WHERE source = $1 AND source_id = ANY($2::text[])", [source, pgArray(items.map((i) => i.raw.sourceId))])).map((r) => r.source_id),
  );
  const fresh = items.filter((i) => !known.has(i.raw.sourceId));
  const domains = [...new Set(fresh.map((i) => i.domain).filter(Boolean))] as string[];
  const phones = [...new Set(fresh.map((i) => i.pk).filter(Boolean))] as string[];
  const names = [...new Set(fresh.map((i) => i.nk).filter(Boolean))];
  const existing = fresh.length
    ? await q<{ id: number; domain: string | null; phone_key: string | null; name_key: string | null; state: string | null }>(
        "SELECT id, domain, phone_key, name_key, state FROM le_leads WHERE domain = ANY($1::text[]) OR phone_key = ANY($2::text[]) OR name_key = ANY($3::text[])",
        [pgArray(domains), pgArray(phones), pgArray(names)],
      )
    : [];
  const byDomain = new Map<string, number>();
  const byPhone = new Map<string, number>();
  const byName = new Map<string, number>();
  for (const e of existing) {
    if (e.domain) byDomain.set(e.domain, e.id);
    if (e.phone_key) byPhone.set(e.phone_key, e.id);
    if (e.name_key && e.state) byName.set(`${e.name_key}|${e.state}`, e.id);
  }

  // Matches inside this batch merge into the first copy (negative ids = not inserted yet).
  const inserts: Item[] = [];
  const merges: { id: number; item: Item }[] = [];
  for (const it of fresh) {
    const id =
      (it.domain && byDomain.get(it.domain)) || (it.pk && byPhone.get(it.pk)) || (it.nk && it.state && byName.get(`${it.nk}|${it.state}`)) || null;
    if (id && id > 0) {
      merges.push({ id, item: it });
      continue;
    }
    if (id && id < 0) {
      const first = inserts[-id - 1];
      first.website ??= it.website;
      first.domain ??= it.domain;
      first.pk ??= it.pk;
      first.raw = { ...first.raw, email: first.raw.email ?? it.raw.email, phone: first.raw.phone ?? it.raw.phone };
      first.socials = { ...it.socials, ...first.socials };
      continue;
    }
    inserts.push(it);
    const ref = -inserts.length;
    if (it.domain) byDomain.set(it.domain, ref);
    if (it.pk) byPhone.set(it.pk, ref);
    if (it.nk && it.state) byName.set(`${it.nk}|${it.state}`, ref);
  }

  for (let i = 0; i < inserts.length; i += 200) {
    const chunk = inserts.slice(i, i + 200);
    const params: unknown[] = [];
    const rows = chunk.map((it) => {
      const r = it.raw;
      const v = [r.source, r.sourceId, r.kind ?? "business", r.name.trim().slice(0, 200), it.nk, r.niche ?? null, r.category ?? null, r.city ?? null, it.state, r.address ?? null,
        r.lat ?? null, r.lng ?? null, formatPhone(r.phone), it.pk, it.website, it.domain, r.email ?? null, JSON.stringify(r.email ? [r.email] : []), JSON.stringify(it.socials),
        r.rating ?? null, r.reviewCount ?? null, JSON.stringify(r.extra ?? {})];
      const b = params.length;
      params.push(...v);
      const p = (n: number) => `$${b + n}`;
      return `(${p(1)},${p(2)},ARRAY[${p(1)}],${p(3)},${p(4)},${p(5)},${p(6)},${p(7)},${p(8)},${p(9)},${p(10)},${p(11)}::float8,${p(12)}::float8,${p(13)},${p(14)},${p(15)},${p(16)},${p(17)},${p(18)}::jsonb,${p(19)}::jsonb,${p(20)}::real,${p(21)}::int,${p(22)}::jsonb)`;
    });
    await q(
      `INSERT INTO le_leads (source, source_id, sources, kind, name, name_key, niche, category, city, state, address, lat, lng,
         phone, phone_key, website, domain, email, emails, socials, rating, review_count, extra)
       VALUES ${rows.join(",")} ON CONFLICT (source, source_id) DO NOTHING`,
      params,
    );
  }

  for (const { id, item } of merges) {
    const r = item.raw;
    await q(
      `UPDATE le_leads SET
         sources = CASE WHEN $2 = ANY(sources) THEN sources ELSE array_append(sources, $2) END,
         enrich_status = CASE WHEN website IS NULL AND $3::text IS NOT NULL THEN 'pending' ELSE enrich_status END,
         website = COALESCE(website, $3), domain = COALESCE(domain, $4),
         phone = COALESCE(phone, $5), phone_key = COALESCE(phone_key, $6),
         email = COALESCE(email, $7),
         socials = $8::jsonb || socials,
         rating = COALESCE(rating, $9::real), review_count = GREATEST(review_count, $10::int),
         extra = extra || $11::jsonb,
         niche = COALESCE(niche, $12), city = COALESCE(city, $13), address = COALESCE(address, $14),
         updated_at = now()
       WHERE id = $1`,
      [id, r.source, item.website, item.domain, formatPhone(r.phone), item.pk, r.email ?? null, JSON.stringify(item.socials), r.rating ?? null, r.reviewCount ?? null, JSON.stringify(r.extra ?? {}), r.niche ?? null, r.city ?? null, r.address ?? null],
    );
  }
  return { added: inserts.length, merged: merges.length };
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
