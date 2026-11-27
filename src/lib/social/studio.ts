import "server-only";
import { createHmac } from "node:crypto";
import { siteUrl } from "@/lib/brand";
import { sq } from "./db";
import { composeReel } from "./ffmpeg";
import { IMAGE_COST, coverPrompt, imagesReady, makeCollage, makeImage, slidePrompt, thumbPrompt } from "./images";
import { libraryById } from "./library";
import { isRateLimit, stillImage, trackFor } from "./mlmedia";
import { VIDEO_MODELS, clipSeconds, estimateCost, fetchVideo, modelslabReady, submitVideo, type JobState, type VideoModel } from "./modelslab";
import { easternToDate, dateToEastern } from "./plan";
import { overlayReady, overlayUrl, pickLayout, publicUrl, storageReady, textOnImage, uploadToStorage, uploadWithInfo } from "./storage";
import { planIdeas, type Format } from "./strategy";

/**
 * AI Video Studio pipeline:
 *   idea → queued → starting → rendering (ModelsLab) → finishing (ImageKit draws the text) → ready → scheduled
 * Multi-scene reels: 3 stills (Flux) → 3 vertical clips (image-to-video) → ffmpeg joins them with
 * music → ImageKit adds the hook text. Carousels and collages skip the video steps.
 * Vercel has no background workers, so the Studio page's runner, the ModelsLab webhook and the
 * cron runs all call `studioStep()`.
 */
export type Scene = { still: string; motion: string; image?: string; ml_id?: string; fetch?: string; clip?: string; tries?: number; error?: string };

export type Video = {
  id: number;
  status: "idea" | "queued" | "starting" | "rendering" | "stitching" | "finishing" | "ready" | "scheduled" | "failed";
  format: Format;
  pillar: string;
  title: string;
  hook: string;
  cta: string;
  prompt: string;
  image_src: string | null;
  duration: number;
  model: string | null;
  caption: string;
  hashtags: string;
  cover_text: string;
  thumb_prompt: string;
  slides: { headline: string; body: string }[];
  scenes: Scene[];
  music_mood: string | null;
  music_url: string | null;
  slot: Date | string | null;
  auto: boolean;
  yt_title: string;
  yt_description: string;
  yt_tags: string;
  ml_id: string | null;
  ml_fetch: string | null;
  video_url: string | null;
  final_url: string | null;
  cover_url: string | null;
  thumb_url: string | null;
  media: string[];
  cost: string | number;
  tries: number;
  error: string | null;
  scheduled_for: Date | string | null;
  youtube_url: string | null;
  created_at: Date | string;
};

export type StudioSettings = { model: string; cap: number; autoSchedule: boolean; autoApprove: boolean; postHour: number; t2vOverride: string; i2vOverride: string; stills: "flux" | "openai" };

// Wan 2.2 works on the current ModelsLab plan; Seedance needs wallet credit (switch in Studio settings).
export const FALLBACK_MODEL = "wan-2.2";
const DEFAULTS: StudioSettings = { model: "wan-2.2", cap: 15, autoSchedule: true, autoApprove: false, postHour: 10, t2vOverride: "", i2vOverride: "", stills: "flux" };
const STILL_COST = 0.005;
export const VIDEO_FORMATS: Format[] = ["story_reel", "reel", "photo_ad"];
export const isVideoFormat = (f: string) => (VIDEO_FORMATS as string[]).includes(f);

export async function studioSettings(): Promise<StudioSettings> {
  const rows = await sq<{ value: string }>("SELECT value FROM so_settings WHERE key = 'studio'");
  try {
    return { ...DEFAULTS, ...(rows[0] ? JSON.parse(rows[0].value) : {}) };
  } catch {
    return DEFAULTS;
  }
}

