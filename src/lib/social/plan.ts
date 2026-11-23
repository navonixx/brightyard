import "server-only";
import { CAMPAIGNS } from "@/lib/portfolio";
import { writeCaption } from "./captions";
import { sq, type Asset } from "./db";
import { LIBRARY, libraryBySrc } from "./library";

/** "YYYY-MM-DDTHH:mm" in US Eastern time → the real moment (handles daylight saving). */
export function easternToDate(local: string): Date | null {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  let guess = Date.UTC(y, mo - 1, d, h + 5, mi);
  for (let i = 0; i < 2; i++) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
        .formatToParts(new Date(guess))
        .map((p) => [p.type, p.value]),
    );
    const shown = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour) % 24, Number(parts.minute));
    guess += Date.UTC(y, mo - 1, d, h, mi) - shown;
  }
  return new Date(guess);
}

/** A moment shown as "YYYY-MM-DDTHH:mm" in US Eastern time (for <input type="datetime-local">). */
export function dateToEastern(v: Date | string | null): string {
  if (!v) return "";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(new Date(v))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${String(Number(parts.hour) % 24).padStart(2, "0")}:${parts.minute}`;
}

const day = (offset: number) => {
  const now = dateToEastern(new Date());
  const d = new Date(`${now.slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

type Slot = { idea: string; assets: Asset[]; platforms: string[] };

/**
 * Plans the next 7 days (one post a day at 10:00 US Eastern): a mix of reels, carousels and
 * single photos from campaigns that haven't been posted recently, each with an AI caption.
 */
export async function planWeek(): Promise<number> {
  const recent = await sq<{ assets: Asset[] }>("SELECT assets FROM so_posts WHERE created_at > now() - interval '45 days'");
  const used = new Set(recent.flatMap((r) => (r.assets ?? []).map((a) => libraryBySrc.get(a.src)?.campaign)).filter(Boolean));
  const order = [...CAMPAIGNS].sort((a, b) => Number(used.has(a.brand)) - Number(used.has(b.brand)));
  const pick = (i: number) => order[i % order.length];
  const asset = (brand: string, n: number): Asset => {
    const images = LIBRARY.filter((l) => l.campaign === brand && l.kind === "image");
    const item = images[Math.min(n, images.length - 1)];
    return { src: item.src, kind: "image", label: item.label };
  };
  const reel = (brand: string): Asset => {
    const item = LIBRARY.find((l) => l.campaign === brand && l.kind === "video")!;
    return { src: item.src, kind: "video", poster: item.poster, label: item.label };
  };

  const slots: Slot[] = [
    { idea: "Reel: show the full campaign in motion", assets: [reel(pick(0).brand)], platforms: ["instagram", "facebook", "youtube"] },
    { idea: "Carousel: one campaign, five angles — hero, ad, lifestyle, social, detail", assets: LIBRARY.filter((l) => l.campaign === pick(1).brand && l.kind === "image").map((l) => ({ src: l.src, kind: "image" as const, label: l.label })), platforms: ["instagram", "facebook"] },
    { idea: "Single ad creative with its headline — what a scroll-stopping ad looks like", assets: [asset(pick(2).brand, 1)], platforms: ["instagram", "facebook"] },
    { idea: "Tip: why product photos decide whether people buy online", assets: [asset(pick(3).brand, 2)], platforms: ["instagram", "facebook"] },
    { idea: "Reel: from still photos to a video ad", assets: [reel(pick(4).brand)], platforms: ["instagram", "facebook", "youtube"] },
    { idea: "Offer: first project is free — websites, photos, video, ads", assets: [asset(pick(5).brand, 0)], platforms: ["instagram", "facebook"] },
    { idea: "Carousel: lifestyle vs studio shots — when to use which", assets: [asset(pick(6).brand, 2), asset(pick(6).brand, 0), asset(pick(6).brand, 4)], platforms: ["instagram", "facebook"] },
  ];

  const captions = await Promise.all(slots.map((s) => writeCaption(libraryBySrc.get(s.assets[0].src), s.idea)));
  for (let i = 0; i < slots.length; i++) {
    const when = easternToDate(`${day(i + 1)}T10:00`);
    await sq("INSERT INTO so_posts (idea, caption, hashtags, assets, platforms, scheduled_for) VALUES ($1, $2, $3, $4::jsonb, $5::text[], $6)", [
      slots[i].idea,
      captions[i].caption,
      captions[i].hashtags,
      JSON.stringify(slots[i].assets),
      `{${slots[i].platforms.join(",")}}`,
      when?.toISOString() ?? null,
    ]);
  }
  return slots.length;
}
