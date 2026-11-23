import "server-only";
import { q } from "./db";
import type { Lead } from "./leads";

/**
 * Leads that got the first email but haven't replied: a first follow-up after 3 days,
 * a last one 4 days after that. Marking a lead "replied" (or anything else) stops them.
 */
export async function followUpsDue(): Promise<(Lead & { step: 1 | 2 })[]> {
  const rows = await q<Lead>(
    `SELECT * FROM le_leads
     WHERE status = 'contacted' AND email IS NOT NULL AND (
       (COALESCE((extra->>'followups')::int, 0) = 0 AND contacted_at <= now() - interval '3 days') OR
       (COALESCE((extra->>'followups')::int, 0) = 1 AND (extra->>'lastFollowUp')::timestamptz <= now() - interval '4 days')
     )
     ORDER BY contacted_at LIMIT 30`,
  );
  return rows.map((l) => ({ ...l, step: (Number(l.extra?.followups ?? 0) + 1) as 1 | 2 }));
}

export async function markFollowUpSent(id: number) {
  await q(
    `UPDATE le_leads SET extra = extra || jsonb_build_object('followups', COALESCE((extra->>'followups')::int, 0) + 1, 'lastFollowUp', now()), updated_at = now() WHERE id = $1`,
    [id],
  );
}