export async function saveStudioSettings(s: Partial<StudioSettings>) {
  const next = { ...(await studioSettings()), ...s };
  await sq("INSERT INTO so_settings (key, value) VALUES ('studio', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [JSON.stringify(next)]);
  return next;
}

export const modelFor = (key: string): VideoModel => VIDEO_MODELS.find((m) => m.key === key) ?? VIDEO_MODELS[0];

export async function monthSpent(): Promise<number> {
  const r = await sq<{ n: string | null }>("SELECT sum(cost) n FROM so_videos WHERE created_at >= date_trunc('month', now())");
  return Number(r[0]?.n ?? 0);
}

/** Estimated cost of producing one piece with the current settings. */
export function estimate(v: Pick<Video, "format" | "duration">, s: StudioSettings) {
  if (v.format === "carousel") return 5 * IMAGE_COST;
  if (v.format === "collage") return 0;
  const model = modelFor(s.model);
  if (v.format === "story_reel") return Math.round(3 * ((s.stills === "openai" ? IMAGE_COST : STILL_COST) + estimateCost(model, 5)) * 100) / 100;
  return estimateCost(model, v.duration) + 2 * IMAGE_COST;
}

const abs = publicUrl;
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

// ——— Ideas ———

export async function createIdeas(mix: Format[], topic: string, opts: { learnings?: string; slots?: (Date | null)[]; auto?: boolean } = {}): Promise<number[]> {
  const recent = await sq<{ title: string }>("SELECT title FROM so_videos ORDER BY id DESC LIMIT 40");
  const ideas = await planIdeas(mix, topic, recent.map((r) => r.title), opts.learnings ?? "");
  const ids: number[] = [];
  for (const [n, i] of ideas.entries()) {
    const image = i.format === "photo_ad" ? libraryById.get(i.libraryIds[0])?.src ?? null : null;
    const media = i.format === "collage" ? i.libraryIds.map((id) => libraryById.get(id)?.src).filter(Boolean) : [];
    let scenes: Scene[] = i.format === "story_reel" ? i.scenes.slice(0, 3).map((s) => ({ still: s.still, motion: s.motion })) : [];
    if (i.format === "story_reel" && scenes.length < 3) {
      const base = scenes[0]?.still || i.videoPrompt || i.scene;
      while (scenes.length < 3) scenes = [...scenes, { still: base, motion: ["slow push-in", "gentle orbit", "slow pull-back reveal"][scenes.length] }];
    }
    const slot = opts.slots?.[n] ?? null;
    const [row] = await sq<{ id: number }>(
      `INSERT INTO so_videos (format, pillar, title, hook, cta, prompt, image_src, duration, caption, hashtags, cover_text, thumb_prompt, slides, yt_title, yt_description, yt_tags, media, scenes, music_mood, slot, auto, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,$16,$17::jsonb,$18::jsonb,$19,$20,$21,$22) RETURNING id`,
      [
        i.format,
        i.pillar,
        i.title,
        i.hook,
        i.cta,
        i.videoPrompt,
        image,
        i.format === "story_reel" ? 14 : i.seconds,
        i.caption,
        i.hashtags.map((h) => `#${h.replace(/^#/, "").replace(/\s+/g, "")}`).join(" "),
        i.coverText,
        i.scene,
        JSON.stringify(i.format === "carousel" ? i.slides.slice(0, 6) : []),
        i.ytTitle.slice(0, 100),
        i.ytDescription,
        i.ytTags.join(", "),
        JSON.stringify(media),
        JSON.stringify(scenes),
        i.musicMood,
        slot ? slot.toISOString() : null,
        Boolean(opts.auto),
        opts.auto ? "queued" : "idea",
      ],
    );
    ids.push(row.id);
  }
  return ids;
}

// ——— Production ———

async function fail(id: number, message: string) {
  await sq("UPDATE so_videos SET status = 'failed', error = $2, updated_at = now() WHERE id = $1", [id, message.slice(0, 400)]);
}

/**
 * No webhook by default: ModelsLab shows the webhook URL in its dashboard, and the owner doesn't want
 * our site address there. Jobs are polled instead (cron runs wait for them; the open page polls).
 * Set STUDIO_WEBHOOK=on to send it again.
 */
function webhookUrl() {
  const secret = process.env.CRON_SECRET;
  const site = siteUrl();
  if (process.env.STUDIO_WEBHOOK !== "on" || !secret || !site.startsWith("https://")) return undefined;
  return `${site}/api/social/studio/webhook?t=${webhookToken()}`;
}

export function webhookToken() {
  // v2: the old token (visible in the ModelsLab dashboard) no longer works.
  return createHmac("sha256", process.env.CRON_SECRET ?? "none").update("studio-webhook-v2").digest("hex").slice(0, 32);
}

const isWallet = (m?: string) => /exhausted|fund your wallet|insufficient/i.test(m ?? "");

/** Submits a clip; paid models fall back to the plan's open-source model when the wallet is empty. */
async function submitClip(v: Video, s: StudioSettings, opts: { prompt: string; seconds: number; imageUrl: string | null }): Promise<{ job: JobState; model: VideoModel }> {
  let model = modelFor(s.model);
  // No track_id: it would show our name in the ModelsLab dashboard.
  const send = (m: VideoModel, override?: string) =>
    submitVideo({ prompt: opts.prompt, seconds: opts.seconds, model: m, imageUrl: opts.imageUrl, webhook: webhookUrl(), modelOverride: override });
  let job = await send(model, opts.imageUrl ? s.i2vOverride : s.t2vOverride);
  if (job.status === "error" && isWallet(job.message) && model.key !== FALLBACK_MODEL) {
    model = modelFor(FALLBACK_MODEL);
    job = await send(model);
  }
  return { job, model };
}

async function requeueLater(v: Video, message: string) {
  const wait = message.match(/(\d+)\s*minute/i);
  const minutes = Math.min(60, Number(wait?.[1] ?? 5)) + 0.5;
  await sq("UPDATE so_videos SET status = 'queued', not_before = now() + make_interval(secs => $2), error = $3, updated_at = now() WHERE id = $1", [
    v.id,
    Math.round(minutes * 60),
    `ModelsLab is busy (rate limit) — trying again in about ${Math.ceil(minutes)} min.`,
  ]);
  return `#${v.id}: ModelsLab rate limit — retry in ~${Math.ceil(minutes)} min`;
}

/** Starts one queued piece. */
async function produce(v: Video, s: StudioSettings, deadline: number): Promise<string> {
  const cost = estimate(v, s);
  const spent = await monthSpent();
  if (cost > 0 && spent + cost > s.cap) {
    await sq("UPDATE so_videos SET status = 'idea', error = $2, updated_at = now() WHERE id = $1", [v.id, `Monthly budget reached ($${spent.toFixed(2)} of $${s.cap}). Raise it in settings.`]);
    return `#${v.id}: monthly budget reached`;
  }
  if (!storageReady()) {
    await fail(v.id, "ImageKit isn't configured (IMAGEKIT_PRIVATE_KEY).");
    return `#${v.id}: ImageKit missing`;
  }
  const name = `v${v.id}-${v.format}`;
  try {
    if (v.format === "collage") {
      const url = await makeCollage(v.media, name);
      await sq("UPDATE so_videos SET status = 'ready', media = $2::jsonb, cover_url = $3, error = NULL, updated_at = now() WHERE id = $1", [v.id, JSON.stringify([url]), url]);
      return `#${v.id}: collage ready`;
    }
    if (v.format === "carousel") {
      if (!imagesReady()) throw new Error("OPENAI_API_KEY is needed for carousel slides.");
      const total = v.slides.length;
      const urls = await Promise.all(v.slides.map((sl, i) => makeImage(slidePrompt(i + 1, total, sl.headline, sl.body), "slide", `${name}-${i + 1}`)));
      await sq("UPDATE so_videos SET status = 'ready', media = $2::jsonb, cover_url = $3, cost = $4, error = NULL, updated_at = now() WHERE id = $1", [v.id, JSON.stringify(urls), urls[0], cost]);
      return `#${v.id}: carousel ready (${urls.length} slides)`;
    }
    if (!modelslabReady()) throw new Error("MODELSLAB_API_KEY isn't set yet — add it to .env.local and Vercel.");

    if (v.format === "story_reel") {
      // Scenes are made step by step (stills → clips) by advanceScenes, here and in later ticks.
      await sq("UPDATE so_videos SET status = 'rendering', cost = $2, model = $3, tries = 0, error = NULL, updated_at = now() WHERE id = $1", [v.id, cost, s.model]);
      const fresh = { ...v, status: "rendering" as const, model: s.model };
      const note = await advanceScenes(fresh, s, deadline);
      return `#${v.id}: multi-scene reel started${note ? ` — ${note}` : ""}`;
    }

    // Single clip (text-to-video, or a portfolio photo brought to life).
    const { job, model } = await submitClip(v, s, {
      prompt: v.prompt,
      seconds: v.duration,
      // Portfolio photos are copied to ImageKit first, so ModelsLab only ever sees CDN links.
      imageUrl: v.format === "photo_ad" && v.image_src ? await uploadToStorage(abs(v.image_src), `${name}-src.jpg`) : null,
    });
    if (job.status === "error") {
      if (isRateLimit(job.message)) return requeueLater(v, job.message ?? "");
      throw new Error(`ModelsLab: ${job.message}`);
    }
    await sq("UPDATE so_videos SET status = 'rendering', model = $2, ml_id = $3, ml_fetch = $4, raw_url = $5, cost = $6, duration = $7, tries = 0, error = NULL, updated_at = now() WHERE id = $1", [
      v.id,
      model.key,
      job.id ?? null,
      job.fetchUrl ?? null,
      job.url ?? null,
      estimate(v, { ...s, model: model.key }),
      clipSeconds(model, v.duration),
    ]);
    if (imagesReady()) {
      const [cover, thumb] = await Promise.allSettled([
        makeImage(coverPrompt(v.cover_text || v.hook, v.thumb_prompt), "cover", `${name}-cover`),
        makeImage(thumbPrompt(v.cover_text || v.hook, v.thumb_prompt), "thumb", `${name}-thumb`),
      ]);
      await sq("UPDATE so_videos SET cover_url = $2, thumb_url = $3 WHERE id = $1", [v.id, cover.status === "fulfilled" ? cover.value : null, thumb.status === "fulfilled" ? thumb.value : null]);
    }
    return `#${v.id}: video started (${model.label.split(" · ")[0]}, ${clipSeconds(model, v.duration)}s)`;
  } catch (e) {
    const msg = errText(e);
    if (isRateLimit(msg)) return requeueLater(v, msg);
    await fail(v.id, msg);
    return `#${v.id}: ${msg}`;
  }
}

/**
 * Moves a multi-scene reel forward as far as time allows: draws missing stills, starts missing
 * clips, collects finished clips. Returns a short note (or "" when nothing changed).
 */
async function advanceScenes(v: Video, s: StudioSettings, deadline: number): Promise<string> {
  const scenes: Scene[] = (v.scenes ?? []).map((x) => ({ ...x }));
  const save = () => sq("UPDATE so_videos SET scenes = $2::jsonb, updated_at = now() WHERE id = $1", [v.id, JSON.stringify(scenes)]);
  const notes: string[] = [];
  for (const [i, sc] of scenes.entries()) {
    if (Date.now() > deadline - 20_000) break;
    try {
      if (!sc.image) {
        sc.image =
          s.stills === "openai" && imagesReady()
            ? await makeImage(`Vertical 9:16 photorealistic cinematic photo, no text, no logos: ${sc.still}`, "cover", `v${v.id}-s${i + 1}`)
            : await stillImage(sc.still, `v${v.id}-s${i + 1}`);
        notes.push(`scene ${i + 1} picture`);
        await save();
      }
      if (sc.image && !sc.ml_id && !sc.clip) {
        const { job } = await submitClip(v, s, { prompt: `${sc.motion}. ${sc.still}`.slice(0, 900), seconds: 5, imageUrl: sc.image });
        if (job.status === "error") {
          if (isRateLimit(job.message)) {
            notes.push("ModelsLab busy, will continue");
            break;
          }
          sc.tries = (sc.tries ?? 0) + 1;
          sc.error = job.message;
          if (sc.tries >= 3) throw new Error(`Scene ${i + 1}: ${job.message}`);
        } else if (job.url) {
          sc.clip = job.url;
        } else {
          sc.ml_id = job.id;
          sc.fetch = job.fetchUrl;
          notes.push(`scene ${i + 1} filming`);
        }
        await save();
      } else if (sc.ml_id && !sc.clip) {
        const job = await fetchVideo(sc.ml_id, sc.fetch);
        if (job.status === "success" && job.url) {
          sc.clip = job.url;
          notes.push(`scene ${i + 1} done`);
          await save();
        } else if (job.status === "error" && !isRateLimit(job.message)) {
          // Try that scene again (new job), up to 3 times.
          sc.tries = (sc.tries ?? 0) + 1;
          sc.error = job.message;
          sc.ml_id = undefined;
          sc.fetch = undefined;
          if (sc.tries >= 3) throw new Error(`Scene ${i + 1}: ${job.message}`);
          await save();
        }
      }
    } catch (e) {
      const msg = errText(e);
      if (isRateLimit(msg)) break;
      throw e;
    }
  }
  return notes.join(", ");
}

/** All clips done → join them with music, store, add the hook text, make cover + thumbnail. */
async function stitch(v: Video): Promise<string> {
  const clips = v.scenes.map((x) => x.clip).filter((c): c is string => Boolean(c));
  const music = v.music_url ?? (await trackFor(v.music_mood ?? "upbeat").catch(() => null));
  const { mp4, seconds } = await composeReel({ clips, musicUrl: music, clipSeconds: 5, musicStart: Math.floor(Math.random() * 10) });
  const up = await uploadWithInfo(mp4, `v${v.id}-reel.mp4`);
  const final = overlayUrl(up.url, v.hook, v.cta, seconds, "full");
  const first = v.scenes[0]?.image;
  const cover = first ? textOnImage(first, v.cover_text || v.hook, 1080, 1920) : null;
  const thumb = first ? textOnImage(first, v.cover_text || v.hook, 1280, 720) : null;
  await sq(
    "UPDATE so_videos SET status = 'finishing', video_url = $2, final_url = $3, music_url = $4, duration = $5, cover_url = coalesce(cover_url, $6), thumb_url = coalesce(thumb_url, $7), tries = 0, error = NULL, updated_at = now() WHERE id = $1",
    [v.id, up.url, final, music, Math.round(seconds), cover, thumb],
  );
  return `#${v.id}: ${clips.length} clips joined${music ? " with music" : ""} — adding text`;
}

/** Moves running jobs forward until the deadline. Returns log lines. */
export async function tick(deadline = Date.now() + 45_000): Promise<string[]> {
  const log: string[] = [];
  const s = await studioSettings();
  const rows = await sq<Video & { raw_url: string | null }>("SELECT * FROM so_videos WHERE status IN ('rendering','finishing') ORDER BY updated_at LIMIT 8");
  for (const v of rows) {
    if (Date.now() > deadline - 10_000) break;
    try {
      if (v.status === "rendering" && v.format === "story_reel") {
        // Light lock: webhooks for several clips can arrive at once — only one worker per reel.
        const lock = await sq("UPDATE so_videos SET updated_at = now() WHERE id = $1 AND status = 'rendering' AND updated_at < now() - interval '15 seconds' RETURNING id", [v.id]);
        if (!lock.length) continue;
        const note = await advanceScenes(v, s, deadline);
        if (note) log.push(`#${v.id}: ${note}`);
        const [fresh] = await sq<Video>("SELECT * FROM so_videos WHERE id = $1", [v.id]);
        const allDone = fresh.scenes.length > 0 && fresh.scenes.every((x) => x.clip);
        // Joining takes ~20–60 s on Vercel; only start it with enough time left in this request.
        if (allDone && Date.now() < deadline - 100_000) {
          const claimed = await sq("UPDATE so_videos SET status = 'stitching', updated_at = now() WHERE id = $1 AND status = 'rendering' RETURNING id", [v.id]);
          if (claimed.length) {
            try {
              log.push(await stitch(fresh));
            } catch (e) {
              await sq("UPDATE so_videos SET status = 'rendering' WHERE id = $1 AND status = 'stitching'", [v.id]);
              throw e;
            }
          }
        }
        else if (!note) await sq("UPDATE so_videos SET tries = tries + 1, updated_at = now() WHERE id = $1", [v.id]);
        if (fresh.tries > 400) await fail(v.id, "The scenes took too long. Press Retry.");
      } else if (v.status === "rendering") {
        let url = v.raw_url;
        if (!url) {
          if (!v.ml_id) {
            await fail(v.id, "No ModelsLab job id was returned.");
            continue;
          }
          const job = await fetchVideo(v.ml_id, v.ml_fetch);
          if (job.status === "error" && isRateLimit(job.message)) {
            await sq("UPDATE so_videos SET updated_at = now() WHERE id = $1", [v.id]);
            continue;
          }
          if (job.status === "error") {
            await fail(v.id, `ModelsLab: ${job.message}`);
            log.push(`#${v.id}: failed — ${job.message}`);
            continue;
          }
          if (job.status !== "success" || !job.url) {
            await sq("UPDATE so_videos SET tries = tries + 1, ml_fetch = coalesce($2, ml_fetch), updated_at = now() WHERE id = $1", [v.id, job.fetchUrl ?? null]);
            if (v.tries > 200) await fail(v.id, "ModelsLab took too long. Press Retry.");
            continue;
          }
          url = job.url;
        }
        const up = await uploadWithInfo(url, `v${v.id}.mp4`);
        const final = overlayUrl(up.url, v.hook, v.cta, v.duration, pickLayout(modelFor(v.model ?? "").layout, up.width, up.height));
        await sq("UPDATE so_videos SET status = 'finishing', raw_url = $2, video_url = $3, final_url = $4, tries = 0, updated_at = now() WHERE id = $1", [v.id, url, up.url, final]);
        log.push(`#${v.id}: clip done — adding text`);
      } else {
        const state = v.final_url ? await overlayReady(v.final_url) : "failed";
        if (state === "processing" && v.tries < 30) {
          await sq("UPDATE so_videos SET tries = tries + 1, updated_at = now() WHERE id = $1", [v.id]);
          continue;
        }
        // If the text overlay can't be made, post the clean video instead of getting stuck.
        const final = state === "ready" ? v.final_url : v.video_url;
        await sq("UPDATE so_videos SET status = 'ready', final_url = $2, updated_at = now() WHERE id = $1", [v.id, final]);
        log.push(`#${v.id}: video ready${state === "ready" ? "" : " (without text overlay)"}`);
      }
    } catch (e) {
      const msg = errText(e);
      await sq("UPDATE so_videos SET tries = tries + 1, error = $2, updated_at = now() WHERE id = $1", [v.id, msg.slice(0, 300)]);
      if (v.tries > 20 || /^Scene \d/.test(msg)) await fail(v.id, msg);
      log.push(`#${v.id}: ${msg.slice(0, 120)}`);
    }
  }
  return log;
}

// ——— Scheduling ———

/** Next day (US Eastern) without a scheduled feed post, at the posting hour. */
async function nextSlot(hour: number): Promise<Date> {
  const taken = await sq<{ d: string }>(
    "SELECT DISTINCT to_char(scheduled_for AT TIME ZONE 'America/New_York', 'YYYY-MM-DD') d FROM so_posts WHERE kind = 'feed' AND scheduled_for > now() AND status <> 'posted'",
  );
  const used = new Set(taken.map((t) => t.d));
  const today = dateToEastern(new Date()).slice(0, 10);
  for (let i = 1; i < 60; i++) {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    const day = d.toISOString().slice(0, 10);
    if (!used.has(day)) return easternToDate(`${day}T${String(hour).padStart(2, "0")}:00`)!;
  }
  return new Date(Date.now() + 86_400_000);
}

/** Turns a ready piece into posts (feed + an Instagram story for videos). */
export async function schedule(id: number, when?: Date | null, approve?: boolean): Promise<string> {
  // Claim it atomically: the cron, the webhook and an open page can all try to schedule the same
  // piece at once — only the one that flips ready → scheduled creates posts (no duplicates).
  const [v] = await sq<Video>("UPDATE so_videos SET status = 'scheduled', updated_at = now() WHERE id = $1 AND status = 'ready' RETURNING *", [id]);
  if (!v) return "Only ready pieces can be scheduled.";
  const s = await studioSettings();
  // Autopilot pieces keep their planned slot (or go out at the next run if the slot has passed).
  const planned = v.slot ? new Date(v.slot) : null;
  const at = when ?? (planned ? (planned.getTime() > Date.now() ? planned : new Date()) : await nextSlot(s.postHour));
  const status = (approve ?? s.autoApprove) ? "approved" : "draft";
  const isVideo = isVideoFormat(v.format);
  const assets = isVideo
    ? [{ src: v.final_url ?? v.video_url ?? "", kind: "video", poster: v.cover_url ?? undefined, label: v.title }]
    : (v.media ?? []).map((src, i) => ({ src, kind: "image", label: `${v.title} ${i + 1}` }));
  if (!assets.length || !assets[0].src) {
    await sq("UPDATE so_videos SET status = 'ready' WHERE id = $1", [v.id]);
    return "This piece has no media yet.";
  }
  const insert = (kind: "feed" | "story", platforms: string[], whenAt: Date, a: unknown[]) =>
    sq("INSERT INTO so_posts (idea, caption, hashtags, assets, platforms, scheduled_for, status, kind, video_id) VALUES ($1,$2,$3,$4::jsonb,$5::text[],$6,$7,$8,$9)", [
      `${kind === "story" ? "Story" : v.auto ? "Autopilot" : "Studio"}: ${v.title}`,
      v.caption,
      v.hashtags,
      JSON.stringify(a),
      `{${platforms.join(",")}}`,
      whenAt.toISOString(),
      status,
      kind,
      v.id,
    ]);
  await insert("feed", isVideo ? ["instagram", "facebook", "youtube"] : ["instagram", "facebook"], at, assets);
  // Same time as the feed post: one run publishes both (feed first).
  if (isVideo) await insert("story", ["instagram"], at, assets.slice(0, 1));
  await sq("UPDATE so_videos SET status = 'scheduled', scheduled_for = $2, updated_at = now() WHERE id = $1", [v.id, at.toISOString()]);
  return `Scheduled for ${at.toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} ET${status === "draft" ? " — approve it on the Calendar" : ""}.`;
}

// ——— One step for the runner / webhook / cron ———

export type StepResult = { log: string[]; pending: number; queued: number; startable: number };

export async function studioStep(opts: { produceOne?: boolean; budgetMs?: number; approve?: boolean; poll?: boolean } = {}): Promise<StepResult> {
  const deadline = Date.now() + (opts.budgetMs ?? 150_000);
  const s = await studioSettings();
  // A start that crashed mid-way (timeout) goes back to the queue after 5 minutes.
  await sq("UPDATE so_videos SET status = 'queued' WHERE status = 'starting' AND updated_at < now() - interval '5 minutes'");
  // A join that was cut off (function timeout) is retried.
  await sq("UPDATE so_videos SET status = 'rendering' WHERE status = 'stitching' AND updated_at < now() - interval '6 minutes'");
  const log = await tick(deadline);
  if (opts.produceOne !== false) {
    // Start queued pieces while there's time (soonest slot first), a few per run.
    for (let n = 0; n < 3 && Date.now() < deadline - 60_000; n++) {
      const [next] = await sq<Video>("SELECT * FROM so_videos WHERE status = 'queued' AND (not_before IS NULL OR not_before <= now()) ORDER BY slot NULLS LAST, id LIMIT 1");
      if (!next) break;
      // Claim it so two tabs don't start the same job twice.
      const claimed = await sq("UPDATE so_videos SET status = 'starting', updated_at = now() WHERE id = $1 AND status = 'queued' RETURNING id", [next.id]);
      if (claimed.length) log.push(await produce(next, s, deadline));
    }
  }
  // Without a webhook nobody tells us when ModelsLab is done, so a cron run waits for its own jobs
  // (checking every ~25 s) and joins/finishes them while time is left.
  if (opts.poll) {
    while (Date.now() < deadline - 110_000) {
      const [w] = await sq<{ n: number }>("SELECT count(*)::int n FROM so_videos WHERE status IN ('rendering','finishing')");
      if (!w?.n) break;
      await new Promise((r) => setTimeout(r, 25_000));
      log.push(...(await tick(deadline)));
    }
  }
  // Autopilot pieces always get scheduled into their slot, approved per the Autopilot setting.
  const [ap] = await sq<{ value: string }>("SELECT value FROM so_settings WHERE key = 'autopilot'");
  const autoApprove = opts.approve ?? (() => {
    try {
      return JSON.parse(ap?.value ?? "{}").autoApprove !== false;
    } catch {
      return true;
    }
  })();
  const ready = await sq<{ id: number; auto: boolean }>("SELECT id, auto FROM so_videos WHERE status = 'ready' ORDER BY slot NULLS LAST, id LIMIT 6");
  for (const r of ready) {
    if (!s.autoSchedule && !r.auto) continue;
    log.push(`#${r.id}: ${await schedule(r.id, null, r.auto ? autoApprove : undefined)}`);
  }
  const [c] = await sq<{ pending: number; queued: number; startable: number }>(
    "SELECT count(*) FILTER (WHERE status IN ('starting','rendering','stitching','finishing'))::int pending, count(*) FILTER (WHERE status = 'queued')::int queued, count(*) FILTER (WHERE status = 'queued' AND (not_before IS NULL OR not_before <= now()))::int startable FROM so_videos",
  );
  return { log, pending: c?.pending ?? 0, queued: c?.queued ?? 0, startable: c?.startable ?? 0 };
}
