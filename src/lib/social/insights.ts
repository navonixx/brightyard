import "server-only";
import { sq } from "./db";
import { dateToEastern } from "./plan";
import { graph, metaConfig } from "./publish";
import { FORMATS, PILLARS } from "./strategy";

/**
 * Account analysis: Instagram media insights (views, reach, likes, comments, saves, shares) for
 * our posts, plus followers per day. The planner reads `learnings()` so the next batch leans into
 * what actually works on this account.
 */
export type Metrics = { views?: number; reach?: number; likes?: number; comments?: number; saved?: number; shares?: number; total_interactions?: number };

const FULL = "views,reach,likes,comments,saved,shares,total_interactions";
const BASIC = "reach,likes,comments,saved,shares,total_interactions";

async function mediaInsights(igMediaId: string, token: string): Promise<Metrics | null> {
  for (const metric of [FULL, BASIC]) {
    try {
      const r = (await graph(`${igMediaId}/insights`, { metric }, "GET", token)) as { data?: { name: string; values?: { value: number }[]; total_value?: { value: number } }[] };
      const out: Metrics = {};
      for (const d of r.data ?? []) (out as Record<string, number>)[d.name] = Number(d.values?.[0]?.value ?? d.total_value?.value ?? 0);
      return out;
    } catch {
      /* some metrics don't exist for some media types — try the smaller set */
    }
  }
  return null;
}

/** Refreshes insights for recent posts (each at most every ~20 h) and today's follower count. */
export async function refreshInsights(deadline = Date.now() + 40_000): Promise<string[]> {
  const cfg = await metaConfig();
  if (!cfg) return [];
  const log: string[] = [];
  const posts = await sq<{ id: number; results: Record<string, { id?: string }> }>(
    `SELECT id, results FROM so_posts
     WHERE status = 'posted' AND kind = 'feed' AND results->'instagram'->>'id' IS NOT NULL
       AND updated_at > now() - interval '60 days' AND (metrics_at IS NULL OR metrics_at < now() - interval '20 hours')
     ORDER BY metrics_at NULLS FIRST LIMIT 30`,
  );
  let n = 0;
  for (const p of posts) {
    if (Date.now() > deadline) break;
    const m = await mediaInsights(String(p.results.instagram.id), cfg.token);
    await sq("UPDATE so_posts SET metrics = $2::jsonb, metrics_at = now() WHERE id = $1", [p.id, JSON.stringify(m ? { instagram: m } : { error: "unavailable" })]);
    if (m) n++;
  }
  if (n) log.push(`Insights updated for ${n} posts`);
  const day = dateToEastern(new Date()).slice(0, 10);
  const [has] = await sq("SELECT 1 FROM so_stats WHERE day = $1", [day]);
  if (!has) {
    try {
      const a = (await graph(cfg.igId, { fields: "followers_count,media_count" }, "GET", cfg.token)) as { followers_count?: number; media_count?: number };
      await sq("INSERT INTO so_stats (day, followers, media, raw) VALUES ($1,$2,$3,$4::jsonb) ON CONFLICT (day) DO NOTHING", [day, a.followers_count ?? null, a.media_count ?? null, JSON.stringify(a)]);
      log.push(`Followers today: ${a.followers_count ?? "?"}`);
    } catch (e) {
      log.push(`Couldn't read followers: ${e instanceof Error ? e.message : e}`);
    }
  }
  return log;
}

export type Row = { id: number; title: string; format: string; pillar: string; hook: string; when: string | null; url?: string; m: Metrics };
export type Learnings = {
  posts: number;
  followers: { now: number | null; start: number | null; days: number };
  totals: Metrics;
  byFormat: { key: string; label: string; posts: number; avgViews: number; avgReach: number; engagement: number }[];
  byPillar: { key: string; label: string; posts: number; avgViews: number; avgReach: number; engagement: number }[];
  top: Row[];
  text: string;
};

