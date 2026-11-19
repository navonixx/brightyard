import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  events,
  guideProgress,
  leads,
  settings,
  type Lead,
  type LeadStatus,
  type Trade,
} from "./db/schema";

export function newToken(): string {
  return randomBytes(9).toString("base64url");
}

export async function listLeads(status?: LeadStatus): Promise<Lead[]> {
  const db = await getDb();
  const query = db.select().from(leads);
  const rows = status ? await query.where(eq(leads.status, status)) : await query;
  return rows.sort((a, b) => b.score - a.score || b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getLead(id: string): Promise<Lead | undefined> {
  const db = await getDb();
  const [row] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return row;
}

export async function getLeadByToken(token: string): Promise<Lead | undefined> {
  const db = await getDb();
  const [row] = await db.select().from(leads).where(eq(leads.token, token)).limit(1);
  return row;
}

export type NewLead = {
  businessName: string;
  trade: Trade;
  ownerName?: string | null;
  city?: string | null;
  state?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  placeId?: string | null;
  source: string;
  score: number;
  notes?: string | null;
};

/** Inserts a lead; returns null when the place was already imported. */
export async function createLead(input: NewLead): Promise<string | null> {
  const db = await getDb();
  const id = randomUUID();
  const inserted = await db
    .insert(leads)
    .values({ ...input, id, token: newToken() })
    .onConflictDoNothing({ target: leads.placeId })
    .returning({ id: leads.id });
  if (!inserted.length) return null;
  await logEvent(id, "created", { source: input.source });
  return id;
}

export async function updateLead(id: string, patch: Partial<Lead>): Promise<void> {
  const db = await getDb();
  await db
    .update(leads)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(leads.id, id));
}

export async function deleteLead(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(events).where(eq(events.leadId, id));
  await db.delete(leads).where(eq(leads.id, id));
}

export async function logEvent(
  leadId: string | null,
  type: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const db = await getDb();
  await db.insert(events).values({ leadId, type, data: data ?? null });
}

export async function leadEvents(leadId: string) {
  const db = await getDb();
  return db.select().from(events).where(eq(events.leadId, leadId)).orderBy(desc(events.id)).limit(50);
}

export async function recentActivity(limit = 12) {
  const db = await getDb();
  return db
    .select({
      id: events.id,
      type: events.type,
      data: events.data,
      createdAt: events.createdAt,
      leadId: events.leadId,
      businessName: leads.businessName,
    })
    .from(events)
    .leftJoin(leads, eq(events.leadId, leads.id))
    .where(sql`${events.type} <> 'created'`)
    .orderBy(desc(events.id))
    .limit(limit);
}

export async function pipelineStats() {
  const db = await getDb();
  const rows = await db
    .select({ status: leads.status, count: sql<number>`count(*)::int` })
    .from(leads)
    .groupBy(leads.status);
  const [money] = await db
    .select({
      earned: sql<number>`coalesce(sum(${leads.paidAmount}), 0)::int`,
      promised: sql<number>`coalesce(sum(${leads.offerAmount}) filter (where ${leads.status} = 'interested'), 0)::int`,
      views: sql<number>`coalesce(sum(${leads.viewCount}), 0)::int`,
      viewedLeads: sql<number>`count(*) filter (where ${leads.viewCount} > 0)::int`,
      emailed: sql<number>`count(*) filter (where ${leads.emailedAt} is not null)::int`,
    })
    .from(leads);
  const byStatus = Object.fromEntries(rows.map((r) => [r.status, r.count])) as Partial<
    Record<LeadStatus, number>
  >;
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  return { byStatus, total, ...money };
}

/** Leads that opened their preview but haven't replied — the hottest follow-ups. */
export async function hotLeads(limit = 6): Promise<Lead[]> {
  const db = await getDb();
  return db
    .select()
    .from(leads)
    .where(and(eq(leads.status, "viewed")))
    .orderBy(desc(leads.viewCount), desc(leads.lastViewedAt))
    .limit(limit);
}

/** Leads marked as emailed since local midnight (server time). */
export async function emailedToday(): Promise<number> {
  const db = await getDb();
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(leads)
    .where(sql`${leads.emailedAt} >= ${since.toISOString()}`);
  return row?.n ?? 0;
}

// ─── Guide progress ────────────────────────────────────────────────────

export async function guideState(): Promise<Record<string, boolean>> {
  const db = await getDb();
  const rows = await db.select().from(guideProgress);
  return Object.fromEntries(rows.map((r) => [r.stepId, r.done]));
}

export async function setGuideStep(stepId: string, done: boolean): Promise<void> {
  const db = await getDb();
  await db
    .insert(guideProgress)
    .values({ stepId, done, doneAt: done ? new Date() : null })
    .onConflictDoUpdate({
      target: guideProgress.stepId,
      set: { done, doneAt: done ? new Date() : null },
    });
}

// ─── Settings ──────────────────────────────────────────────────────────

export type AppSettings = {
  startDate: string;
  goalUsd: number;
  senderName: string;
  senderEmail: string;
  businessAddress: string;
  paypalLink: string;
};

const DEFAULTS: AppSettings = {
  startDate: "",
  goalUsd: 100,
  senderName: "",
  senderEmail: "",
  businessAddress: "",
  paypalLink: "",
};

export async function getSettings(): Promise<AppSettings> {
  const db = await getDb();
  const rows = await db.select().from(settings);
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    startDate: map.startDate ?? DEFAULTS.startDate,
    goalUsd: Number(map.goalUsd ?? DEFAULTS.goalUsd) || DEFAULTS.goalUsd,
    senderName: map.senderName ?? DEFAULTS.senderName,
    senderEmail: map.senderEmail ?? DEFAULTS.senderEmail,
    businessAddress: map.businessAddress ?? DEFAULTS.businessAddress,
    paypalLink: map.paypalLink ?? DEFAULTS.paypalLink,
  };
}

export async function saveSettings(values: Partial<Record<keyof AppSettings, string>>): Promise<void> {
  const db = await getDb();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } });
  }
}

/** A single internal setting outside the Settings form (counters, limits). */
export async function saveSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}

// ─── Follow-ups ────────────────────────────────────────────────────────

export type FollowUp = { lead: Lead; step: 1 | 2; daysSince: number };

/** Leads emailed 3+ days ago (step 1) or 7+ days ago (step 2) that haven't replied. */
export async function followUpsDue(now: number): Promise<FollowUp[]> {
  const db = await getDb();
  const waiting = await db
    .select()
    .from(leads)
    .where(sql`${leads.emailedAt} is not null and ${leads.status} in ('emailed', 'viewed')`);
  if (!waiting.length) return [];
  const sent = await db
    .select({ leadId: events.leadId, n: sql<number>`count(*)::int` })
    .from(events)
    .where(eq(events.type, "followup"))
    .groupBy(events.leadId);
  const count = new Map(sent.map((r) => [r.leadId, r.n]));

  const due: FollowUp[] = [];
  for (const lead of waiting) {
    const daysSince = Math.floor((now - lead.emailedAt!.getTime()) / 86_400_000);
    const done = count.get(lead.id) ?? 0;
    if (done === 0 && daysSince >= 3) due.push({ lead, step: 1, daysSince });
    else if (done === 1 && daysSince >= 7) due.push({ lead, step: 2, daysSince });
  }
  return due.sort((a, b) => b.lead.viewCount - a.lead.viewCount);
}
