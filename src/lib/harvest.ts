import "server-only";
import { and, asc, desc, eq, ilike, inArray, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "./db";
import { harvestJobs, leads, prospects, type HarvestJob, type Prospect } from "./db/schema";
import { createLead, updateLead } from "./data";
import { nicheFor, nicheLabel } from "./niches";
import { legacyPlaceDetails, legacyTextSearch, scoreLead } from "./places";
import { fetchEmailsFrom } from "./emails";
import { analyzeSite, fetchHomepage, WEAK_SITE_THRESHOLD } from "./sitecheck";

/**
 * Monthly limits, so the Google bill never surprises anyone.
 * - searches: legacy Text Search pages (20 results each)
 * - lookups: one Place Details call per NEW business (gives website + phone) — this is what "leads per month" means
 */
export const DEFAULT_SEARCH_CAP = 4500;
export const DEFAULT_LOOKUP_CAP = 5000;
const SOCIAL = /facebook\.com|instagram\.com|yelp\.com|linktr\.ee|nextdoor\.com|business\.site|google\.com/i;
/** Stop a niche × city once this many pages in a row brought nothing new: Google has run dry there. */
const DRY_LIMIT = 20;
/** Neighbourhood grid over the metro: centre plus rings at 8, 16 and 26 km — [km north, km east, search radius in m]. */
const GRID: [number, number, number][] = [
  [0, 0, 6000],
  ...[0, 45, 90, 135, 180, 225, 270, 315].map((deg): [number, number, number] => ring(8, deg, 6000)),
  ...[22, 67, 112, 157, 202, 247, 292, 337].map((deg): [number, number, number] => ring(16, deg, 7000)),
  ...[0, 45, 90, 135, 180, 225, 270, 315].map((deg): [number, number, number] => ring(26, deg, 9000)),
];
function ring(km: number, deg: number, radius: number): [number, number, number] {
  const rad = (deg * Math.PI) / 180;
  return [km * Math.cos(rad), km * Math.sin(rad), radius];
}

const rowsOf = <T>(result: unknown): T[] => (Array.isArray(result) ? result : ((result as { rows?: T[] }).rows ?? [])) as T[];
const month = () => new Date().toISOString().slice(0, 7);
const KEYS = {
  searches: () => `placesRequests:${month()}`,
  lookups: () => `placesDetails:${month()}`,
};

// ─── Queue ─────────────────────────────────────────────────────────────

export type QueueOrder = "niche" | "city";

/**
 * Adds one search per niche × city. "niche" order works every city of niche 1, then niche 2, …;
 * "city" order works every niche in city 1, then city 2, …
 */
export async function queueHarvest(niches: string[], markets: string[], order: QueueOrder = "niche"): Promise<number> {
  const db = await getDb();
  const [{ max }] = rowsOf<{ max: number | null }>(await db.execute(sql`SELECT max(position)::int AS max FROM harvest_jobs`));
  const base = (max ?? 0) + 1;
  const values = niches.flatMap((niche, i) =>
    markets.map((market, j) => ({
      niche,
      market,
      target: 0,
      position: base + (order === "niche" ? i * markets.length + j : j * niches.length + i),
    })),
  );
  let added = 0;
  // Postgres caps parameters per statement, so insert in chunks.
  for (let i = 0; i < values.length; i += 2000) {
    const inserted = await db.insert(harvestJobs).values(values.slice(i, i + 2000)).onConflictDoNothing().returning({ id: harvestJobs.id });
    added += inserted.length;
  }
  return added;
}

/** Digits of a US phone number, or null. */
const phoneKey = (phone: string | null) => {
  const digits = phone?.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "") ?? "";
  return digits.length >= 10 ? digits : null;
};
/** Bare website host — null for social/directory pages that many businesses share. */
const domainKey = (website: string | null) => {
  if (!website || SOCIAL.test(website)) return null;
  try {
    return new URL(website).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
};

export async function clearQueue(): Promise<number> {
  const db = await getDb();
  const removed = await db.delete(harvestJobs).where(eq(harvestJobs.status, "queued")).returning({ id: harvestJobs.id });
  return removed.length;
}

export async function retryFailed(): Promise<number> {
  const db = await getDb();
  const rows = await db
    .update(harvestJobs)
    .set({ status: "queued", error: null, lockedUntil: null, updatedAt: new Date() })
    .where(eq(harvestJobs.status, "failed"))
    .returning({ id: harvestJobs.id });
  await db.update(prospects).set({ enrichStatus: "pending", claimedAt: null }).where(eq(prospects.enrichStatus, "failed"));
  return rows.length;
}

// ─── Monthly Google budget ─────────────────────────────────────────────

export type Usage = { searches: number; searchCap: number; lookups: number; lookupCap: number };

export async function monthlyUsage(): Promise<Usage> {
  const db = await getDb();
  const rows = rowsOf<{ key: string; value: string }>(
    await db.execute(
      sql`SELECT key, value FROM settings WHERE key IN (${KEYS.searches()}, ${KEYS.lookups()}, 'harvestMonthlyCap', 'harvestLookupCap')`,
    ),
  );
  const get = (k: string, fallback: number) => Number(rows.find((r) => r.key === k)?.value ?? fallback) || 0;
  return {
    searches: get(KEYS.searches(), 0),
    searchCap: get("harvestMonthlyCap", DEFAULT_SEARCH_CAP) || DEFAULT_SEARCH_CAP,
    lookups: get(KEYS.lookups(), 0),
    lookupCap: get("harvestLookupCap", DEFAULT_LOOKUP_CAP) || DEFAULT_LOOKUP_CAP,
  };
}

async function count(kind: keyof typeof KEYS, n = 1): Promise<void> {
  if (n <= 0) return;
  const db = await getDb();
  await db.execute(
    sql`INSERT INTO settings (key, value) VALUES (${KEYS[kind]()}, ${String(n)})
        ON CONFLICT (key) DO UPDATE SET value = ((settings.value)::int + ${n})::text`,
  );
}

// ─── Worker ────────────────────────────────────────────────────────────

export type HarvestProgress = {
  jobsTotal: number;
  jobsDone: number;
  jobsFailed: number;
  prospects: number;
  withWebsite: number;
  checked: number;
  toCheck: number;
  withEmail: number;
  weak: number;
  current: string | null;
  usage: Usage;
  idle: boolean;
  log: string[];
  error?: string;
};

class BudgetPaused extends Error {}

/**
 * One slice of work (well under a minute): Google pages for the next niche × city in the queue
 * for ~25 seconds, then opens a batch of found websites to score them and look for an email.
 * Safe to call from several tabs at once — work is claimed with row locks.
 */
export async function harvestStep({ search = true }: { search?: boolean } = {}): Promise<HarvestProgress> {
  const started = Date.now();
  const log: string[] = [];
  let error: string | undefined;

  const jobId = search ? await claimJob() : null;
  if (jobId) {
    try {
      while (Date.now() - started < 25_000) {
        const done = await runJobPage(jobId, log);
        if (done) break;
      }
    } catch (e) {
      if (e instanceof BudgetPaused) {
        error = e.message;
      } else if (e instanceof Error && /fetch failed|timeout|aborted|ECONN|socket/i.test(e.message)) {
        // Network blip: leave the search queued and carry on next step.
        log.push("Network hiccup talking to Google — retrying on the next step.");
      } else {
        const message = e instanceof Error ? e.message : "Search failed";
        const db = await getDb();
        await db.update(harvestJobs).set({ status: "failed", error: message.slice(0, 300), updatedAt: new Date() }).where(eq(harvestJobs.id, jobId));
        log.push(`Search failed: ${message}`);
      }
    } finally {
      const db = await getDb();
      await db.update(harvestJobs).set({ lockedUntil: null }).where(eq(harvestJobs.id, jobId));
    }
  }

  const batch = await claimProspects(jobId ? 12 : 24);
  if (batch.length) {
    const results = await Promise.all(batch.map((p) => enrichProspect(p).catch(() => "failed" as const)));
    const emails = results.filter((r) => r === "email").length;
    log.push(`Opened ${batch.length} websites · ${emails} email${emails === 1 ? "" : "s"} found`);
  }

  const progress = await harvestProgress();
  // Idle = nothing was left to claim (or another tab holds the last of it).
  return { ...progress, log, error, idle: !jobId && !batch.length };
}

async function claimJob(): Promise<number | null> {
  const db = await getDb();
  const [row] = rowsOf<{ id: number }>(
    await db.execute(sql`
      UPDATE harvest_jobs SET locked_until = now() + interval '75 seconds'
      WHERE id = (
        SELECT id FROM harvest_jobs
        WHERE status = 'queued' AND (locked_until IS NULL OR locked_until < now())
        ORDER BY position, id LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id`),
  );
  return row?.id ?? null;
}

type PlanStep = { query: string; location?: { lat: number; lng: number }; radius?: number };

/** City-wide searches for every phrase, then the first two phrases in each of 25 neighbourhoods. */
function planFor(job: HarvestJob): PlanStep[] {
  const niche = nicheFor(job.niche);
  const steps: PlanStep[] = niche.queries.map((q) => ({ query: `${q} in ${job.market}` }));
  if (job.centerLat !== null && job.centerLng !== null) {
    const lat = job.centerLat;
    const lng = job.centerLng;
    // Sweep the whole grid with the main phrase first, then again with the second phrase.
    for (const q of niche.queries.slice(0, 2)) {
      for (const [north, east, radius] of GRID) {
        const point = { lat: lat + north / 111, lng: lng + east / (111 * Math.cos((lat * Math.PI) / 180)) };
        steps.push({ query: q, location: point, radius });
      }
    }
  }
  return steps;
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
};

/** Runs the next Google page of a niche × city. Returns true when that search is finished. */
async function runJobPage(jobId: number, log: string[]): Promise<boolean> {
  const db = await getDb();
  const [job] = await db.select().from(harvestJobs).where(eq(harvestJobs.id, jobId)).limit(1);
  if (!job || job.status !== "queued") return true;
  const plan = planFor(job);
  const step = plan[job.queryIndex];
  if (!step) {
    await db.update(harvestJobs).set({ status: "done", updatedAt: new Date() }).where(eq(harvestJobs.id, jobId));
    return true;
  }

  const usage = await monthlyUsage();
  if (usage.searches >= usage.searchCap) {
    throw new BudgetPaused(`Paused: this month's Google search limit (${usage.searchCap.toLocaleString()}) is reached. It resumes on the 1st, or raise the limit in "Collect leads".`);
  }
  // A page can bring up to 20 new businesses, each needing one lookup.
  if (usage.lookups + 20 > usage.lookupCap) {
    throw new BudgetPaused(`Paused: this month's lead limit (${usage.lookupCap.toLocaleString()} new businesses) is reached. It resumes on the 1st, or raise the limit in "Collect leads".`);
  }

  const page = await legacyTextSearch(step.query, { pageToken: job.pageToken, location: step.location, radius: step.radius });
  await count("searches");

  const marketState = job.market.split(",")[1]?.trim().toUpperCase();
  const inState = page.hits.filter((h) => !marketState || !h.state || h.state === marketState);
  // Only pay for a details lookup on businesses we haven't stored yet.
  const known = inState.length
    ? new Set(
        (await db.select({ id: prospects.placeId }).from(prospects).where(inArray(prospects.placeId, inState.map((h) => h.placeId)))).map(
          (r) => r.id,
        ),
      )
    : new Set<string>();
  const fresh = inState.filter((h) => !known.has(h.placeId));
  const details = await Promise.all(fresh.map((h) => legacyPlaceDetails(h.placeId)));
  await count("lookups", fresh.length);

  // One row per real business: a second Google listing with the same phone or website is skipped.
  const keyed = fresh.map((h, i) => ({ h, d: details[i], phone: phoneKey(details[i].phone), domain: domainKey(details[i].website) }));
  const phones = keyed.map((k) => k.phone).filter((v): v is string => Boolean(v));
  const domains = keyed.map((k) => k.domain).filter((v): v is string => Boolean(v));
  const taken = new Set<string>();
  if (phones.length || domains.length) {
    const existing = await db
      .select({ phone: prospects.phoneKey, domain: prospects.domain })
      .from(prospects)
      .where(or(phones.length ? inArray(prospects.phoneKey, phones) : undefined, domains.length ? inArray(prospects.domain, domains) : undefined));
    for (const row of existing) {
      if (row.phone) taken.add(`p:${row.phone}`);
      if (row.domain) taken.add(`d:${row.domain}`);
    }
  }
  const unique = keyed.filter((k) => {
    if ((k.phone && taken.has(`p:${k.phone}`)) || (k.domain && taken.has(`d:${k.domain}`))) return false;
    if (k.phone) taken.add(`p:${k.phone}`);
    if (k.domain) taken.add(`d:${k.domain}`);
    return true;
  });

  const inserted = unique.length
    ? await db
        .insert(prospects)
        .values(
          unique.map(({ h, d, phone, domain }) => {
            return {
              phoneKey: phone,
              domain,
              placeId: h.placeId,
              niche: job.niche,
              market: job.market,
              name: h.name,
              phone: d.phone,
              website: d.website,
              address: h.address,
              city: d.city,
              state: h.state,
              rating: h.rating,
              reviewCount: h.reviewCount,
              enrichStatus: !d.website ? ("no_site" as const) : SOCIAL.test(d.website) ? ("social" as const) : ("pending" as const),
            };
          }),
        )
        .onConflictDoNothing()
        .returning({ id: prospects.id })
    : [];

  // Learn the city centre from the first results, so the suburb searches can be planned.
  let { centerLat, centerLng } = job;
  if (centerLat === null || centerLng === null) {
    const pts = inState.filter((h) => h.lat !== null && h.lng !== null);
    centerLat = median(pts.map((h) => h.lat!));
    centerLng = median(pts.map((h) => h.lng!));
  }

  let { queryIndex } = job;
  const pageToken = page.nextPageToken;
  if (!pageToken) queryIndex += 1;
  const dry = inserted.length ? 0 : job.dry + 1;
  const found = job.found + inserted.length;
  const planLength = planFor({ ...job, centerLat, centerLng }).length;
  const finished = dry >= DRY_LIMIT || queryIndex >= planLength;
  await db
    .update(harvestJobs)
    .set({ queryIndex, pageToken, found, dry, centerLat, centerLng, requests: job.requests + 1, status: finished ? "done" : "queued", updatedAt: new Date() })
    .where(eq(harvestJobs.id, jobId));
  log.push(
    `${nicheLabel(job.niche)} · ${job.market}: +${inserted.length} new (${found} total${finished ? " — Google has no more here" : ""})`,
  );
  return finished;
}

async function claimProspects(limit: number): Promise<Prospect[]> {
  const db = await getDb();
  const ids = rowsOf<{ id: number }>(
    await db.execute(sql`
      UPDATE prospects SET enrich_status = 'working', claimed_at = now()
      WHERE id IN (
        SELECT id FROM prospects
        WHERE enrich_status = 'pending' OR (enrich_status = 'working' AND claimed_at < now() - interval '3 minutes')
        ORDER BY id LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id`),
  ).map((r) => r.id);
  if (!ids.length) return [];
  return db.select().from(prospects).where(inArray(prospects.id, ids));
}

/** Opens the homepage once: weakness score + email (checks the contact page too if needed). */
async function enrichProspect(p: Prospect): Promise<"email" | "done" | "failed"> {
  const db = await getDb();
  const page = await fetchHomepage(p.website!, 8000);
  if (!page.ok) {
    await db
      .update(prospects)
      .set({ enrichStatus: "failed", siteIssues: [page.error], enrichedAt: new Date() })
      .where(eq(prospects.id, p.id));
    return "failed";
  }
  const check = analyzeSite(page);
  const { email, emails } = await fetchEmailsFrom(page.html, page.finalUrl);
  await db
    .update(prospects)
    .set({ siteScore: check.score, siteIssues: check.issues, email, emails: emails.slice(0, 6), enrichStatus: "done", enrichedAt: new Date() })
    .where(eq(prospects.id, p.id));
  return email ? "email" : "done";
}

export async function harvestProgress(): Promise<Omit<HarvestProgress, "log" | "idle" | "error">> {
  const db = await getDb();
  const [p] = await db
    .select({
      total: sql<number>`count(*)::int`,
      withWebsite: sql<number>`count(*) filter (where ${prospects.website} is not null)::int`,
      checked: sql<number>`count(*) filter (where ${prospects.enrichStatus} in ('done', 'failed'))::int`,
      toCheck: sql<number>`count(*) filter (where ${prospects.enrichStatus} in ('pending', 'working'))::int`,
      withEmail: sql<number>`count(*) filter (where ${prospects.email} is not null)::int`,
      weak: sql<number>`count(*) filter (where ${prospects.siteScore} >= ${WEAK_SITE_THRESHOLD})::int`,
    })
    .from(prospects);
  const [j] = await db
    .select({
      total: sql<number>`count(*)::int`,
      done: sql<number>`count(*) filter (where ${harvestJobs.status} = 'done')::int`,
      failed: sql<number>`count(*) filter (where ${harvestJobs.status} = 'failed')::int`,
    })
    .from(harvestJobs);
  const [next] = await db
    .select({ niche: harvestJobs.niche, market: harvestJobs.market })
    .from(harvestJobs)
    .where(eq(harvestJobs.status, "queued"))
    .orderBy(asc(harvestJobs.position), asc(harvestJobs.id))
    .limit(1);
  const usage = await monthlyUsage();
  return {
    jobsTotal: j.total,
    jobsDone: j.done,
    jobsFailed: j.failed,
    prospects: p.total,
    withWebsite: p.withWebsite,
    checked: p.checked,
    toCheck: p.toCheck,
    withEmail: p.withEmail,
    weak: p.weak,
    current: next ? `${nicheLabel(next.niche)} · ${next.market}` : null,
    usage,
  };
}

// ─── Browsing ──────────────────────────────────────────────────────────

export type ProspectFilter = {
  niche?: string;
  market?: string;
  email?: "yes" | "no";
  site?: "weak" | "decent" | "none" | "unchecked";
  lead?: "yes" | "no";
  q?: string;
  page?: number;
};

export const PAGE_SIZE = 50;

function whereFor(f: ProspectFilter): SQL | undefined {
  const parts: (SQL | undefined)[] = [];
  if (f.niche) parts.push(eq(prospects.niche, f.niche));
  if (f.market) parts.push(eq(prospects.market, f.market));
  if (f.email === "yes") parts.push(isNotNull(prospects.email));
  if (f.email === "no") parts.push(isNull(prospects.email));
  if (f.site === "weak") parts.push(sql`${prospects.siteScore} >= ${WEAK_SITE_THRESHOLD}`);
  if (f.site === "decent") parts.push(sql`${prospects.siteScore} < ${WEAK_SITE_THRESHOLD}`);
  if (f.site === "none") parts.push(inArray(prospects.enrichStatus, ["no_site", "social"]));
  if (f.site === "unchecked") parts.push(inArray(prospects.enrichStatus, ["pending", "working"]));
  if (f.lead === "yes") parts.push(isNotNull(prospects.leadId));
  if (f.lead === "no") parts.push(isNull(prospects.leadId));
  if (f.q) {
    const like = `%${f.q.replace(/[%_]/g, "")}%`;
    parts.push(or(ilike(prospects.name, like), ilike(prospects.website, like), ilike(prospects.email, like)));
  }
  return parts.length ? and(...parts) : undefined;
}

export async function listProspects(f: ProspectFilter, limit = PAGE_SIZE): Promise<{ rows: Prospect[]; total: number }> {
  const db = await getDb();
  const where = whereFor(f);
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(prospects).where(where);
  const rows = await db
    .select()
    .from(prospects)
    .where(where)
    .orderBy(asc(prospects.niche), asc(prospects.market), sql`${prospects.siteScore} desc nulls last`, desc(prospects.reviewCount), asc(prospects.id))
    .limit(limit)
    .offset(Math.max(0, (f.page ?? 1) - 1) * limit);
  return { rows, total };
}

export async function prospectMatrix() {
  const db = await getDb();
  return db
    .select({
      niche: prospects.niche,
      market: prospects.market,
      total: sql<number>`count(*)::int`,
      emails: sql<number>`count(*) filter (where ${prospects.email} is not null)::int`,
      weak: sql<number>`count(*) filter (where ${prospects.siteScore} >= ${WEAK_SITE_THRESHOLD})::int`,
    })
    .from(prospects)
    .groupBy(prospects.niche, prospects.market);
}

// ─── Promote to leads ──────────────────────────────────────────────────

/** Copies the picked businesses into Leads (skipping ones already there). Returns their lead ids. */
export async function promoteProspects(ids: number[]): Promise<{ leadIds: string[]; created: number }> {
  if (!ids.length) return { leadIds: [], created: 0 };
  const db = await getDb();
  const rows = await db.select().from(prospects).where(inArray(prospects.id, ids));
  const leadIds: string[] = [];
  let created = 0;
  for (const p of rows) {
    const niche = nicheFor(p.niche);
    const fields = {
      businessName: p.name,
      trade: niche.trade,
      phone: p.phone,
      website: p.website,
      email: p.email,
      // Ratings below 4.5 stay off the redesigned site.
      rating: (p.rating ?? 0) >= 4.5 ? p.rating : null,
      reviewCount: (p.rating ?? 0) >= 4.5 ? p.reviewCount : null,
      city: p.city ?? p.market.split(",")[0],
      state: p.state ?? p.market.split(",")[1]?.trim() ?? null,
      placeId: p.placeId,
      notes: [`Niche: ${niche.label}`, p.rating ? `Google: ${p.rating}★ (${p.reviewCount ?? 0} reviews)` : null, p.address]
        .filter(Boolean)
        .join(" · "),
    };
    let leadId = await createLead({ ...fields, source: "database", score: scoreLead(fields) });
    if (leadId) {
      created++;
      if (p.enrichStatus === "done") {
        await updateLead(leadId, { siteScore: p.siteScore, siteIssues: p.siteIssues, siteCheckedAt: p.enrichedAt ?? new Date() });
      }
    } else {
      const [existing] = await db.select({ id: leads.id }).from(leads).where(eq(leads.placeId, p.placeId)).limit(1);
      leadId = existing?.id ?? null;
    }
    if (leadId) {
      leadIds.push(leadId);
      await db.update(prospects).set({ leadId }).where(eq(prospects.id, p.id));
    }
  }
  return { leadIds, created };
}

export async function prospectsForExport(f: ProspectFilter): Promise<Prospect[]> {
  return (await listProspects({ ...f, page: 1 }, 20000)).rows;
}