const label = (list: readonly { key: string; label: string }[], k: string) => list.find((x) => x.key === k)?.label ?? k;

/** What's working so far — numbers for the Insights page and a short brief for the planner. */
export async function learnings(): Promise<Learnings> {
  const rows = await sq<{ id: number; title: string; format: string; pillar: string; hook: string; scheduled_for: string | null; results: Record<string, { url?: string }>; metrics: { instagram?: Metrics } }>(
    `SELECT p.id, coalesce(v.title, p.idea) AS title, coalesce(v.format, 'other') AS format, coalesce(v.pillar, 'other') AS pillar, coalesce(v.hook, '') AS hook, p.scheduled_for, p.results, p.metrics
     FROM so_posts p LEFT JOIN so_videos v ON v.id = p.video_id
     WHERE p.kind = 'feed' AND p.metrics ? 'instagram' ORDER BY p.scheduled_for DESC LIMIT 200`,
  );
  const list: Row[] = rows.map((r) => ({ id: r.id, title: r.title ?? "", format: r.format, pillar: r.pillar, hook: r.hook, when: r.scheduled_for, url: r.results?.instagram?.url, m: r.metrics.instagram ?? {} }));
  const views = (m: Metrics) => m.views ?? m.reach ?? 0;
  const eng = (m: Metrics) => (m.reach ? (m.total_interactions ?? (m.likes ?? 0) + (m.comments ?? 0) + (m.saved ?? 0) + (m.shares ?? 0)) / m.reach : 0);
  const group = (key: "format" | "pillar", names: readonly { key: string; label: string }[]) => {
    const map = new Map<string, Row[]>();
    for (const r of list) map.set(r[key], [...(map.get(r[key]) ?? []), r]);
    return [...map.entries()]
      .map(([k, rs]) => ({
        key: k,
        label: label(names, k),
        posts: rs.length,
        avgViews: Math.round(rs.reduce((s, r) => s + views(r.m), 0) / rs.length),
        avgReach: Math.round(rs.reduce((s, r) => s + (r.m.reach ?? 0), 0) / rs.length),
        engagement: Math.round((rs.reduce((s, r) => s + eng(r.m), 0) / rs.length) * 1000) / 10,
      }))
      .sort((a, b) => b.avgViews - a.avgViews);
  };
  const totals = list.reduce<Metrics>((t, r) => {
    for (const k of ["views", "reach", "likes", "comments", "saved", "shares"] as const) t[k] = (t[k] ?? 0) + (r.m[k] ?? 0);
    return t;
  }, {});
  const stats = await sq<{ d: string; followers: number | null }>("SELECT to_char(day, 'YYYY-MM-DD') AS d, followers FROM so_stats WHERE followers IS NOT NULL ORDER BY 1");
  const followers = { now: stats.at(-1)?.followers ?? null, start: stats[0]?.followers ?? null, days: stats.length };
  const byFormat = group("format", FORMATS);
  const byPillar = group("pillar", PILLARS);
  const top = [...list].sort((a, b) => views(b.m) - views(a.m)).slice(0, 5);
  const text = list.length
    ? [
        `${list.length} posts measured. Followers ${followers.start ?? "?"} → ${followers.now ?? "?"}.`,
        `Formats by average views: ${byFormat.map((f) => `${f.label} ${f.avgViews} (${f.engagement}% engagement, ${f.posts} posts)`).join("; ")}.`,
        `Pillars by average views: ${byPillar.map((f) => `${f.label} ${f.avgViews}`).join("; ")}.`,
        `Best hooks: ${top.filter((t) => t.hook).map((t) => `"${t.hook}" (${views(t.m)} views)`).join("; ") || "not enough data"}.`,
        "Make more of the formats, pillars and hook styles at the top; keep testing one new angle a week.",
      ].join("\n")
    : "";
  return { posts: list.length, followers, totals, byFormat, byPillar, top, text };
}
