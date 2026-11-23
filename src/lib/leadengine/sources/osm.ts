import "server-only";
import { NICHES, nicheByKey } from "../niches";
import type { NewLead } from "../leads";
import { cityBox, type BBox } from "./geo";

/** OpenStreetMap (Overpass API) — free, community-mapped businesses with tags for phone, website, email, socials. */
export async function runOsm(params: { city: string; state: string; niches: string[]; box?: BBox }): Promise<{ leads: NewLead[]; note: string }> {
  const niches = (params.niches.length ? params.niches : NICHES.map((n) => n.key)).map((k) => nicheByKey.get(k)!).filter((n) => n?.osm.length);
  if (!niches.length) return { leads: [], note: "None of the chosen business types are tagged in OpenStreetMap" };
  const box = params.box ?? (await cityBox(params.city, params.state));
  const bbox = `(${box.s},${box.w},${box.n},${box.e})`;
  const selectors = niches.flatMap((n) => n.osm.map(([k, v]) => `nwr["${k}"="${v}"]["name"]${bbox};`));
  const query = `[out:json][timeout:25];(${selectors.join("")});out center tags;`;
  // The main Overpass server is often busy; public mirrors take over.
  const MIRRORS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"];
  let res: Response | null = null;
  for (const url of MIRRORS) {
    res = await fetch(url, {
      method: "POST",
      body: "data=" + encodeURIComponent(query),
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "LeadEngine/0.1 (local business research tool)" },
      signal: AbortSignal.timeout(18000),
      cache: "no-store",
    }).catch(() => null);
    if (res?.ok) break;
  }
  if (!res?.ok) throw new Error(`OpenStreetMap is busy (${res?.status ?? "no answer"}) — it will retry later`);
  const data = (await res.json()) as { elements: { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags: Record<string, string> }[] };
  const leads: NewLead[] = [];
  for (const el of data.elements) {
    const t = el.tags;
    const niche = niches.find((n) => n.osm.some(([k, v]) => t[k] === v));
    const socials: Record<string, string> = {};
    if (t["contact:facebook"] || t.facebook) socials.facebook = t["contact:facebook"] || t.facebook;
    if (t["contact:instagram"] || t.instagram) socials.instagram = t["contact:instagram"] || t.instagram;
    const street = [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ");
    leads.push({
      source: "osm",
      sourceId: `${el.type}/${el.id}`,
      name: t.name,
      niche: niche?.key ?? null,
      category: niche ? niche.osm.map(([k, v]) => (t[k] === v ? `${k}=${v}` : "")).filter(Boolean)[0] : null,
      city: t["addr:city"] || params.city,
      state: t["addr:state"]?.length === 2 ? t["addr:state"] : params.state,
      address: [street, t["addr:city"], t["addr:postcode"]].filter(Boolean).join(", ") || null,
      lat: el.lat ?? el.center?.lat ?? null,
      lng: el.lon ?? el.center?.lon ?? null,
      phone: t.phone || t["contact:phone"] || null,
      website: t.website || t["contact:website"] || null,
      email: (t.email || t["contact:email"] || "").toLowerCase() || null,
      socials,
    });
  }
  return { leads, note: `OpenStreetMap: ${data.elements.length} tagged businesses in the ${params.city} area` };
}
