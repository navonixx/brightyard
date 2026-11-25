"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { sq } from "@/lib/social/db";
import { easternToDate } from "@/lib/social/plan";
import { FORMATS, WEEK_MIX, type Format } from "@/lib/social/strategy";
import { createIdeas, saveStudioSettings, schedule, studioStep, type StepResult } from "@/lib/social/studio";
import { VIDEO_MODELS } from "@/lib/social/modelslab";
import type { ActionState } from "./actions";

const err = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 300);

/** AI writes a week of content (7 pieces), or `count` pieces of one format. */
export async function stPlan(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const kind = String(form.get("format") ?? "week");
  const topic = String(form.get("topic") ?? "").trim().slice(0, 300);
  const count = Math.max(1, Math.min(7, Number(form.get("count")) || 3));
  const mix: Format[] = kind === "week" ? WEEK_MIX : FORMATS.some((f) => f.key === kind) ? Array(count).fill(kind) : WEEK_MIX;
  try {
    const n = (await createIdeas(mix, topic)).length;
    refresh();
    return { ok: true, message: `${n} ideas ready. Check them, then press “Make it” (or “Make all”).` };
  } catch (e) {
    return { message: err(e) };
  }
}

export async function stQueue(id: number): Promise<ActionState> {
  await requireAdmin();
  await sq("UPDATE so_videos SET status = 'queued', error = NULL, not_before = NULL, updated_at = now() WHERE id = $1 AND status IN ('idea','failed')", [id]);
  refresh();
  return { ok: true, message: "Queued — the studio is making it." };
}

export async function stQueueAll(): Promise<ActionState> {
  await requireAdmin();
  const r = await sq("UPDATE so_videos SET status = 'queued', error = NULL, not_before = NULL, updated_at = now() WHERE status = 'idea' RETURNING id");
  refresh();
  return { ok: true, message: `${r.length} queued.` };
}

export async function stDelete(id: number): Promise<ActionState> {
  await requireAdmin();
  await sq("DELETE FROM so_videos WHERE id = $1 AND status IN ('idea','failed','ready','scheduled')", [id]);
  refresh();
  return { ok: true, message: "Deleted." };
}

/** Saves edits to an idea before it's made (hook, prompt, caption…). */
export async function stSaveIdea(id: number, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const f = (k: string, max = 4000) => String(form.get(k) ?? "").slice(0, max);
  await sq(
    "UPDATE so_videos SET title = $2, hook = $3, cta = $4, prompt = $5, duration = $6, caption = $7, hashtags = $8, cover_text = $9, yt_title = $10, yt_description = $11, yt_tags = $12, updated_at = now() WHERE id = $1",
    [id, f("title", 200), f("hook", 120), f("cta", 120), f("prompt"), Math.max(4, Math.min(15, Number(form.get("duration")) || 8)), f("caption"), f("hashtags", 600), f("cover_text", 80), f("yt_title", 100), f("yt_description"), f("yt_tags", 500)],
  );
  refresh();
  return { ok: true, message: "Saved." };
}

export async function stSchedule(id: number, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const when = String(form.get("when") ?? "");
  const at = when ? easternToDate(when) : null;
  const message = await schedule(id, at);
  refresh();
  return { ok: message.startsWith("Scheduled"), message };
}

/** One runner step from the Studio page (moves jobs forward, starts the next queued one). */
export async function stStep(): Promise<StepResult> {
  await requireAdmin();
  return studioStep();
}

export async function stSaveSettings(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const model = String(form.get("model") ?? "");
  await saveStudioSettings({
    model: VIDEO_MODELS.some((m) => m.key === model) ? model : VIDEO_MODELS[0].key,
    cap: Math.max(0, Math.min(500, Number(form.get("cap")) || 0)),
    autoSchedule: form.get("autoSchedule") === "on",
    autoApprove: form.get("autoApprove") === "on",
    postHour: Math.max(6, Math.min(22, Number(form.get("postHour")) || 10)),
    t2vOverride: String(form.get("t2vOverride") ?? "").trim().slice(0, 80),
    i2vOverride: String(form.get("i2vOverride") ?? "").trim().slice(0, 80),
  });
  refresh();
  return { ok: true, message: "Studio settings saved." };
}

/** YouTube tab: remember the link once the Short is uploaded by hand. */
export async function stYoutubeDone(id: number, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const url = String(form.get("url") ?? "").trim();
  if (url && !/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(url)) return { message: "Paste the YouTube link (https://youtube.com/shorts/…)." };
  await sq("UPDATE so_videos SET youtube_url = $2, updated_at = now() WHERE id = $1", [id, url || "uploaded"]);
  // Mark the YouTube part of its feed post as done too.
  await sq(
    "UPDATE so_posts SET results = results || jsonb_build_object('youtube', jsonb_build_object('manual', true, 'url', $2::text, 'at', now()::text)), updated_at = now() WHERE video_id = $1 AND kind = 'feed'",
    [id, url || null],
  );
  refresh();
  return { ok: true, message: "Marked as uploaded." };
}

export async function stYoutubeUndo(id: number): Promise<ActionState> {
  await requireAdmin();
  await sq("UPDATE so_videos SET youtube_url = NULL, updated_at = now() WHERE id = $1", [id]);
  refresh();
  return { ok: true, message: "Moved back to “To upload”." };
}
