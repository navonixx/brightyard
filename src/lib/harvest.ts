import "server-only";
import { and, asc, desc, eq, ilike, inArray, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "./db";
import { harvestJobs, leads, prospects, type Prospect } from "./db/schema";
import { createLead, updateLead } from "./data";
import { nicheFor, nicheLabel } from "./niches";
import { PlacesNewDisabledError, scoreLead, searchPlacesPage, type PlacePage } from "./places";
import { fetchEmailsFrom } from "./emails";
import { analyzeSite, fetchHomepage, WEAK_SITE_THRESHOLD } from "./sitecheck";

/** Searches allowed per calendar month. Google gives ~1,000 Text Search (Enterprise) requests free each month. */
export const DEFAULT_MONTHLY_CAP = 900;
const SOCIAL = /facebook\.com|instagram\.com|yelp\.com|linktr\.ee|nextdoor\.com|business\.site|google\.com/i;

const rowsOf = <T>(result: unknown): T[] => (Array.isArray(result) ? result : ((result as { rows?: T[] }).rows ?? [])) as T[];
const monthKey = (now = new Date()) => `placesRequests:${now.toISOString().slice(0, 7)}`;

// ─── Queue ─────────────────────────────────────────────────────────────

/** Adds one search per niche × city, worked niche by niche (every city of niche 1, then niche 2, …). */
export async function queueHarvest(niches: string[], markets: string[], target: number): Promise<number> {
  const db = await getDb();
  const [{ max }] = rowsOf<{ max: number | null }>(await db.execute(sql`SELECT max(position)::int AS max FROM harvest_jobs`));
  const base = (max ?? 0) + 1;
  const values = niches.flatMap((niche, i) =>
    markets.map((market, j) => ({ niche, market, target, position: base + i * markets.length + j })),
  );
  if (!values.length) return 0;
  const inserted = await db.insert(harvestJobs).values(values).onConflictDoNothing().returning({ id: harvestJobs.id });
  return inserted.length;
}

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

export async function monthlyUsage(): Promise<{ used: number; cap: number }> {
  const db = await getDb();
  const rows = rowsOf<{ key: string; value: string }>(
    await db.execute(sql`SELECT key, value FROM settings WHERE key IN (${monthKey()}, 'harvestMonthlyCap')`),
  );
  const get = (k: string) => rows.find((r) => r.key === k)?.value;
  return { used: Number(get(monthKey()) ?? 0) || 0, cap: Number(get("harvestMonthlyCap") ?? DEFAULT_MONTHLY_CAP) || DEFAULT_MONTHLY_CAP };
}

async function countRequest(): Promise<void> {
  const db = await getDb();
  await db.execute(
    sql`INSERT INTO settings (key, value) VALUES (${monthKey()}, '1')
        ON CONFLICT (key) DO UPDATE SET value = ((settings.value)::int + 1)::text`,
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
  used: number;
  cap: number;
  idle: boolean;
  log: string[];
  error?: string;
};

/**
 * One slice of work (well under a minute): up to two Google pages for the next search in the queue,
 * then opens a batch of found websites to score them and look for an email address.
 * Safe to call from several tabs at once — work is claimed with row locks.
 */
export async function harvestStep({ search = true }: { search?: boolean } = {}): Promise<HarvestProgress> {
  const log: string[] = [];
  let error: string | undefined;

  const usage = await monthlyUsage();
  const jobId = search && usage.used < usage.cap ? await claimJob() : null;
  if (search && usage.used >= usage.cap && (await hasQueuedJobs())) {
    error = `Paused: this month's Google search limit (${usage.cap}) is used up. Searches resume next month, or raise the limit below (searches past Google's free ~1,000 a month are billed to your Google account).`;
  }

  if (jobId) {
    try {
      for (let i = 0; i < 2; i++) {
        if ((await monthlyUsage()).used >= usage.cap) break;
        const done = await runJobPage(jobId, log);
        if (done) break;
      }
    } catch (e) {
      if (e instanceof PlacesNewDisabledError) {
        error = e.message;
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

  const batch = await claimProspects(jobId ? 14 : 24);
  if (batch.length) {
    const results = await Promise.all(batch.map((p) => enrichProspect(p).catch(() => "failed" as const)));
    const emails = results.filter((r) => r === "email").length;
    log.push(`Opened ${batch.length} websites · ${emails} email${emails === 1 ? "" : "s"} found`);
  }

  const progress = await harvestProgress();
  // Idle = nothing was left to claim (or another tab holds the last of it).
  return { ...progress, log, error, idle: !jobId && !batch.length };
}

async function hasQueuedJobs(): Promise<boolean> {
  const db = await getDb();
  const [row] = await db.select({ id: harvestJobs.id }).from(harvestJobs).where(eq(harvestJobs.status, "queued")).limit(1);
  return Boolean(row);
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

/** Runs the next Google page of a search. Returns true when the search is finished. */
async function runJobPage(jobId: number, log: string[]): Promise<boolean> {
  const db = await getDb();
  const [job] = await db.select().from(harvestJobs).where(eq(harvestJobs.id, jobId)).limit(1);
  if (!job || job.status !== "queued") return true;
  const niche = nicheFor(job.niche);
  const query = `${niche.queries[job.queryIndex]} in ${job.market}`;

  let page: PlacePage;
  try {
    page = await searchPlacesPage(query, job.pageToken);
  } catch (e) {
    // An expired page token just ends that query; anything else bubbles up.
    if (job.pageToken && !(e instanceof PlacesNewDisabledError)) page = { places: [], nextPageToken: null };
    else throw e;
  }
  await countRequest();

  const marketState = job.market.split(",")[1]?.trim().toUpperCase();
  const fresh = page.places.filter((p) => !marketState || !p.state || p.state.toUpperCase() === marketState);
  const inserted = fresh.length
    ? await db
        .insert(prospects)
        .values(
          fresh.map((p) => ({
            placeId: p.placeId,
            niche: job.niche,
            market: job.market,
            name: p.name,
            phone: p.phone,
            website: p.website,
            address: p.address,
            city: p.city,
            state: p.state,
            rating: p.rating,
            reviewCount: p.reviewCount,
            enrichStatus: !p.website ? ("no_site" as const) : SOCIAL.test(p.website) ? ("social" as const) : ("pending" as const),
          })),
        )
        .onConflictDoNothing()
        .returning({ id: prospects.id })
    : [];

  let { queryIndex } = job;
  let pageToken: string | null = page.nextPageToken;
  if (!pageToken) {
    queryIndex += 1;
    pageToken = null;
  }
  const found = job.found + inserted.length;
  const finished = found >= job.target || queryIndex >= niche.queries.length;
  await db
    .update(harvestJobs)
    .set({ queryIndex, pageToken, found, requests: job.requests + 1, status: finished ? "done" : "queued", updatedAt: new Date() })
    .where(eq(harvestJobs.id, jobId));
  log.push(`${niche.label} · ${job.market}: +${inserted.length} new (${found}${finished ? " — done" : ` of ~${job.target}`})`);
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
    used: usage.used,
    cap: usage.cap,
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
