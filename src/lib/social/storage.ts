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
  const data = (await res.json().catch(() => ({}))) as { url?: string; message?: string };
  if (!res.ok || !data.url) throw new Error(data.message || `ImageKit upload failed (${res.status})`);
  return data.url;
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

/**
 * The clip resized to 1080×1920 with the hook on top for the first seconds and the call to action
 * near the bottom at the end — drawn by ImageKit, so no video editing runs on our server.
 * `ov-redirect_false` makes ImageKit answer 202 until the new video is ready (see `overlayReady`).
 */
export function overlayUrl(videoUrl: string, hook: string, cta: string, seconds: number) {
  const text = (s: string, from: number, to: number | null, y: number) =>
    `l-text,ie-${b64(overlayText(s).slice(0, 90))},w-900,lx-90,ly-${y},fs-58,tg-b,co-FFFFFF,bg-00000085,pa-28,r-24,ia-center,lso-${from}${to !== null ? `,leo-${to}` : ""},l-end`;
  const steps = ["w-1080,h-1920,c-maintain_ratio"];
  // Reels safe zone: Instagram's caption and buttons cover roughly the bottom quarter.
  if (overlayText(hook)) steps.push(text(hook, 0, Math.min(3, seconds), 300));
  if (overlayText(cta)) steps.push(text(cta, Math.max(0, seconds - 3), seconds, 1220));
  steps[steps.length - 1] += ",ov-redirect_false";
  return `${videoUrl.split("?")[0]}?tr=${steps.join(":")}`;
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
