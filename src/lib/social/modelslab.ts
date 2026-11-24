import "server-only";

/**
 * ModelsLab video generation (v7 "video-fusion"). Jobs are asynchronous: submit returns an id
 * (sometimes the finished URL straight away), then we poll the fetch endpoint until it's done.
 * Docs: https://modelslab.com/text-to-video-api · https://docs.modelslab.com/video-api/fetch-video
 * Prices below are ModelsLab's published rates at the time of writing — estimates only.
 */
const BASE = "https://modelslab.com/api/v7/video-fusion";

export type VideoModel = {
  key: string;
  label: string;
  t2v: string;
  i2v: string;
  perSecond: number;
  resolution?: string;
  audio?: boolean;
  maxSeconds: number;
};

export const VIDEO_MODELS: VideoModel[] = [
  { key: "seedance-fast", label: "Seedance 2.0 Fast · 720p · with sound (recommended)", t2v: "seedance-2.0-fast-t2v", i2v: "seedance-2.0-fast-i2v", perSecond: 0.18, resolution: "720p", audio: true, maxSeconds: 15 },
  { key: "seedance-cheap", label: "Seedance 2.0 Fast · 480p · cheaper", t2v: "seedance-2.0-fast-t2v", i2v: "seedance-2.0-fast-i2v", perSecond: 0.08, resolution: "480p", audio: true, maxSeconds: 15 },
  { key: "seedance-mini", label: "Seedance Mini · 480p · cheapest (drafts)", t2v: "seedance-2-mini-t2v", i2v: "seedance-2.0-fast-i2v", perSecond: 0.05, resolution: "480p", maxSeconds: 15 },
  { key: "kling-v3", label: "Kling 3.0 · cinematic look", t2v: "kling-v3-t2v", i2v: "seedance-2.0-fast-i2v", perSecond: 0.09, maxSeconds: 10 },
];

export function modelslabReady() {
  return Boolean(process.env.MODELSLAB_API_KEY);
}

export function estimateCost(model: VideoModel, seconds: number) {
  return Math.round(model.perSecond * seconds * 100) / 100;
}

type Raw = {
  status?: string;
  id?: number | string;
  output?: unknown;
  proxy_links?: unknown;
  future_links?: unknown;
  fetch_result?: string;
  eta?: number;
  message?: unknown;
  messege?: unknown;
  error?: unknown;
};

export type JobState = { status: "processing" | "success" | "error"; id?: string; url?: string; fetchUrl?: string; eta?: number; message?: string };

const firstUrl = (...lists: unknown[]) => {
  for (const l of lists) {
    const arr = Array.isArray(l) ? l : typeof l === "string" ? [l] : [];
    const hit = arr.find((u) => typeof u === "string" && /^https?:\/\//.test(u));
    if (hit) return hit as string;
  }
  return undefined;
};

const text = (v: unknown) => (typeof v === "string" ? v : v ? JSON.stringify(v) : "");

function read(raw: Raw): JobState {
  const s = String(raw.status ?? "").toLowerCase();
  const id = raw.id !== undefined && raw.id !== null ? String(raw.id) : undefined;
  if (s === "error" || s === "failed") return { status: "error", id, message: text(raw.message ?? raw.messege ?? raw.error).slice(0, 300) || "ModelsLab returned an error" };
  const url = firstUrl(raw.output, raw.proxy_links);
  if (s === "success" && url) return { status: "success", id, url };
  return { status: "processing", id, fetchUrl: raw.fetch_result, eta: raw.eta };
}

async function call(url: string, body: Record<string, unknown>): Promise<Raw> {
  const key = process.env.MODELSLAB_API_KEY;
  if (!key) throw new Error("MODELSLAB_API_KEY is not set — add it to .env.local / Vercel.");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", key },
    body: JSON.stringify({ key, ...body }),
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
  });
  const raw = (await res.json().catch(() => ({ status: "error", message: `HTTP ${res.status}` }))) as Raw;
  if (!res.ok && !raw.status) return { status: "error", message: `HTTP ${res.status}` };
  return raw;
}

/** Starts a 9:16 clip. With `imageUrl` the image is animated (image-to-video). */
export async function submitVideo(opts: { prompt: string; seconds: number; model: VideoModel; imageUrl?: string | null; webhook?: string; trackId?: string; modelOverride?: string }): Promise<JobState> {
  const { model } = opts;
  const body: Record<string, unknown> = {
    model_id: opts.modelOverride || (opts.imageUrl ? model.i2v : model.t2v),
    prompt: opts.prompt,
    duration: Math.max(4, Math.min(model.maxSeconds, Math.round(opts.seconds))),
    aspect_ratio: "9:16",
  };
  if (model.resolution) body.resolution = model.resolution;
  if (model.audio) body.generate_audio = true;
  if (opts.imageUrl) body.init_image = [opts.imageUrl];
  if (opts.webhook) body.webhook = opts.webhook;
  if (opts.trackId) body.track_id = opts.trackId;
  return read(await call(`${BASE}/${opts.imageUrl ? "image-to-video" : "text-to-video"}`, body));
}

/** Checks a running job. Uses the fetch URL ModelsLab gave us, or the documented fetch endpoint. */
export async function fetchVideo(id: string, fetchUrl?: string | null): Promise<JobState> {
  const state = read(await call(fetchUrl && /^https:\/\/[^/]*modelslab\.com\//.test(fetchUrl) ? fetchUrl : `${BASE}/fetch/${encodeURIComponent(id)}`, {}));
  return { ...state, id: state.id ?? id };
}
