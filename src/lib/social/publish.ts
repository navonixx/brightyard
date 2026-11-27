import "server-only";
import { siteUrl } from "@/lib/brand";
import { sq, type Post } from "./db";

/**
 * Auto-publishing through Meta's official Graph API (Instagram Business + Facebook Page).
 * Credentials come from Social → Account setup → Connect (saved in so_settings), or from the
 * META_PAGE_TOKEN / META_PAGE_ID / META_IG_USER_ID environment variables.
 * YouTube Shorts upload needs Google OAuth and is posted by hand for now.
 */
const GRAPH = "https://graph.facebook.com/v21.0";

export type MetaConfig = { token: string; pageId: string; igId: string; pageName?: string; igUsername?: string };

export async function metaConfig(): Promise<MetaConfig | null> {
  const { META_PAGE_TOKEN: token, META_PAGE_ID: pageId, META_IG_USER_ID: igId } = process.env;
  if (token && pageId && igId) return { token, pageId, igId };
  const rows = await sq<{ key: string; value: string }>("SELECT key, value FROM so_settings WHERE key LIKE 'meta_%'");
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return m.meta_page_token && m.meta_page_id && m.meta_ig_user_id
    ? { token: m.meta_page_token, pageId: m.meta_page_id, igId: m.meta_ig_user_id, pageName: m.meta_page_name, igUsername: m.meta_ig_username }
    : null;
}

export async function metaConnected() {
  return Boolean(await metaConfig());
}

const abs = (src: string) => (src.startsWith("http") ? src : `${siteUrl()}${src}`);

