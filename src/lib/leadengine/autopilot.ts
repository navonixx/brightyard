import "server-only";
import { CITIES } from "./cities";
import { getSetting, one, q, setSetting } from "./db";
import { NICHES } from "./niches";

/**
 * Autopilot: press Start and the engine walks through US cities by itself.
 * In every city it searches each group of business types (high-value groups first) on
 * Overture, then OpenStreetMap, then moves to the next city — no picking needed.
 */
const FIRST = ["Tulsa|OK", "Omaha|NE", "Wichita|KS", "Knoxville|TN", "Boise|ID", "Oklahoma City|OK", "Little Rock|AR", "Des Moines|IA", "Spokane|WA", "Chattanooga|TN", "Greenville|SC", "Fort Wayne|IN", "Lexington|KY", "Madison|WI", "Albuquerque|NM"];
const ALL = CITIES.map(([c, s]) => `${c}|${s}`);
export const AUTO_CITIES = [...FIRST.filter((c) => ALL.includes(c)), ...ALL.filter((c) => !FIRST.includes(c))].map((v) => {
  const [city, state] = v.split("|");
  return { city, state };
});

const GROUP_ORDER = ["Health", "Professional", "Home services", "B2B", "Auto", "Beauty & fitness", "Food, retail & events"];
const GROUPS = GROUP_ORDER.map((g) => ({ group: g, niches: NICHES.filter((n) => n.group === g).map((n) => n.key) })).filter((g) => g.niches.length);
const PER_CITY = GROUPS.length + 1; // every group on Overture, then one OpenStreetMap pass
export const AUTO_TOTAL = AUTO_CITIES.length * PER_CITY;

function unit(i: number) {
  const { city, state } = AUTO_CITIES[Math.floor(i / PER_CITY)];
  const k = i % PER_CITY;
  if (k < GROUPS.length) {
    const g = GROUPS[k];
    return { source: "overture", label: `Auto · ${city}, ${state} · ${g.group}`, params: { city, state, niches: g.niches }, city, state, what: g.group };
  }
  return { source: "osm", label: `Auto · ${city}, ${state} · OpenStreetMap (all types)`, params: { city, state, niches: NICHES.map((n) => n.key) }, city, state, what: "OpenStreetMap" };
}

/** Queues the next city/business-group search. Returns false when every city is done. */
export async function queueNextAuto(): Promise<boolean> {
  const cursor = Number(await getSetting("autoCursor", "0"));
  if (cursor >= AUTO_TOTAL) return false;
  const u = unit(cursor);
  await setSetting("autoCursor", String(cursor + 1));
  await q("INSERT INTO le_jobs (source, label, params) VALUES ($1, $2, $3::jsonb)", [u.source, u.label, JSON.stringify(u.params)]);
  return true;
}

export async function autoProgress() {
  const cursor = Number(await getSetting("autoCursor", "0"));
  const running = await one<{ label: string }>("SELECT label FROM le_jobs WHERE status IN ('running','queued') ORDER BY id LIMIT 1");
  const cityIndex = Math.min(AUTO_CITIES.length, Math.floor(Math.max(0, cursor - 1) / PER_CITY) + 1);
  return {
    citiesDone: Math.floor(cursor / PER_CITY),
    cityIndex: cursor ? cityIndex : 0,
    cityTotal: AUTO_CITIES.length,
    current: running?.label.replace(/^Auto · /, "") ?? (cursor ? unit(cursor - 1).label.replace(/^Auto · /, "") : null),
    next: cursor < AUTO_TOTAL ? `${unit(cursor).city}, ${unit(cursor).state}` : null,
  };
}
