import "server-only";
import { createHmac } from "node:crypto";
import { siteUrl } from "@/lib/brand";
import { sq } from "./db";
import { IMAGE_COST, coverPrompt, imagesReady, makeCollage, makeImage, slidePrompt, thumbPrompt } from "./images";
import { libraryById } from "./library";
import { VIDEO_MODELS, clipSeconds, estimateCost, fetchVideo, modelslabReady, submitVideo, type VideoModel } from "./modelslab";
import { easternToDate, dateToEastern } from "./plan";
import { overlayReady, overlayUrl, pickLayout, publicUrl, storageReady, uploadWithInfo } from "./storage";
import { planIdeas, type Format } from "./strategy";

/**
 * AI Video Studio pipeline:
 *   idea → queued → rendering (ModelsLab) → finishing (ImageKit draws the text) → ready → scheduled
 * Carousels and collages skip the video steps. Vercel has no background workers, so the Studio
 * page's runner, the ModelsLab webhook and the daily cron all call `studioStep()`.
 */
export type Video = {
  id: number;
  status: "idea" | "queued" | "starting" | "rendering" | "finishing" | "ready" | "scheduled" | "failed";
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

export type StudioSettings = { model: string; cap: number; autoSchedule: boolean; autoApprove: boolean; postHour: number; t2vOverride: string; i2vOverride: string };

// Wan 2.2 works on the current ModelsLab plan; Seedance needs wallet credit (switch in Studio settings).
export const FALLBACK_MODEL = "wan-2.2";
const DEFAULTS: StudioSettings = { model: "wan-2.2", cap: 15, autoSchedule: true, autoApprove: false, postHour: 10, t2vOverride: "", i2vOverride: "" };

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
  return estimateCost(modelFor(s.model), v.duration) + 2 * IMAGE_COST;
}

const abs = publicUrl;

// ——— Ideas ———

export async function createIdeas(mix: Format[], topic: string): Promise<number> {
  const recent = await sq<{ title: string }>("SELECT title FROM so_videos ORDER BY id DESC LIMIT 30");
  const ideas = await planIdeas(mix, topic, recent.map((r) => r.title));
  for (const i of ideas) {
    const image = i.format === "photo_ad" ? libraryById.get(i.libraryIds[0])?.src ?? null : null;
    const media = i.format === "collage" ? i.libraryIds.map((id) => libraryById.get(id)?.src).filter(Boolean) : [];
    await sq(
      `INSERT INTO so_videos (format, pillar, title, hook, cta, prompt, image_src, duration, caption, hashtags, cover_text, thumb_prompt, slides, yt_title, yt_description, yt_tags, media)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,$16,$17::jsonb)`,
      [
        i.format,
        i.pillar,
        i.title,
        i.hook,
        i.cta,
        i.videoPrompt,
        image,
        i.seconds,
        i.caption,
        i.hashtags.map((h) => `#${h.replace(/^#/, "").replace(/\s+/g, "")}`).join(" "),
        i.coverText,
        i.scene,
        JSON.stringify(i.format === "carousel" ? i.slides.slice(0, 6) : []),
        i.ytTitle.slice(0, 100),
        i.ytDescription,
        i.ytTags.join(", "),
        JSON.stringify(media),
      ],
    );
  }
  return ideas.length;
}

// ——— Production ———

async function fail(id: number, message: string) {
  await sq("UPDATE so_videos SET status = 'failed', error = $2, updated_at = now() WHERE id = $1", [id, message.slice(0, 400)]);
}

function webhookUrl() {
  const secret = process.env.CRON_SECRET;
  const site = siteUrl();
  if (!secret || !site.startsWith("https://")) return undefined;
  return `${site}/api/social/studio/webhook?t=${webhookToken()}`;
}

export function webhookToken() {
  return createHmac("sha256", process.env.CRON_SECRET ?? "none").update("studio-webhook").digest("hex").slice(0, 32);
}

