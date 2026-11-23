import { CAMPAIGNS, SHOWREEL } from "@/lib/portfolio";
import type { Asset } from "./db";

/**
 * Everything the studio can post: the portfolio campaign photos (JPEG copies, which Instagram
 * requires), each campaign's vertical reel, and the showreel.
 */
export type LibraryItem = Asset & { id: string; campaign: string; industry: string; story: string; format?: string };

export const LIBRARY: LibraryItem[] = [
  ...CAMPAIGNS.flatMap((c) => [
    ...c.shots.map((s, i) => ({
      id: `${c.slug}-${i + 1}`,
      src: s.src.replace(/\.webp$/, ".jpg"),
      kind: "image" as const,
      label: `${c.brand} · ${s.kind}`,
      campaign: c.brand,
      industry: c.industry,
      story: c.story,
      format: s.format,
    })),
    { id: `${c.slug}-reel`, src: c.reel, poster: c.reelPoster, kind: "video" as const, label: `${c.brand} · Reel 9:16`, campaign: c.brand, industry: c.industry, story: c.story, format: "9:16" },
  ]),
  { id: "showreel", src: SHOWREEL.src, poster: SHOWREEL.poster, kind: "video", label: "Studio showreel 16:9", campaign: "Alderwell Creative", industry: "Studio", story: "Highlights from all eight concept campaigns.", format: "16:9" },
];

export const libraryById = new Map(LIBRARY.map((i) => [i.id, i]));
export const libraryBySrc = new Map(LIBRARY.map((i) => [i.src, i]));
