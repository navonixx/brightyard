import "server-only";
import { NICHES, OVERTURE_TO_NICHE, nicheByKey } from "../niches";
import type { NewLead } from "../leads";
import { cityBox, type BBox } from "./geo";

/**
 * Overture Maps Places — free open data (Meta, Microsoft, Foursquare…), ~70M places with
 * websites, phones, emails and Facebook pages. Queried straight from the public S3 Parquet
 * files with DuckDB, reading only the row groups inside the city's box.
 */
type Duck = { runAndReadAll: (sql: string) => Promise<{ getRowObjectsJS: () => Record<string, unknown>[] }>; run: (sql: string) => Promise<unknown> };
const g = globalThis as unknown as { __duck?: Promise<Duck>; __overtureRelease?: { id: string; at: number } };

async function duck(): Promise<Duck> {
  g.__duck ??= (async () => {
    const { DuckDBInstance } = await import("@duckdb/node-api");
    const conn = await (await DuckDBInstance.create(":memory:")).connect();
    // Serverless file systems are read-only except /tmp, where DuckDB keeps its extensions.
    if (process.env.VERCEL) await conn.run("SET home_directory='/tmp';");
    await conn.run("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2'; SET enable_object_cache=true;");
    return conn as unknown as Duck;
  })().catch((e) => {
    g.__duck = undefined;
    throw e;
  });
  return g.__duck;
}

async function latestRelease(): Promise<string> {
  if (g.__overtureRelease && Date.now() - g.__overtureRelease.at < 86_400_000) return g.__overtureRelease.id;
  const cat = (await fetch("https://stac.overturemaps.org/catalog.json", { cache: "no-store", signal: AbortSignal.timeout(15000) }).then((r) => r.json())) as {
    links: { rel: string; href: string }[];
  };
  const ids = cat.links.filter((l) => l.rel === "child").map((l) => l.href.match(/(\d{4}-\d{2}-\d{2}\.\d+)/)?.[1]).filter(Boolean) as string[];
  const id = ids.sort().at(-1);
  if (!id) throw new Error("Couldn't read the Overture release list");
  g.__overtureRelease = { id, at: Date.now() };
  return id;
}

const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;
const SOCIAL = /(facebook|instagram|twitter|x|linkedin|youtube|tiktok)\.com/i;

export async function runOverture(params: { city: string; state: string; niches: string[]; box?: BBox }): Promise<{ leads: NewLead[]; note: string }> {
  const niches = (params.niches.length ? params.niches : NICHES.map((n) => n.key)).map((k) => nicheByKey.get(k)).filter(Boolean);
  const cats = niches.flatMap((n) => n!.overture);
  const box = params.box ?? (await cityBox(params.city, params.state));
  const release = await latestRelease();
  const conn = await duck();
  const result = await conn.runAndReadAll(`
    SELECT id, names.primary AS name, taxonomy.primary AS cat, websites[1] AS website, phones[1] AS phone, emails[1] AS email,
           array_to_string(socials, ' ') AS socials, addresses[1].freeform AS street, addresses[1].locality AS city,
           addresses[1].region AS region, addresses[1].postcode AS zip, addresses[1].country AS country,
           bbox.xmin AS lng, bbox.ymin AS lat, confidence
    FROM read_parquet('s3://overturemaps-us-west-2/release/${release}/theme=places/type=place/*', hive_partitioning=1)
    WHERE bbox.xmin BETWEEN ${box.w} AND ${box.e} AND bbox.ymin BETWEEN ${box.s} AND ${box.n}
      AND taxonomy.primary IN (${cats.map(lit).join(",")})
      AND confidence >= 0.5
      AND coalesce(operating_status, 'open') NOT IN ('permanently_closed', 'closed')`);
  const rows = result.getRowObjectsJS();
  const leads: NewLead[] = [];
  for (const r of rows) {
    if (r.country && r.country !== "US") continue;
    const socials: Record<string, string> = {};
    for (const url of String(r.socials ?? "").split(" ").filter(Boolean)) {
      const m = url.match(SOCIAL);
      if (m) socials[m[1].toLowerCase()] ??= url;
    }
    const region = String(r.region ?? "").replace(/^US-/, "");
    leads.push({
      source: "overture",
      sourceId: String(r.id),
      name: String(r.name ?? ""),
      niche: OVERTURE_TO_NICHE.get(String(r.cat)) ?? null,
      category: String(r.cat ?? ""),
      city: (r.city as string) ?? params.city,
      state: region.length === 2 ? region : params.state,
      address: [r.street, r.city, r.zip].filter(Boolean).join(", ") || null,
      lat: Number(r.lat),
      lng: Number(r.lng),
      phone: (r.phone as string) ?? null,
      website: (r.website as string) ?? null,
      email: (r.email as string)?.toLowerCase() ?? null,
      socials,
    });
  }
  return { leads, note: `Overture ${release}: ${rows.length} places in the ${params.city} area` };
}