/** Starts one queued piece: images (cover, thumbnail, slides, collage) and the ModelsLab job. */
async function produce(v: Video, s: StudioSettings): Promise<string> {
  let cost = estimate(v, s);
  const spent = await monthSpent();
  if (cost > 0 && spent + cost > s.cap) {
    await sq("UPDATE so_videos SET status = 'idea', error = $2, updated_at = now() WHERE id = $1", [v.id, `Monthly budget reached ($${spent.toFixed(2)} of $${s.cap}). Raise it in Studio settings.`]);
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
    if (!imagesReady() && v.format === "carousel") throw new Error("OPENAI_API_KEY is needed for carousel slides.");
    if (v.format === "carousel") {
      const total = v.slides.length;
      const urls = await Promise.all(v.slides.map((sl, i) => makeImage(slidePrompt(i + 1, total, sl.headline, sl.body), "slide", `${name}-${i + 1}`)));
      await sq("UPDATE so_videos SET status = 'ready', media = $2::jsonb, cover_url = $3, cost = $4, error = NULL, updated_at = now() WHERE id = $1", [v.id, JSON.stringify(urls), urls[0], cost]);
      return `#${v.id}: carousel ready (${urls.length} slides)`;
    }

    // Video: start the clip first (slowest part), then draw the cover and thumbnail meanwhile.
    if (!modelslabReady()) throw new Error("MODELSLAB_API_KEY isn't set yet — add it to .env.local and Vercel.");
    let model = modelFor(s.model);
    const submit = (m: VideoModel, override?: string) =>
      submitVideo({
        prompt: v.prompt,
        seconds: v.duration,
        model: m,
        imageUrl: v.format === "photo_ad" && v.image_src ? abs(v.image_src) : null,
        webhook: webhookUrl(),
        trackId: `alderwell-${v.id}`,
        modelOverride: override,
      });
    let job = await submit(model, v.format === "photo_ad" ? s.i2vOverride : s.t2vOverride);
    // Paid ("third party") models need ModelsLab wallet credit. When it's empty, fall back to the
    // open-source model that works on the plan instead of failing.
    if (job.status === "error" && /exhausted|fund your wallet|insufficient/i.test(job.message ?? "") && model.key !== FALLBACK_MODEL) {
      model = modelFor(FALLBACK_MODEL);
      cost = estimate(v, { ...s, model: FALLBACK_MODEL });
      job = await submit(model);
    }
    if (job.status === "error") {
      // Rate limit: not a real failure — put it back in the queue and try again after the wait.
      const wait = job.message?.match(/rate limit[\s\S]*?(\d+)\s*minute/i);
      if (wait || /rate limit/i.test(job.message ?? "")) {
        const minutes = Math.min(60, Number(wait?.[1] ?? 5)) + 0.5;
        await sq("UPDATE so_videos SET status = 'queued', not_before = now() + make_interval(secs => $2), error = $3, updated_at = now() WHERE id = $1", [
          v.id,
          Math.round(minutes * 60),
          `ModelsLab is busy (rate limit) — trying again in about ${Math.ceil(minutes)} min.`,
        ]);
        return `#${v.id}: ModelsLab rate limit — retry in ~${Math.ceil(minutes)} min`;
      }
      throw new Error(`ModelsLab: ${job.message}`);
    }
    await sq("UPDATE so_videos SET status = 'rendering', model = $2, ml_id = $3, ml_fetch = $4, raw_url = $5, cost = $6, duration = $7, tries = 0, error = NULL, updated_at = now() WHERE id = $1", [
      v.id,
      model.key,
      job.id ?? null,
      job.fetchUrl ?? null,
      job.url ?? null,
      cost,
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
    const msg = e instanceof Error ? e.message : String(e);
    await fail(v.id, msg);
    return `#${v.id}: ${msg}`;
  }
}

/** Moves running jobs forward. Returns log lines. */
export async function tick(): Promise<string[]> {
  const log: string[] = [];
  const rows = await sq<Video & { raw_url: string | null }>("SELECT * FROM so_videos WHERE status IN ('rendering','finishing') ORDER BY updated_at LIMIT 6");
  for (const v of rows) {
    try {
      if (v.status === "rendering") {
        let url = v.raw_url;
        if (!url) {
          if (!v.ml_id) {
            await fail(v.id, "No ModelsLab job id was returned.");
            continue;
          }
          const job = await fetchVideo(v.ml_id, v.ml_fetch);
          if (job.status === "error" && /rate limit/i.test(job.message ?? "")) {
            // Asking too often — the video is still being made; check again later.
            await sq("UPDATE so_videos SET updated_at = now() WHERE id = $1", [v.id]);
            continue;
          }
          if (job.status === "error") {
            await fail(v.id, `ModelsLab: ${job.message}`);
            log.push(`#${v.id}: failed — ${job.message}`);
            continue;
          }
          if (job.status !== "success" || !job.url) {
            // ~40 checks ≈ 20+ minutes of trying while the page is open; the cron keeps going after that.
            await sq("UPDATE so_videos SET tries = tries + 1, ml_fetch = coalesce($2, ml_fetch), updated_at = now() WHERE id = $1", [v.id, job.fetchUrl ?? null]);
            if (v.tries > 200) await fail(v.id, "ModelsLab took too long. Press Retry.");
            continue;
          }
          url = job.url;
        }
        const up = await uploadWithInfo(url, `v${v.id}.mp4`);
        const stored = up.url;
        const final = overlayUrl(stored, v.hook, v.cta, v.duration, pickLayout(modelFor(v.model ?? "").layout, up.width, up.height));
        await sq("UPDATE so_videos SET status = 'finishing', raw_url = $2, video_url = $3, final_url = $4, tries = 0, updated_at = now() WHERE id = $1", [v.id, url, stored, final]);
        log.push(`#${v.id}: clip done — adding text`);
      } else {
        const state = v.final_url ? await overlayReady(v.final_url) : "failed";
        if (state === "processing" && v.tries < 30) {
          await sq("UPDATE so_videos SET tries = tries + 1, updated_at = now() WHERE id = $1", [v.id]);
          continue;
        }
        // If the text overlay can't be made, post the clean clip instead of getting stuck.
        const final = state === "ready" ? v.final_url : v.video_url;
        await sq("UPDATE so_videos SET status = 'ready', final_url = $2, updated_at = now() WHERE id = $1", [v.id, final]);
        log.push(`#${v.id}: video ready${state === "ready" ? "" : " (without text overlay)"}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await sq("UPDATE so_videos SET tries = tries + 1, error = $2, updated_at = now() WHERE id = $1", [v.id, msg.slice(0, 300)]);
      if (v.tries > 20) await fail(v.id, msg);
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
export async function schedule(id: number, when?: Date | null): Promise<string> {
  const [v] = await sq<Video>("SELECT * FROM so_videos WHERE id = $1", [id]);
  if (!v || v.status !== "ready") return "Only ready pieces can be scheduled.";
  const s = await studioSettings();
  const at = when ?? (await nextSlot(s.postHour));
  const status = s.autoApprove ? "approved" : "draft";
  const text = [v.caption, v.hashtags];
  const isVideo = v.format === "reel" || v.format === "photo_ad";
  const assets = isVideo
    ? [{ src: v.final_url ?? v.video_url ?? "", kind: "video", poster: v.cover_url ?? undefined, label: v.title }]
    : (v.media ?? []).map((src, i) => ({ src, kind: "image", label: `${v.title} ${i + 1}` }));
  if (!assets.length || !assets[0].src) return "This piece has no media yet.";
  const insert = (kind: "feed" | "story", platforms: string[], whenAt: Date, a: unknown[]) =>
    sq("INSERT INTO so_posts (idea, caption, hashtags, assets, platforms, scheduled_for, status, kind, video_id) VALUES ($1,$2,$3,$4::jsonb,$5::text[],$6,$7,$8,$9)", [
      `${kind === "story" ? "Story" : "Studio"}: ${v.title}`,
      text[0],
      text[1],
      JSON.stringify(a),
      `{${platforms.join(",")}}`,
      whenAt.toISOString(),
      status,
      kind,
      v.id,
    ]);
  await insert("feed", isVideo ? ["instagram", "facebook", "youtube"] : ["instagram", "facebook"], at, assets);
  // Same time as the feed post: the daily cron publishes both in one run (feed first).
  if (isVideo) await insert("story", ["instagram"], at, assets.slice(0, 1));
  await sq("UPDATE so_videos SET status = 'scheduled', scheduled_for = $2, updated_at = now() WHERE id = $1", [v.id, at.toISOString()]);
  return `Scheduled for ${at.toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} ET${status === "draft" ? " — approve it on the Posts tab" : ""}.`;
}

// ——— One step for the runner / webhook / cron ———

export type StepResult = { log: string[]; pending: number; queued: number; startable: number };

export async function studioStep(opts: { produceOne?: boolean } = {}): Promise<StepResult> {
  const s = await studioSettings();
  // A start that crashed mid-way (timeout) goes back to the queue after 5 minutes.
  await sq("UPDATE so_videos SET status = 'queued' WHERE status = 'starting' AND updated_at < now() - interval '5 minutes'");
  const log = await tick();
  if (opts.produceOne !== false) {
    const [next] = await sq<Video>("SELECT * FROM so_videos WHERE status = 'queued' AND (not_before IS NULL OR not_before <= now()) ORDER BY id LIMIT 1");
    if (next) {
      // Claim it so two tabs don't start the same job twice.
      const claimed = await sq("UPDATE so_videos SET status = 'starting', updated_at = now() WHERE id = $1 AND status = 'queued' RETURNING id", [next.id]);
      if (claimed.length) log.push(await produce(next, s));
    }
  }
  if (s.autoSchedule) {
    const ready = await sq<{ id: number }>("SELECT id FROM so_videos WHERE status = 'ready' ORDER BY id LIMIT 3");
    for (const r of ready) log.push(`#${r.id}: ${await schedule(r.id)}`);
  }
  const [c] = await sq<{ pending: number; queued: number; startable: number }>(
    "SELECT count(*) FILTER (WHERE status IN ('starting','rendering','finishing'))::int pending, count(*) FILTER (WHERE status = 'queued')::int queued, count(*) FILTER (WHERE status = 'queued' AND (not_before IS NULL OR not_before <= now()))::int startable FROM so_videos",
  );
  return { log, pending: c?.pending ?? 0, queued: c?.queued ?? 0, startable: c?.startable ?? 0 };
}
