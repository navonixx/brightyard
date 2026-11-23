import "server-only";
import { one, q } from "../db";

export type BBox = { s: number; n: number; w: number; e: number };

/** City bounding box from OpenStreetMap's free geocoder (cached forever; 1 request per city). */
export async function cityBox(city: string, state: string): Promise<BBox> {
  const key = `${city}, ${state}`.toLowerCase();
  const cached = await one<{ bbox: BBox }>("SELECT bbox FROM le_geo WHERE key = $1", [key]);
  if (cached) return cached.bbox;
  const params = new URLSearchParams({ city, state, country: "USA", format: "jsonv2", limit: "1" });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { "User-Agent": "LeadEngine/0.1 (local business research tool)" },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  const data = (await res.json()) as { boundingbox?: string[] }[];
  const bb = data[0]?.boundingbox;
  if (!bb) throw new Error(`Couldn't find ${city}, ${state} on the map`);
  const [s, n, w, e] = bb.map(Number);
  // Very small boxes (a point) get ~12 km of room; huge ones are capped around the centre.
  const cy = (s + n) / 2;
  const cx = (w + e) / 2;
  const half = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v / 2));
  const hy = half(n - s, 0.11, 0.35);
  const hx = half(e - w, 0.14, 0.45);
  const box = { s: cy - hy, n: cy + hy, w: cx - hx, e: cx + hx };
  await q("INSERT INTO le_geo (key, bbox) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO NOTHING", [key, JSON.stringify(box)]);
  await new Promise((r) => setTimeout(r, 1100)); // Nominatim allows 1 request a second
  return box;
}