export async function graph(path: string, params: Record<string, string>, method: "POST" | "GET" = "POST", token?: string) {
  const body = new URLSearchParams({ ...params, access_token: token ?? (await metaConfig())?.token ?? "" });
  const res = await fetch(method === "GET" ? `${GRAPH}/${path}?${body}` : `${GRAPH}/${path}`, {
    method,
    body: method === "POST" ? body : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  const data = (await res.json()) as Record<string, unknown> & { error?: { message: string } };
  if (data.error) throw new Error(data.error.message);
  return data;
}

/** Instagram hasn't finished processing a video yet; the container is kept and published next run. */
class StillProcessing extends Error {
  constructor(public container: string) {
    super("Instagram is still processing the video — it will be published on the next run");
  }
}

async function waitForContainer(id: string, tries = 18) {
  for (let i = 0; i < tries; i++) {
    const s = await graph(id, { fields: "status_code" }, "GET");
    if (s.status_code === "FINISHED") return;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new Error("Instagram couldn't process the video");
    await new Promise((r) => setTimeout(r, 2500));
  }
  throw new StillProcessing(id);
}

async function toInstagram(post: Post, text: string, ig: string, pending?: string) {
  const media = post.assets;
  let creation: string;
  if (pending) {
    // A video container made on an earlier run — publish it once Instagram has finished.
    creation = pending;
    await waitForContainer(creation);
  } else if (post.kind === "story") {
    const a = media[0];
    if (!a) throw new Error("A story needs a photo or video");
    creation = String((await graph(`${ig}/media`, a.kind === "video" ? { media_type: "STORIES", video_url: abs(a.src) } : { media_type: "STORIES", image_url: abs(a.src) })).id);
    if (a.kind === "video") await waitForContainer(creation);
  } else if (media.length > 1) {
    const children: string[] = [];
    for (const a of media.slice(0, 10)) {
      const c = await graph(`${ig}/media`, a.kind === "video" ? { media_type: "VIDEO", video_url: abs(a.src), is_carousel_item: "true" } : { image_url: abs(a.src), is_carousel_item: "true" });
      if (a.kind === "video") await waitForContainer(String(c.id));
      children.push(String(c.id));
    }
    creation = String((await graph(`${ig}/media`, { media_type: "CAROUSEL", children: children.join(","), caption: text })).id);
  } else if (media[0]?.kind === "video") {
    // A JPEG cover (the Studio draws one) shows in the profile grid instead of a random frame.
    const cover = media[0].poster && /\.jpe?g($|\?)/i.test(media[0].poster) ? { cover_url: abs(media[0].poster) } : ({} as Record<string, string>);
    creation = String((await graph(`${ig}/media`, { media_type: "REELS", video_url: abs(media[0].src), caption: text, ...cover })).id);
    await waitForContainer(creation);
  } else if (media[0]) {
    creation = String((await graph(`${ig}/media`, { image_url: abs(media[0].src), caption: text })).id);
  } else {
    throw new Error("Instagram needs a photo or video");
  }
  const published = await graph(`${ig}/media_publish`, { creation_id: creation });
  const info = await graph(String(published.id), { fields: "permalink" }, "GET").catch(() => ({}) as Record<string, unknown>);
  return { id: String(published.id), url: (info.permalink as string) ?? undefined };
}

async function toFacebook(post: Post, text: string, page: string) {
  const a = post.assets[0];
  const r = !a
    ? await graph(`${page}/feed`, { message: text })
    : a.kind === "video"
      ? await graph(`${page}/videos`, { file_url: abs(a.src), description: text })
      : await graph(`${page}/photos`, { url: abs(a.src), caption: text });
  const id = String(r.post_id ?? r.id);
  // Ask Facebook for the real link (videos become Reels at /reel/<id>; a bare id doesn't open).
  const info = await graph(String(r.id), { fields: "permalink_url" }, "GET").catch(() => ({}) as Record<string, unknown>);
  const link = typeof info.permalink_url === "string" ? info.permalink_url : a?.kind === "video" ? `/reel/${r.id}/` : `/${id}`;
  return { id, url: link.startsWith("http") ? link : `https://www.facebook.com${link}` };
}

/** Publishes one post to its connected platforms; records results and errors. */
export async function publishPost(post: Post): Promise<{ ok: boolean; message: string }> {
  const cfg = await metaConfig();
  if (!cfg) return { ok: false, message: "Instagram/Facebook aren't connected yet — post it by hand (download + copy caption), then press “Mark posted”." };
  const text = [post.caption, post.hashtags].filter(Boolean).join("\n\n");
  const results = { ...(post.results ?? {}) };
  const errors: string[] = [];
  let waiting = false;
  for (const platform of post.platforms) {
    if (results[platform]?.id || results[platform]?.manual) continue;
    try {
      if (platform === "instagram") results.instagram = { ...(await toInstagram(post, text, cfg.igId, results.instagram?.container)), at: new Date().toISOString() };
      else if (platform === "facebook" && post.kind === "story") continue;
      else if (platform === "facebook") results.facebook = { ...(await toFacebook(post, text, cfg.pageId)), at: new Date().toISOString() };
      else if (platform !== "youtube") errors.push(`${platform}: post by hand for now`);
    } catch (e) {
      if (e instanceof StillProcessing && platform === "instagram") {
        results.instagram = { ...(results.instagram ?? {}), container: e.container };
        waiting = true;
        errors.push(`instagram: ${e.message}`);
      } else {
        errors.push(`${platform}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  const auto = post.platforms.filter((p) => p !== "youtube");
  const allDone = auto.every((p) => results[p]?.id || results[p]?.manual);
  // Still processing → stays approved, so the next run publishes the saved container.
  const failedNow = errors.length && !(waiting && errors.length === 1);
  await sq("UPDATE so_posts SET results = $2::jsonb, status = $3, error = $4, updated_at = now() WHERE id = $1", [
    post.id,
    JSON.stringify(results),
    allDone ? "posted" : failedNow ? "failed" : post.status,
    errors.join(" · ") || null,
  ]);
  return { ok: allDone, message: allDone ? "Posted." : errors.join(" · ") };
}

/** Approved posts whose time has come (used by the daily cron and the “Publish due posts” button). */
export async function publishDue(budgetMs = 30_000): Promise<string[]> {
  const due = await sq<Post>("SELECT * FROM so_posts WHERE status = 'approved' AND scheduled_for <= now() ORDER BY scheduled_for, id LIMIT 8");
  const out: string[] = [];
  const started = Date.now();
  for (const p of due) {
    // Leave room for Instagram's video processing; whatever is left goes out on the next run.
    if (Date.now() - started > budgetMs) break;
    out.push(`#${p.id}: ${(await publishPost(p)).message}`);
  }
  return out;
}
