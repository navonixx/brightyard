import "server-only";
import OpenAI from "openai";
import sharp from "sharp";
import { publicUrl, uploadToStorage } from "./storage";

/**
 * Covers, YouTube thumbnails and carousel slides drawn by OpenAI's image model (it renders short
 * text well), then cropped to the exact platform size with sharp and stored on ImageKit.
 */
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5";
export const IMAGE_COST = 0.05; // rough price of one medium-quality image

export function imagesReady() {
  return Boolean(process.env.OPENAI_API_KEY);
}

let client: OpenAI | undefined;

const BRAND_STYLE =
  "Brand: Alderwell Creative, a creative studio. Palette: deep violet #6d28d9, neon pink #e040fb and cyan #22d3ee accents on near-black #07051a or clean white. Bold modern sans-serif type, high contrast, generous margins, no clutter, no watermarks, no fake logos of real companies.";

// The model draws 2:3 / 3:2; we crop to the platform size, so text must stay inside a safe zone.
const SIZES = {
  cover: { gen: "1024x1536", w: 1080, h: 1920, safe: "Keep every letter inside the middle 80% of the width (the left and right 10% get cropped)." }, // reel cover / story 9:16
  thumb: { gen: "1536x1024", w: 1280, h: 720, safe: "Keep every letter inside the middle 80% of the height (the top and bottom 10% get cropped)." }, // YouTube 16:9
  slide: { gen: "1024x1536", w: 1080, h: 1350, safe: "Keep every letter inside the middle 80% of the height (the top and bottom 10% get cropped) — leave those bands as plain background." }, // Instagram carousel 4:5
} as const;

export type ImageKind = keyof typeof SIZES;

async function draw(prompt: string, kind: ImageKind): Promise<Buffer> {
  client ??= new OpenAI();
  const size = SIZES[kind];
  const res = await client.images.generate({ model: IMAGE_MODEL, prompt: `${prompt}\n\n${BRAND_STYLE}`, size: size.gen, quality: "medium", n: 1 });
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("The image model returned nothing");
  return sharp(Buffer.from(b64, "base64")).resize(size.w, size.h, { fit: "cover", position: "centre" }).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
}

/** Draws and stores one image; returns its public URL. */
export async function makeImage(prompt: string, kind: ImageKind, name: string): Promise<string> {
  return uploadToStorage(await draw(prompt, kind), `${name}.jpg`);
}

export const coverPrompt = (coverText: string, scene: string) =>
  `Vertical 9:16 social media reel cover. Big bold headline text, spelled exactly: "${coverText}". Place the text in the upper middle third, very large and readable on a phone. Background: ${scene}. Cinematic lighting, scroll-stopping.`;

export const thumbPrompt = (coverText: string, scene: string) =>
  `YouTube thumbnail, 16:9. Huge bold text, spelled exactly: "${coverText}" (max 5 words, on the left half). Right half: ${scene}. High contrast, bright subject, simple background, looks great at small size.`;

export const slidePrompt = (n: number, total: number, headline: string, body: string) =>
  `Instagram carousel slide ${n} of ${total}, flat graphic design. Fixed template used for every slide of the set: solid near-black #07051a background, headline in bold white with one key word in neon pink #e040fb, supporting text in light grey, thin cyan #22d3ee accent line, left-aligned text block in the vertical middle, small slide number bottom-right. Headline, spelled exactly: "${headline}".${body ? ` Smaller supporting text, spelled exactly: "${body}".` : ""} ${n === 1 ? "This is the hook slide: largest type, eye-catching." : n === total ? 'Final slide: include the line "Follow for more" small at the bottom.' : ""} Consistent template across slides, slide number "${n}/${total}" in a corner.`;

/** Portfolio images are fetched from the public site (reading /public from disk would bundle it). */
async function loadImage(src: string): Promise<Buffer> {
  const res = await fetch(publicUrl(src), { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Couldn't load ${src} (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

/** A 2×2 collage (4:5) of existing portfolio images on the brand background — no AI cost. */
export async function makeCollage(srcs: string[], name: string): Promise<string> {
  const W = 1080, H = 1350, gap = 16, pad = 40;
  const cw = (W - pad * 2 - gap) / 2, ch = (H - pad * 2 - gap) / 2;
  const tiles = await Promise.all(
    srcs.slice(0, 4).map(async (src) => {
      const img = await sharp(await loadImage(src)).resize(Math.round(cw), Math.round(ch), { fit: "cover", position: "attention" }).toBuffer();
      const mask = Buffer.from(`<svg width="${Math.round(cw)}" height="${Math.round(ch)}"><rect width="100%" height="100%" rx="28" ry="28"/></svg>`);
      return sharp(img).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
    }),
  );
  const out = await sharp({ create: { width: W, height: H, channels: 3, background: "#07051a" } })
    .composite(tiles.map((input, i) => ({ input, left: Math.round(pad + (i % 2) * (cw + gap)), top: Math.round(pad + Math.floor(i / 2) * (ch + gap)) })))
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
  return uploadToStorage(out, `${name}.jpg`);
}

/** Read-only check used by the Studio page: can sharp run here? */
export async function sharpWorks() {
  try {
    await sharp({ create: { width: 8, height: 8, channels: 3, background: "#000" } }).png().toBuffer();
    return true;
  } catch {
    return false;
  }
}
