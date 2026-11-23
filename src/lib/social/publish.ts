import "server-only";
import { siteUrl } from "@/lib/brand";
import { sq, type Post } from "./db";

/**
 * Auto-publishing through Meta's official Graph API (Instagram Business + Facebook Page).
 * Needs META_PAGE_TOKEN (a long-lived Page access token), META_PAGE_ID and META_IG_USER_ID.
 * YouTube Shorts upload needs Google OAuth and is posted by hand for now.
 */
const GRAPH = "https://graph.facebook.com/v21.0";

export function metaConnected() {
  return Boolean(process.env.META_PAGE_TOKEN && process.env.META_PAGE_ID && process.env.META_IG_USER_ID);
}

const abs = (src: string) => (src.startsWith("http") ? src : `${siteUrl()}${src}`);

async function graph(path: string, params: Record<string, string>, method: "POST" | "GET" = "POST") {
  const body = new URLSearchParams({ ...params, access_token: process.env.META_PAGE_TOKEN! });
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

async function waitForContainer(id: string) {
  for (let i = 0; i < 20; i++) {
    const s = await graph(id, { fields: "status_code" }, "GET");
    if (s.status_code === "FINISHED") return;
    if (s.status_code === "ERROR") throw new Error("Instagram couldn't process the video");
    await new Promise((r) => setTimeout(r, 2500));
  }
  throw new Error("Instagram is still processing the video — try again in a minute");
}

async function toInstagram(post: Post, text: string) {
  const ig = process.env.META_IG_USER_ID!;
  const media = post.assets;
  let creation: string;
  if (media.length > 1) {
    const children: string[] = [];
    for (const a of media.slice(0, 10)) {
      const c = await graph(`${ig}/media`, a.kind === "video" ? { media_type: "VIDEO", video_url: abs(a.src), is_carousel_item: "true" } : { image_url: abs(a.src), is_carousel_item: "true" });
      if (a.kind === "video") await waitForContainer(String(c.id));
      children.push(String(c.id));
    }
    creation = String((await graph(`${ig}/media`, { media_type: "CAROUSEL", children: children.join(","), caption: text })).id);
  } else if (media[0]?.kind === "video") {
    creation = String((await graph(`${ig}/media`, { media_type: "REELS", video_url: abs(media[0].src), caption: text })).id);
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

async function toFacebook(post: Post, text: string) {
  const page = process.env.META_PAGE_ID!;
  const a = post.assets[0];
  const r = !a
    ? await graph(`${page}/feed`, { message: text })
    : a.kind === "video"
      ? await graph(`${page}/videos`, { file_url: abs(a.src), description: text })
      : await graph(`${page}/photos`, { url: abs(a.src), caption: text });
  return { id: String(r.post_id ?? r.id), url: `https://www.facebook.com/${String(r.post_id ?? r.id)}` };
}

/** Publishes one post to its connected platforms; records results and errors. */
export async function publishPost(post: Post): Promise<{ ok: boolean; message: string }> {
  if (!metaConnected()) return { ok: false, message: "Instagram/Facebook aren't connected yet — post it by hand (download + copy caption), then press “Mark posted”." };
  const text = [post.caption, post.hashtags].filter(Boolean).join("\n\n");
  const results = { ...(post.results ?? {}) };
  const errors: string[] = [];
  for (const platform of post.platforms) {
    if (results[platform]?.id || results[platform]?.manual) continue;
    try {
      if (platform === "instagram") results.instagram = { ...(await toInstagram(post, text)), at: new Date().toISOString() };
      else if (platform === "facebook") results.facebook = { ...(await toFacebook(post, text)), at: new Date().toISOString() };
      else errors.push(`${platform}: post by hand for now`);
    } catch (e) {
      errors.push(`${platform}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  const auto = post.platforms.filter((p) => p !== "youtube");
  const allDone = auto.every((p) => results[p]?.id || results[p]?.manual);
  await sq("UPDATE so_posts SET results = $2::jsonb, status = $3, error = $4, updated_at = now() WHERE id = $1", [
    post.id,
    JSON.stringify(results),
    allDone ? "posted" : errors.length ? "failed" : post.status,
    errors.join(" · ") || null,
  ]);
  return { ok: allDone, message: allDone ? "Posted." : errors.join(" · ") };
}

/** Approved posts whose time has come (used by the daily cron and the “Publish due posts” button). */
export async function publishDue(): Promise<string[]> {
  const due = await sq<Post>("SELECT * FROM so_posts WHERE status = 'approved' AND scheduled_for <= now() ORDER BY scheduled_for LIMIT 5");
  const out: string[] = [];
  for (const p of due) out.push(`#${p.id}: ${(await publishPost(p)).message}`);
  return out;
}
