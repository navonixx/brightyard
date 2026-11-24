import "server-only";
import { q } from "@/lib/leadengine/db";

/**
 * Email Tracker: every lead we've emailed — from the Lead Engine and from the main Outreach
 * page — in one list, with what happened next. Opens can't be tracked (emails go out by hand
 * from Gmail, and tracking pixels push cold email into spam), but preview-link views are
 * recorded by our own site, so "looked at the preview" is exact.
 */
export type Stage = "won" | "wants_live" | "replied" | "viewed" | "due" | "waiting" | "lost";

export type TrackedEmail = {
  kind: "le" | "main";
  key: string;
  leadId: string | null;
  name: string;
  email: string | null;
  city: string | null;
  state: string | null;
  sentAt: string;
  followups: number;
  lastFollowUp: string | null;
  views: number;
  lastViewedAt: string | null;
  offer: number | null;
  paid: number;
  stage: Stage;
  next: string;
  href: string;
};

type Row = {
  kind: "le" | "main";
  key: string;
  lead_id: string | null;
  name: string;
  email: string | null;
  city: string | null;
  state: string | null;
  sent_at: Date | string;
  followups: number;
  last_follow_up: Date | string | null;
  le_status: string | null;
  main_status: string | null;
  views: number;
  last_viewed_at: Date | string | null;
  offer_amount: number | null;
  paid: number;
};

const DAY = 86_400_000;
const iso = (v: Date | string | null) => (v ? new Date(v).toISOString() : null);

function stageOf(r: Row, now: number): { stage: Stage; next: string } {
  const st = r.le_status ?? "";
  const ms = r.main_status ?? "";
  if (st === "won" || ms === "won" || Number(r.paid) > 0) return { stage: "won", next: "Deliver the site and connect their domain" };
  if (r.offer_amount != null) return { stage: "wants_live", next: `They chose $${r.offer_amount} — send a PayPal invoice` };
  if (["lost", "skip"].includes(st) || ["lost", "opted_out"].includes(ms)) return { stage: "lost", next: "No further contact" };
  if (st === "replied" || ms === "interested") return { stage: "replied", next: "Answer them — send the preview" };
  if (Number(r.views) > 0) return { stage: "viewed", next: "They looked at the preview — a short check-in" };
  const sent = new Date(r.sent_at).getTime();
  const last = r.last_follow_up ? new Date(r.last_follow_up).getTime() : null;
  if (r.followups === 0 && now - sent >= 3 * DAY) return { stage: "due", next: "Send follow-up 1" };
  if (r.followups === 1 && last && now - last >= 4 * DAY) return { stage: "due", next: "Send the last follow-up" };
  if (r.followups >= 2) return { stage: "waiting", next: "No reply after 2 follow-ups — move on" };
  const nextAt = r.followups === 0 ? sent + 3 * DAY : (last ?? sent) + 4 * DAY;
  return { stage: "waiting", next: `Follow-up ${r.followups + 1} on ${new Date(nextAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` };
}

export async function trackedEmails(): Promise<TrackedEmail[]> {
  const rows = await q<Row>(`
    SELECT 'le'::text AS kind, l.id::text AS key, l.lead_id, l.name, l.email, l.city, l.state, l.contacted_at AS sent_at,
           COALESCE((l.extra->>'followups')::int, 0) AS followups, (l.extra->>'lastFollowUp')::timestamptz AS last_follow_up,
           l.status AS le_status, m.status AS main_status, COALESCE(m.view_count, 0) AS views, m.last_viewed_at,
           m.offer_amount, COALESCE(m.paid_amount, 0) AS paid
      FROM le_leads l LEFT JOIN leads m ON m.id = l.lead_id
     WHERE l.contacted_at IS NOT NULL
    UNION ALL
    SELECT 'main'::text, m.id, m.id, m.business_name, m.email, m.city, m.state, m.emailed_at,
           (SELECT count(*)::int FROM events e WHERE e.lead_id = m.id AND e.type = 'followup'),
           (SELECT max(e.created_at) FROM events e WHERE e.lead_id = m.id AND e.type = 'followup'),
           NULL::text, m.status, m.view_count, m.last_viewed_at, m.offer_amount, m.paid_amount
      FROM leads m
     WHERE m.emailed_at IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM le_leads l WHERE l.lead_id = m.id AND l.contacted_at IS NOT NULL)
     ORDER BY sent_at DESC`);
  const now = Date.now();
  return rows.map((r) => {
    const { stage, next } = stageOf(r, now);
    return {
      kind: r.kind,
      key: r.key,
      leadId: r.lead_id,
      name: r.name,
      email: r.email,
      city: r.city,
      state: r.state,
      sentAt: iso(r.sent_at)!,
      followups: Number(r.followups),
      lastFollowUp: iso(r.last_follow_up),
      views: Number(r.views),
      lastViewedAt: iso(r.last_viewed_at),
      offer: r.offer_amount,
      paid: Number(r.paid),
      stage,
      next,
      href: r.kind === "le" ? `/admin/lead-engine/leads/${r.key}` : `/admin/leads/${r.key}`,
    };
  });
}

/** Sets what happened, on whichever table the lead lives in (and its linked copy). */
export async function setOutcome(kind: "le" | "main", key: string, outcome: "replied" | "won" | "lost" | "contacted") {
  const main: Record<string, string> = { replied: "interested", won: "won", lost: "lost", contacted: "emailed" };
  if (kind === "le") {
    const [row] = await q<{ lead_id: string | null }>("UPDATE le_leads SET status = $2, updated_at = now() WHERE id = $1 RETURNING lead_id", [Number(key), outcome]);
    if (row?.lead_id) await q("UPDATE leads SET status = $2, updated_at = now() WHERE id = $1 AND status <> 'opted_out'", [row.lead_id, main[outcome]]);
  } else {
    await q("UPDATE leads SET status = $2, updated_at = now() WHERE id = $1 AND status <> 'opted_out'", [key, main[outcome]]);
    await q("UPDATE le_leads SET status = $2, updated_at = now() WHERE lead_id = $1", [key, outcome]);
  }
}

/** Emails sent per day for the last 14 days (both sources). */
export async function sentPerDay(): Promise<{ day: string; n: number }[]> {
  const rows = await q<{ day: string; n: number }>(`
    SELECT to_char(d, 'YYYY-MM-DD') AS day, count(x.t)::int AS n
      FROM generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') d
      LEFT JOIN (
        SELECT contacted_at AS t FROM le_leads WHERE contacted_at IS NOT NULL
        UNION ALL
        SELECT m.emailed_at FROM leads m WHERE m.emailed_at IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM le_leads l WHERE l.lead_id = m.id AND l.contacted_at IS NOT NULL)
      ) x ON date_trunc('day', x.t) = d
     GROUP BY d ORDER BY d`);
  return rows.map((r) => ({ day: r.day, n: Number(r.n) }));
}
