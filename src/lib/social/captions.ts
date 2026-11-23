import "server-only";
import { z } from "zod";
import { aiEnabled, parse } from "@/lib/ai";
import type { LibraryItem } from "./library";

const CaptionSchema = z.object({
  caption: z.string().describe("Instagram caption, 2-5 short lines, ends with one soft call to action. No hashtags in here."),
  hashtags: z.array(z.string()).describe("8-12 relevant hashtags without the # sign, mixing niche and broad"),
});

const SYSTEM = `You write social media captions for Alderwell Creative, a small creative studio for US small businesses: websites, product photography, video ads, ad campaigns and digital marketing. The first project is free and clients pay what they feel it's worth.
Voice: confident, warm, plain English, short lines, no hype words ("revolutionary", "game-changer"), at most one emoji.
Honesty rule: the portfolio campaigns are concept work for fictional brands produced with AI-assisted imaging. When the post shows a campaign, say it's a concept campaign (e.g. "Concept campaign for a fictional skincare brand") — never present it as a real client.
End with a soft call to action like "Want this for your brand? DM us or tap the link in bio."`;

export async function writeCaption(item: LibraryItem | undefined, idea: string): Promise<{ caption: string; hashtags: string; source: "ai" | "template" }> {
  const fallback = templateCaption(item, idea);
  if (!aiEnabled()) return { ...fallback, source: "template" };
  try {
    const r = await parse(
      CaptionSchema,
      "social_caption",
      SYSTEM,
      [
        idea ? `Post idea: ${idea}` : null,
        item ? `Media: ${item.label} (${item.kind === "video" ? "vertical video reel" : "photo"}). Industry: ${item.industry}. Campaign story: ${item.story}` : "No media — a text/tip post.",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    if (!r) return { ...fallback, source: "template" };
    return { caption: r.caption.trim(), hashtags: r.hashtags.map((h) => `#${h.replace(/^#/, "").replace(/\s+/g, "")}`).join(" "), source: "ai" };
  } catch (e) {
    console.error("writeCaption failed", e);
    return { ...fallback, source: "template" };
  }
}

function templateCaption(item: LibraryItem | undefined, idea: string) {
  const lines = item
    ? [`${item.campaign} — concept campaign for a fictional ${item.industry.toLowerCase()} brand.`, item.story, "", "Want imagery like this for your brand? DM us or tap the link in bio."]
    : [idea || "Your website should win you calls, not lose them.", "", "First project is on us — DM us to start."];
  return { caption: lines.join("\n"), hashtags: "#smallbusiness #branding #productphotography #webdesign #marketing #alderwellcreative" };
}
