import "server-only";
import { bump, getSetting, month, one } from "../db";
import { nameKey, type NewLead } from "../leads";
import { nicheByKey } from "../niches";

const BASE = "https://maps.googleapis.com/maps/api/place";

/**
 * Google Places (legacy API) — the most accurate listings plus rating and review count.
 * It costs money after Google's free monthly calls, so it only runs within the monthly
 * limit set in Settings (0 = off). Businesses already found elsewhere skip the paid lookup.
 */
export async function runGoogle(params: { city: string; state: string; niche: string }): Promise<{ leads: NewLead[]; note: string }> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY is not set in .env.local");
  const cap = Number(await getSetting("googleLookupCap", "0"));
  const used = () => getSetting(`google:lookups:${month()}`, "0").then(Number);
  if (cap <= 0) throw new Error("Google is switched off — set a monthly lookup limit in Settings first");
  if ((await used()) >= cap) throw new Error(`Google monthly limit reached (${cap}) — resumes next month`);

  const niche = nicheByKey.get(params.niche);
  const phrases = niche?.google ?? [params.niche];
  type Hit = { place_id: string; name: string; formatted_address?: string; rating?: number; user_ratings_total?: number; business_status?: string; geometry?: { location: { lat: number; lng: number } } };
  const hits = new Map<string, Hit>();
  for (const phrase of phrases) {
    let token: string | null = null;
    for (let page = 0; page < 3; page++) {
      const p = new URLSearchParams({ key, region: "us" });
      if (token) p.set("pagetoken", token);
      else p.set("query", `${phrase} in ${params.city}, ${params.state}`);
      let data: { status: string; error_message?: string; results?: Hit[]; next_page_token?: string } = { status: "" };
      for (let attempt = 0; attempt < 3; attempt++) {
        data = await fetch(`${BASE}/textsearch/json?${p}`, { cache: "no-store", signal: AbortSignal.timeout(15000) }).then((r) => r.json());
        if (!(token && data.status === "INVALID_REQUEST")) break;
        await new Promise((r) => setTimeout(r, 2000));
      }
      await bump(`google:searches:${month()}`);
      if (data.status === "ZERO_RESULTS") break;
      if (data.status !== "OK") throw new Error(data.error_message || `Google error: ${data.status}`);
      for (const r of data.results ?? []) {
        const st = r.formatted_address?.match(/,\s*([A-Z]{2})\s+\d{5}/)?.[1];
        if (r.business_status !== "CLOSED_PERMANENTLY" && (!st || st === params.state)) hits.set(r.place_id, r);
      }
      token = data.next_page_token ?? null;
      if (!token) break;
      await new Promise((r) => setTimeout(r, 1800));
    }
  }

  const leads: NewLead[] = [];
  let skipped = 0;
  for (const h of hits.values()) {
    const known =
      (await one("SELECT 1 FROM le_leads WHERE source = 'google' AND source_id = $1", [h.place_id])) ||
      (await one("SELECT 1 FROM le_leads WHERE name_key = $1 AND state = $2", [nameKey(h.name), params.state]));
    const base: NewLead = {
      source: "google",
      sourceId: h.place_id,
      name: h.name,
      niche: params.niche,
      city: params.city,
      state: params.state,
      address: h.formatted_address ?? null,
      lat: h.geometry?.location.lat ?? null,
      lng: h.geometry?.location.lng ?? null,
      rating: h.rating ?? null,
      reviewCount: h.user_ratings_total ?? null,
    };
    if (known) {
      // Free fields only (rating, reviews) — merged into the existing lead, no paid lookup.
      skipped++;
      leads.push(base);
      continue;
    }
    if ((await used()) >= cap) break;
    const d = (await fetch(`${BASE}/details/json?place_id=${encodeURIComponent(h.place_id)}&fields=website,formatted_phone_number&key=${key}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    })
      .then((r) => r.json())
      .catch(() => ({}))) as { result?: { website?: string; formatted_phone_number?: string } };
    await bump(`google:lookups:${month()}`);
    leads.push({ ...base, website: d.result?.website ?? null, phone: d.result?.formatted_phone_number ?? null });
  }
  return { leads, note: `Google: ${hits.size} listings, ${skipped} already known (no paid lookup)` };
}
