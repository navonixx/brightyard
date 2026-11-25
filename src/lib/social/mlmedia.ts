import "server-only";
import { sq } from "./db";
import { uploadToStorage } from "./storage";

/**
 * ModelsLab still images (Flux, open-source — about $0.005 each) and background music.
 * Tested 2026-11-25: v7 text-to-image (max 1024 px a side → 576×1024 for 9:16, ~10 s) and v6
 * music_gen (30 s minimum, MP3, ~15–60 s). ModelsLab says generated music is royalty-free.
 */
type Raw = { status?: string; output?: unknown; proxy_links?: unknown; future_links?: unknown; fetch_result?: string; id?: number | string; message?: unknown; eta?: number };

const firstUrl = (...lists: unknown[]) => {
  for (const l of lists) {
    const arr = Array.isArray(l) ? l : [];
    const hit = arr.find((u) => typeof u === "string" && /^https?:\/\//.test(u));
    if (hit) return hit as string;
  }
  return undefined;
};

async function call(url: string, body: Record<string, unknown>): Promise<Raw> {
  const key = process.env.MODELSLAB_API_KEY;
  if (!key) throw new Error("MODELSLAB_API_KEY isn't set.");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", key },
    body: JSON.stringify({ key, ...body }),
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
  });
  return (await res.json().catch(() => ({ status: "error", message: `HTTP ${res.status}` }))) as Raw;
}

const msg = (r: Raw) => (typeof r.message === "string" ? r.message : JSON.stringify(r.message ?? "")).slice(0, 300);

/** Submits, then polls the fetch URL until done or `waitMs` runs out. */
async function runJob(url: string, body: Record<string, unknown>, waitMs: number): Promise<{ url?: string; pending?: { id: string; fetch: string }; error?: string }> {
  const first = await call(url, body);
  const s = String(first.status ?? "").toLowerCase();
  if (s === "error" || s === "failed") return { error: msg(first) || "ModelsLab error" };
  const done = firstUrl(first.output, first.proxy_links);
  if (s === "success" && done) return { url: done };
  const fetchUrl = first.fetch_result;
  if (!fetchUrl) return { error: "ModelsLab gave no fetch URL" };
  const until = Date.now() + waitMs;
  while (Date.now() < until) {
    await new Promise((r) => setTimeout(r, 5000));
    const f = await call(fetchUrl, {});
    const fs = String(f.status ?? "").toLowerCase();
    if (fs === "success") {
      const u = firstUrl(f.output, f.proxy_links);
      if (u) return { url: u };
    }
    if (fs === "error" || fs === "failed") return { error: msg(f) || "ModelsLab error" };
  }
  return { pending: { id: String(first.id ?? ""), fetch: fetchUrl } };
}

/** Checks a job started earlier (music generated in the background). */
export async function checkJob(fetchUrl: string): Promise<{ url?: string; error?: string }> {
  const f = await call(fetchUrl, {});
  const s = String(f.status ?? "").toLowerCase();
  if (s === "success") return { url: firstUrl(f.output, f.proxy_links) };
  if (s === "error" || s === "failed") return { error: msg(f) || "ModelsLab error" };
  return {};
}

export const isRateLimit = (m?: string) => /rate limit|too many|parallel|concurrent/i.test(m ?? "");

/** A 9:16 still (576×1024) stored on ImageKit. Throws on error. */
export async function stillImage(prompt: string, name: string): Promise<string> {
  const r = await runJob(
    "https://modelslab.com/api/v7/images/text-to-image",
    {
      model_id: process.env.MODELSLAB_IMAGE_MODEL || "flux",
      prompt: `${prompt}. Vertical 9:16 composition, photorealistic, cinematic lighting, high detail, no text, no letters, no watermark, no logo.`,
      negative_prompt: "text, letters, words, watermark, logo, blurry, deformed, extra fingers, low quality",
      width: 576,
      height: 1024,
      samples: 1,
    },
    45_000,
  );
  if (r.error) throw new Error(`ModelsLab image: ${r.error}`);
  if (!r.url) throw new Error("ModelsLab image is taking too long — will retry.");
  return uploadToStorage(r.url, `${name}.jpg`);
}

