"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { writeCaption } from "@/lib/social/captions";
import { sq, type Asset, type Post } from "@/lib/social/db";
import { libraryById } from "@/lib/social/library";
import { easternToDate, planWeek } from "@/lib/social/plan";
import { publishDue, publishPost } from "@/lib/social/publish";
import type { ActionState } from "./actions";

export async function soPlanWeek(): Promise<ActionState> {
  await requireAdmin();
  const n = await planWeek();
  refresh();
  return { ok: true, message: `${n} posts planned for the next 7 days (drafts). Read each one and press Approve.` };
}

export async function soCaption(assetId: string, idea: string): Promise<{ caption: string; hashtags: string }> {
  await requireAdmin();
  const { caption, hashtags } = await writeCaption(libraryById.get(assetId), idea.slice(0, 500));
  return { caption, hashtags };
}

function readPost(form: FormData) {
  const assets: Asset[] = form
    .getAll("asset")
    .map(String)
    .map((id) => libraryById.get(id))
    .filter(Boolean)
    .slice(0, 10)
    .map((i) => ({ src: i!.src, kind: i!.kind, poster: i!.poster, label: i!.label }));
  const platforms = form.getAll("platform").map(String).filter((p) => ["instagram", "facebook", "youtube"].includes(p));
  const when = easternToDate(String(form.get("when") ?? ""));
  return {
    idea: String(form.get("idea") ?? "").slice(0, 500) || null,
    caption: String(form.get("caption") ?? "").slice(0, 2200),
    hashtags: String(form.get("hashtags") ?? "").slice(0, 600),
    assets,
    platforms: platforms.length ? platforms : ["instagram", "facebook"],
    when,
    status: form.get("approve") ? "approved" : "draft",
  };
}

export async function soSavePost(id: number | null, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const p = readPost(form);
  if (!p.assets.length) return { message: "Pick at least one photo or video." };
  if (!p.caption.trim()) return { message: "Write or generate a caption first." };
  if (p.assets.some((a) => a.kind === "video") && p.assets.length > 1 && p.platforms.includes("youtube")) return { message: "YouTube Shorts takes one video only." };
  const args = [p.idea, p.caption, p.hashtags, JSON.stringify(p.assets), `{${p.platforms.join(",")}}`, p.when?.toISOString() ?? null, p.status];
  if (id) await sq("UPDATE so_posts SET idea=$1, caption=$2, hashtags=$3, assets=$4::jsonb, platforms=$5::text[], scheduled_for=$6, status=$7, updated_at=now() WHERE id=$8", [...args, id]);
  else await sq("INSERT INTO so_posts (idea, caption, hashtags, assets, platforms, scheduled_for, status) VALUES ($1,$2,$3,$4::jsonb,$5::text[],$6,$7)", args);
  redirect("/admin/social");
}

export async function soSetStatus(id: number, status: "draft" | "approved"): Promise<ActionState> {
  await requireAdmin();
  await sq("UPDATE so_posts SET status = $2, updated_at = now() WHERE id = $1 AND status IN ('draft','approved','failed')", [id, status]);
  refresh();
  return { ok: true, message: status === "approved" ? "Approved." : "Back to draft." };
}

export async function soDelete(id: number): Promise<ActionState> {
  await requireAdmin();
  await sq("DELETE FROM so_posts WHERE id = $1", [id]);
  refresh();
  return { ok: true, message: "Deleted." };
}

export async function soMarkPosted(id: number): Promise<ActionState> {
  await requireAdmin();
  const [post] = await sq<Post>("SELECT * FROM so_posts WHERE id = $1", [id]);
  if (!post) return { message: "Post not found." };
  const results = { ...(post.results ?? {}) };
  for (const p of post.platforms) results[p] ??= { manual: true, at: new Date().toISOString() };
  await sq("UPDATE so_posts SET status = 'posted', results = $2::jsonb, error = NULL, updated_at = now() WHERE id = $1", [id, JSON.stringify(results)]);
  refresh();
  return { ok: true, message: "Marked as posted." };
}

export async function soPublishNow(id: number): Promise<ActionState> {
  await requireAdmin();
  const [post] = await sq<Post>("SELECT * FROM so_posts WHERE id = $1", [id]);
  if (!post) return { message: "Post not found." };
  const r = await publishPost(post);
  refresh();
  return { ok: r.ok, message: r.message };
}

export async function soPublishDue(): Promise<ActionState> {
  await requireAdmin();
  const lines = await publishDue();
  refresh();
  return { ok: true, message: lines.length ? lines.join(" · ") : "Nothing is due right now." };
}

export async function soConnectMeta(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const appId = String(form.get("appId") ?? "").trim();
  const appSecret = String(form.get("appSecret") ?? "").trim();
  const userToken = String(form.get("userToken") ?? "").trim();
  if (!/^\d{6,}$/.test(appId) || appSecret.length < 16 || userToken.length < 50) return { message: "Paste the App ID (numbers), the App Secret and the access token." };
  const { connectMeta } = await import("@/lib/social/connect");
  try {
    const r = await connectMeta(appId, appSecret, userToken);
    refresh();
    return { ok: true, message: `Connected: Facebook Page “${r.page}” and Instagram @${r.instagram}. Approved posts can now publish automatically.` };
  } catch (e) {
    return { message: e instanceof Error ? e.message.slice(0, 300) : String(e) };
  }
}

export async function soDisconnectMeta(): Promise<ActionState> {
  await requireAdmin();
  const { disconnectMeta } = await import("@/lib/social/connect");
  await disconnectMeta();
  refresh();
  return { ok: true, message: "Disconnected." };
}
