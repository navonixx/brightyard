import "server-only";
import { siteUrl } from "@/lib/brand";

/** An absolute URL outside services can fetch (localhost during local tests → the live site). */
export function publicUrl(src: string) {
  if (src.startsWith("http")) return src;
  const site = siteUrl();
  return `${site.startsWith("https://") ? site : "https://alderwellcreative.vercel.app"}${src}`;
}

/**
 * ImageKit storage for the Studio: AI clips are copied here straight from the ModelsLab URL
 * (those links don't last), and images are uploaded from memory. Instagram and Facebook fetch
 * media from these public URLs.
 */
export function storageReady() {
  return Boolean(process.env.IMAGEKIT_PRIVATE_KEY);
}

export async function uploadToStorage(file: string | Buffer, fileName: string, folder = "/social/studio"): Promise<string> {
  return (await uploadWithInfo(file, fileName, folder)).url;
}

/** Same, plus the width/height ImageKit measured (used to place text around a video). */
export async function uploadWithInfo(file: string | Buffer, fileName: string, folder = "/social/studio"): Promise<{ url: string; width?: number; height?: number }> {
  const key = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!key) throw new Error("IMAGEKIT_PRIVATE_KEY is not set.");
  const form = new FormData();
  // A URL is fetched by ImageKit itself; a Buffer is sent as base64.
  form.append("file", typeof file === "string" ? file : file.toString("base64"));
  form.append("fileName", fileName.replace(/[^\w.-]+/g, "-").slice(-80));
  form.append("folder", folder);
  form.append("useUniqueFileName", "true");
  const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}` },
    body: form,
    cache: "no-store",
    signal: AbortSignal.timeout(50_000),
  });
  const data = (await res.json().catch(() => ({}))) as { url?: string; message?: string; width?: number; height?: number };
  if (!res.ok || !data.url) throw new Error(data.message || `ImageKit upload failed (${res.status})`);
  return { url: data.url, width: data.width, height: data.height };
}

/** A link that makes the browser download the file instead of playing it. */
export function downloadLink(url: string) {
  if (!url.includes("ik.imagekit.io")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}ik-attachment=true`;
}

const b64 = (s: string) => encodeURIComponent(Buffer.from(s, "utf8").toString("base64"));

/** ImageKit's font has no emoji or arrows (they show as boxes), so keep plain text only. */
export const overlayText = (s: string) =>
  s
    .replace(/[→➡⟶»]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, "-")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export type Layout = "full" | "letterbox" | "pad";

/** Landscape clips get the letterbox layout; tall non-vertical clips are padded with boxed text. */
export function pickLayout(preferred: "full" | "letterbox", width?: number, height?: number): Layout {
  if (preferred === "full") return "full";
  if (!width || !height) return "letterbox";
  const ratio = height / width;
  if (ratio <= 0.8) return "letterbox";
  return ratio >= 1.7 ? "full" : "pad";
}

/**
 * The clip as a 1080×1920 reel with the hook and the call to action drawn on it by ImageKit, so no
 * video editing runs on our server.
 * - "full": a vertical clip fills the frame; hook (first 3 s) and CTA (last 3 s) sit in dark boxes.
 * - "letterbox": a landscape clip sits in the middle of a brand-colored frame; the hook stays in the
 *   top band the whole time and the CTA appears in the bottom band (a common Reels format).
 * Each text sits inside a transparent full-width strip so it's centred (video layers don't support
 * centre-x positioning). `ov-redirect_false` makes ImageKit answer 202 until the video is ready.
 * Reels safe zone: Instagram's caption and buttons cover roughly the bottom quarter.
 */
export function overlayUrl(videoUrl: string, hook: string, cta: string, seconds: number, layout: Layout = "full") {
  const strip = (s: string, from: number, to: number, y: number, inner: string) =>
    `l-image,i-ik_canvas,bg-07051A00,w-1080,h-260,lx-0,ly-${y},lso-${from},leo-${to},l-text,ie-${b64(overlayText(s).slice(0, 90))},w-940,ia-center,tg-b,${inner},l-end,l-end`;
  const end = Math.max(1, seconds);
  const steps: string[] = [];
  if (layout === "letterbox") {
    steps.push("w-1080,h-1920,cm-pad_resize,bg-07051A");
    if (overlayText(hook)) steps.push(strip(hook, 0, end, 330, "fs-76,co-FFFFFF"));
    if (overlayText(cta)) steps.push(strip(cta, Math.min(1.5, end / 2), end, 1290, "fs-52,co-E040FB"));
  } else {
    steps.push(layout === "pad" ? "w-1080,h-1920,cm-pad_resize,bg-07051A" : "w-1080,h-1920,c-maintain_ratio");
    const box = "fs-58,co-FFFFFF,bg-00000085,pa-28,r-24";
    if (overlayText(hook)) steps.push(strip(hook, 0, Math.min(3, end), 260, box));
    if (overlayText(cta)) steps.push(strip(cta, Math.max(0, end - 3), end, 1180, box));
  }
  steps[steps.length - 1] += ",ov-redirect_false";
  return `${videoUrl.split("?")[0]}?tr=${steps.join(":")}`;
}

/**
 * A still (e.g. the first scene) cropped to w×h with big centred text — used as the free reel cover
 * (1080×1920) and YouTube thumbnail (1280×720). ImageKit renders it on request; `.jpg` stays in
 * the path so Instagram accepts it as a JPEG cover.
 */
export function textOnImage(imageUrl: string, text: string, w: number, h: number) {
  const t = overlayText(text).slice(0, 60);
  const base = `w-${w},h-${h},c-maintain_ratio,fo-auto`;
  if (!t) return `${imageUrl.split("?")[0]}?tr=${base}`;
  const stripH = Math.round(h * 0.3);
  const y = Math.round(h * (w > h ? 0.35 : 0.16));
  const fs = w > h ? 86 : 92;
  return `${imageUrl.split("?")[0]}?tr=${base}:l-image,i-ik_canvas,bg-07051A00,w-${w},h-${stripH},lx-0,ly-${y},l-text,ie-${b64(t)},w-${Math.round(w * 0.86)},ia-center,tg-b,fs-${fs},co-FFFFFF,bg-07051A80,pa-34,r-28,l-end,l-end`;
}

/** true when ImageKit has finished drawing the overlay (a real MP4 comes back, not "being prepared"). */
export async function overlayReady(url: string): Promise<"ready" | "processing" | "failed"> {
  const res = await fetch(url, { headers: { Range: "bytes=0-1023" }, cache: "no-store", signal: AbortSignal.timeout(20_000) }).catch(() => null);
  if (!res) return "processing";
  const type = res.headers.get("content-type") ?? "";
  await res.body?.cancel().catch(() => {});
  if (res.status === 202 || res.headers.get("is-intermediate-response") === "true") return "processing";
  if ((res.status === 200 || res.status === 206) && type.startsWith("video/")) return "ready";
  if (res.status >= 400) return "failed";
  return "processing";
}