// ——— Music library ———

export const MOODS = {
  upbeat: "upbeat modern pop house, bright synths, punchy drums, positive, energetic, instrumental, 120 bpm",
  chill: "chill lo-fi hip hop, warm keys, soft vinyl texture, relaxed groove, instrumental, 85 bpm",
  cinematic: "cinematic uplifting soundtrack, soft piano and strings building to a bright swell, instrumental",
  luxury: "elegant luxury fashion beat, deep bass, minimal percussion, sleek and modern, instrumental, 100 bpm",
  cozy: "cozy acoustic guitar and light percussion, warm morning cafe feeling, instrumental, 95 bpm",
} as const;
export type Mood = keyof typeof MOODS;
export const isMood = (m: string): m is Mood => m in MOODS;

type Track = { id: number; mood: string; url: string | null; status: string; fetch_url: string | null; used: number };

/**
 * Picks a ready track for the mood (least used first). Keeps a small library growing in the
 * background: if a mood has fewer than 3 tracks, one more is requested. With nothing ready at all,
 * one is generated right away (waits up to ~50 s).
 */
export async function trackFor(mood: string): Promise<string | null> {
  const m: Mood = isMood(mood) ? mood : "upbeat";
  await refreshPending();
  const rows = await sq<Track>("SELECT * FROM so_music WHERE mood = $1 ORDER BY used, id", [m]);
  const ready = rows.filter((r) => r.status === "ready" && r.url);
  const pending = rows.filter((r) => r.status === "pending");
  // Grow the library: just submit (no waiting) — it's picked up as "pending" next time.
  if (ready.length && rows.filter((r) => r.status !== "failed").length < 3 && !pending.length) await requestTrack(m, 0).catch(() => null);
  let pick = ready[0];
  if (!pick && !pending.length) {
    const url = await requestTrack(m, 50_000).catch(() => null);
    if (url) return url;
  }
  if (!pick) {
    const any = await sq<Track>("SELECT * FROM so_music WHERE status = 'ready' AND url IS NOT NULL ORDER BY used, id LIMIT 1");
    pick = any[0];
  }
  if (!pick) return null;
  await sq("UPDATE so_music SET used = used + 1 WHERE id = $1", [pick.id]);
  return pick.url;
}

async function requestTrack(mood: Mood, waitMs: number): Promise<string | null> {
  const r = await runJob("https://modelslab.com/api/v6/voice/music_gen", { prompt: MOODS[mood], duration: 30, output_format: "mp3", bitrate: "128k", base64: false, temp: false }, waitMs);
  if (r.error) {
    await sq("INSERT INTO so_music (mood, prompt, status, error) VALUES ($1, $2, 'failed', $3)", [mood, MOODS[mood], r.error]);
    return null;
  }
  if (r.pending) {
    await sq("INSERT INTO so_music (mood, prompt, status, fetch_url) VALUES ($1, $2, 'pending', $3)", [mood, MOODS[mood], r.pending.fetch]);
    return null;
  }
  const stored = await uploadToStorage(r.url!, `music-${mood}.mp3`, "/social/music").catch(() => r.url!);
  await sq("INSERT INTO so_music (mood, prompt, status, url) VALUES ($1, $2, 'ready', $3)", [mood, MOODS[mood], stored]);
  return stored;
}

async function refreshPending() {
  const rows = await sq<Track>("SELECT * FROM so_music WHERE status = 'pending' AND fetch_url IS NOT NULL LIMIT 3");
  for (const t of rows) {
    const r = await checkJob(t.fetch_url!).catch(() => ({}) as { url?: string; error?: string });
    if (r.url) {
      const stored = await uploadToStorage(r.url, `music-${t.mood}.mp3`, "/social/music").catch(() => r.url!);
      await sq("UPDATE so_music SET status = 'ready', url = $2 WHERE id = $1", [t.id, stored]);
    } else if (r.error) {
      await sq("UPDATE so_music SET status = 'failed', error = $2 WHERE id = $1", [t.id, r.error]);
    }
  }
}
