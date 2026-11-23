import "server-only";
import { createLead, updateLead } from "@/lib/data";
import { scoreLead } from "@/lib/places";
import type { Trade } from "@/lib/db/schema";
import { one, pgArray, q } from "./db";
import type { Lead } from "./leads";
import { nicheLabel } from "./niches";

const TRADE: Record<string, Trade> = { landscaping: "landscaping", painting: "painting", cleaning: "cleaning" };

/**
 * Copies chosen Lead Engine leads into the app's main Leads list (where previews, outreach
 * and follow-ups already work). The Lead Engine row remembers which lead it became.
 */
export async function sendToLeads(ids: number[]): Promise<{ created: number; already: number }> {
  if (!ids.length) return { created: 0, already: 0 };
  const rows = await q<Lead>("SELECT * FROM le_leads WHERE id = ANY($1::int[])", [pgArray(ids.slice(0, 200))]);
  let created = 0;
  let already = 0;
  for (const l of rows) {
    if (l.lead_id) {
      already++;
      continue;
    }
    const pains = (l.pain_signals ?? []).slice(0, 3).map((p) => p.label);
    const pays = (l.pay_signals ?? []).slice(0, 3).map((p) => p.label);
    const fields = {
      businessName: l.name,
      trade: TRADE[l.niche ?? ""] ?? ("other" as Trade),
      phone: l.phone,
      website: l.website,
      email: l.email,
      rating: (l.rating ?? 0) >= 4.5 ? l.rating : null,
      reviewCount: (l.rating ?? 0) >= 4.5 ? l.review_count : null,
      city: l.city,
      state: l.state,
      placeId: `le:${l.source}:${l.source_id}`,
      notes: [
        `Niche: ${l.kind === "business" ? nicheLabel(l.niche) : (l.category ?? l.kind)}`,
        `From Lead Engine (${l.sources.join(", ")}) · can pay ${l.pay_score} · pain ${l.pain_score}`,
        pains.length ? `Pain: ${pains.join("; ")}` : null,
        pays.length ? `Budget signals: ${pays.join("; ")}` : null,
        l.address,
      ]
        .filter(Boolean)
        .join(" · "),
    };
    let leadId = await createLead({ ...fields, source: "leadengine", score: scoreLead(fields) });
    if (leadId) {
      created++;
      const issues = (l.pain_signals ?? []).map((p) => p.label);
      if (l.website && issues.length) await updateLead(leadId, { siteScore: l.pain_score, siteIssues: issues, siteCheckedAt: new Date() });
    } else {
      const existing = await one<{ id: string }>("SELECT id FROM leads WHERE place_id = $1", [fields.placeId]);
      leadId = existing?.id ?? null;
      already++;
    }
    if (leadId) await q("UPDATE le_leads SET lead_id = $2, updated_at = now() WHERE id = $1", [l.id, leadId]);
  }
  return { created, already };
}
