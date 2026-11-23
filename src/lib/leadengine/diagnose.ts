import "server-only";
import { getSetting } from "./db";
import { runOverture } from "./sources/overture";
import { runOsm } from "./sources/osm";

export type SourceCheck = { source: string; ok: boolean; detail: string; ms: number };

/** Small read-only queries against every source (nothing is saved) — shows what works on this server. */
export async function checkSources(): Promise<SourceCheck[]> {
  const timed = async (source: string, fn: () => Promise<string>): Promise<SourceCheck> => {
    const t = Date.now();
    try {
      return { source, ok: true, detail: await fn(), ms: Date.now() - t };
    } catch (e) {
      return { source, ok: false, detail: e instanceof Error ? e.message.slice(0, 300) : String(e), ms: Date.now() - t };
    }
  };
  const tulsa = { s: 36.05, n: 36.2, w: -96.05, e: -95.85 }; // fixed box: no geocoding, nothing cached
  const key = process.env.GOOGLE_PLACES_API_KEY;
  return Promise.all([
    timed("Overture Maps", async () => {
      const r = await runOverture({ city: "Tulsa", state: "OK", niches: ["dentist"], box: tulsa });
      return `${r.leads.length} dentists in Tulsa (${r.leads.filter((l) => l.website).length} with website) — not saved`;
    }),
    timed("OpenStreetMap", async () => {
      const r = await runOsm({ city: "Tulsa", state: "OK", niches: ["dentist"], box: tulsa });
      return `${r.leads.length} dentists in Tulsa — not saved`;
    }),
    timed("YouTube", async () => {
      if (!key) throw new Error("No Google key");
      const d = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=roofing&maxResults=1&key=${key}`, { cache: "no-store" }).then((r) => r.json());
      if (d.error) throw new Error(/not been used|disabled|Permission denied/i.test(d.error.message) ? "YouTube Data API v3 is not enabled for this Google key (enable it free in Google Cloud)" : d.error.message);
      return "API works";
    }),
    timed("Google Places", async () => {
      if (!key) throw new Error("No Google key");
      const cap = Number(await getSetting("googleLookupCap", "0"));
      if (!cap) throw new Error("Switched off — set a monthly limit below to use it");
      return `On — limit ${cap.toLocaleString("en-US")} paid lookups a month`;
    }),
    timed("SEC Form D", async () => {
      if (!process.env.SEC_USER_AGENT?.trim()) throw new Error("SEC_USER_AGENT is not set in Vercel → Environment Variables");
      return "Contact set";
    }),
  ]);
}
