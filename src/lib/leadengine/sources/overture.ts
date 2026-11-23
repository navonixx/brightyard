import "server-only";
import { asyncBufferFromUrl, parquetMetadataAsync, parquetReadObjects, type FileMetaData } from "hyparquet";
import { compressors } from "hyparquet-compressors";
import { NICHES, OVERTURE_TO_NICHE, nicheByKey } from "../niches";
import type { NewLead } from "../leads";
import { cityBox, type BBox } from "./geo";

/**
 * Overture Maps Places — free open data (Meta, Microsoft, Foursquare…), ~70M places with
 * websites, phones, emails and Facebook pages. Read straight from the public S3 Parquet files
 * with a pure-JavaScript reader: only the file footers and the row groups inside the city's box
 * are downloaded (no native modules, so it runs on Vercel too).
 */
const BUCKET = "https://overturemaps-us-west-2.s3.us-west-2.amazonaws.com/";
type PartFile = { url: string; size: number; metadata?: FileMetaData };
const g = globalThis as unknown as { __overture?: { release: string; at: number; files: PartFile[] } };

async function latestRelease(): Promise<string> {
  const cat = (await fetch("https://stac.overturemaps.org/catalog.json", { cache: "no-store", signal: AbortSignal.timeout(15000) }).then((r) => r.json())) as {
    links: { rel: string; href: string }[];
  };
  const ids = cat.links.filter((l) => l.rel === "child").map((l) => l.href.match(/(\d{4}-\d{2}-\d{2}\.\d+)/)?.[1]).filter(Boolean) as string[];
  const id = ids.sort().at(-1);
  if (!id) throw new Error("Couldn't read the Overture release list");
  return id;
}

/** The release's place files with their footers (cached while the server stays warm). */
async function placeFiles(): Promise<{ release: string; files: PartFile[] }> {
  if (g.__overture && Date.now() - g.__overture.at < 12 * 3_600_000) return g.__overture;
  const release = await latestRelease();
  const xml = await fetch(`${BUCKET}?list-type=2&prefix=release/${release}/theme=places/type=place/`, { cache: "no-store", signal: AbortSignal.timeout(15000) }).then((r) => r.text());
  const files = [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)]
    .map((m) => ({ key: m[1].match(/<Key>([^<]+)<\/Key>/)?.[1] ?? "", size: Number(m[1].match(/<Size>(\d+)<\/Size>/)?.[1] ?? 0) }))
    .filter((f) => f.key.endsWith(".parquet") && f.size > 0)
    .map((f) => ({ url: BUCKET + f.key, size: f.size }) as PartFile);
  if (!files.length) throw new Error("Couldn't list the Overture place files");
  await Promise.all(
    files.map(async (f) => {
      f.metadata = await parquetMetadataAsync(await asyncBufferFromUrl({ url: f.url, byteLength: f.size }));
    }),
  );
  g.__overture = { release, at: Date.now(), files };
  return g.__overture;
}

type Row = {
  id: string;
  bbox?: { xmin: number; ymin: number };
  taxonomy?: { primary?: string | null } | null;
  names?: { primary?: string | null } | null;
  websites?: string[] | null;
  phones?: string[] | null;
  emails?: string[] | null;
  socials?: string[] | null;
  addresses?: { freeform?: string | null; locality?: string | null; postcode?: string | null; region?: string | null; country?: string | null }[] | null;
  confidence?: number | null;
  operating_status?: string | null;
};

const SOCIAL = /(facebook|instagram|twitter|x|linkedin|youtube|tiktok)\.com/i;

export async function runOverture(params: { city: string; state: string; niches: string[]; box?: BBox }): Promise<{ leads: NewLead[]; note: string }> {
  const niches = (params.niches.length ? params.niches : NICHES.map((n) => n.key)).map((k) => nicheByKey.get(k)).filter(Boolean);
  const cats = new Set(niches.flatMap((n) => n!.overture));
  const box = params.box ?? (await cityBox(params.city, params.state));
  const { release, files } = await placeFiles();

  // Row groups whose bbox statistics overlap the city (the files are sorted spatially).
  const groups: { file: PartFile; rowStart: number; rowEnd: number }[] = [];
  for (const file of files) {
    let row = 0;
    for (const rg of file.metadata!.row_groups) {
      const stat = (path: string) => rg.columns.find((c) => c.meta_data?.path_in_schema.join(".") === path)?.meta_data?.statistics;
      const xs = stat("bbox.xmin");
      const ys = stat("bbox.ymin");
      const n = Number(rg.num_rows);
      if (xs && ys && Number(xs.max_value) >= box.w && Number(xs.min_value) <= box.e && Number(ys.max_value) >= box.s && Number(ys.min_value) <= box.n) {
        groups.push({ file, rowStart: row, rowEnd: row + n });
      }
      row += n;
    }
  }
  if (groups.length > 40) throw new Error(`That area is too big to read at once (${groups.length} blocks) — pick a smaller city`);

  const rows: Row[] = [];
  for (let i = 0; i < groups.length; i += 6) {
    await Promise.all(
      groups.slice(i, i + 6).map(async (grp) => {
        const file = await asyncBufferFromUrl({ url: grp.file.url, byteLength: grp.file.size });
        const part = (await parquetReadObjects({
          file,
          metadata: grp.file.metadata,
          rowStart: grp.rowStart,
          rowEnd: grp.rowEnd,
          columns: ["id", "bbox", "taxonomy", "names", "websites", "phones", "emails", "socials", "addresses", "confidence", "operating_status"],
          compressors,
        })) as Row[];
        for (const r of part) {
          const b = r.bbox;
          if (!b || b.xmin < box.w || b.xmin > box.e || b.ymin < box.s || b.ymin > box.n) continue;
          if (!cats.has(r.taxonomy?.primary ?? "")) continue;
          if ((r.confidence ?? 0) < 0.5 || ["permanently_closed", "closed"].includes(r.operating_status ?? "")) continue;
          rows.push(r);
        }
      }),
    );
  }

  const leads: NewLead[] = [];
  for (const r of rows) {
    const a = r.addresses?.[0];
    if (a?.country && a.country !== "US") continue;
    const socials: Record<string, string> = {};
    for (const url of r.socials ?? []) {
      const m = url.match(SOCIAL);
      if (m) socials[m[1].toLowerCase()] ??= url;
    }
    const region = String(a?.region ?? "").replace(/^US-/, "");
    leads.push({
      source: "overture",
      sourceId: r.id,
      name: r.names?.primary ?? "",
      niche: OVERTURE_TO_NICHE.get(r.taxonomy?.primary ?? "") ?? null,
      category: r.taxonomy?.primary ?? null,
      city: a?.locality ?? params.city,
      state: region.length === 2 ? region : params.state,
      address: [a?.freeform?.split(",")[0], a?.locality, a?.postcode].filter(Boolean).join(", ") || null,
      lat: r.bbox?.ymin ?? null,
      lng: r.bbox?.xmin ?? null,
      phone: r.phones?.[0] ?? null,
      website: r.websites?.[0] ?? null,
      email: r.emails?.[0]?.toLowerCase() ?? null,
      socials,
    });
  }
  return { leads, note: `Overture ${release}: ${rows.length} matching places in the ${params.city} area` };
}
