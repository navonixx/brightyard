import "server-only";
import { z } from "zod";
import { aiEnabled, parse } from "@/lib/ai";
import { LIBRARY } from "./library";

/**
 * The content plan for growing Alderwell Creative's own accounts. Audience: US small-business
 * owners who might hire us. Every piece either shows the work (proof), teaches something useful
 * (saves/shares), or makes the offer (first project free).
 */
export const PILLARS = [
  { key: "photo_to_ad", label: "Photo → video ad", why: "Our strongest proof: a still product photo becomes a moving ad. Hook: “This was just a product photo.”" },
  { key: "cinematic_product", label: "Satisfying product shots", why: "Slow-motion, macro, pours, splashes, reveals — the loopable clips people rewatch." },
  { key: "local_pov", label: "Local business POV", why: "Cinematic b-roll of a bakery, barber, landscaper, café… “POV: your business finally looks as good as it is.”" },
  { key: "tips", label: "Tips carousel", why: "5-slide carousels owners save and share: website mistakes, ad tips, photo tips." },
  { key: "proof", label: "Portfolio collage", why: "Four campaign images in one post — quick proof of range." },
  { key: "offer", label: "Offer", why: "First project free, pay what it's worth. Once a week, never pushy." },
] as const;

export const FORMATS = [
  { key: "reel", label: "AI video reel" },
  { key: "photo_ad", label: "Photo → video ad" },
  { key: "carousel", label: "Tips carousel" },
  { key: "collage", label: "Portfolio collage" },
] as const;
export type Format = (typeof FORMATS)[number]["key"];

const Idea = z.object({
  format: z.enum(["reel", "photo_ad", "carousel", "collage"]),
  pillar: z.string().describe("One of: photo_to_ad, cinematic_product, local_pov, tips, proof, offer"),
  title: z.string().describe("Short internal title for the team"),
  hook: z.string().describe("On-screen hook for the first 2-3 seconds. Max 8 words. Plain text, no emoji, no arrows. Curiosity or bold claim."),
  cta: z.string().describe("On-screen call to action for the last seconds. Max 7 words, no emoji, e.g. 'First project free - link in bio'"),
  videoPrompt: z
    .string()
    .describe(
      "For reel/photo_ad only (else empty). A detailed prompt for an AI video model, 60-120 words: subject, action, camera movement (e.g. slow push-in, orbit, macro tracking), lighting, mood, setting, vertical 9:16 framing with the subject centered. Something visually happens in the FIRST second. No text, letters, logos, brand names or real people in the video. For photo_ad: describe how the given still photo should come alive (camera move + motion of elements), keep the product identical.",
    ),
  seconds: z.number().int().describe("Clip length 5-10 seconds. Loopable."),
  libraryIds: z.array(z.string()).describe("photo_ad: exactly 1 image id from the library list. collage: exactly 4 image ids from different campaigns. Otherwise empty."),
  slides: z.array(z.object({ headline: z.string(), body: z.string() })).describe("carousel only: 5 slides. Slide 1 = hook (max 8 words). Slides 2-4 = one tip each (headline max 7 words, body max 18 words). Slide 5 = takeaway + 'Save this'. Else empty."),
  coverText: z.string().describe("Cover/thumbnail text, max 5 words, punchy"),
  scene: z.string().describe("One sentence describing the cover/thumbnail picture (no text in it)"),
  caption: z.string().describe("Instagram caption: hook line, 2-4 short lines of value/story, one soft CTA. No hashtags here. Max one emoji."),
  hashtags: z.array(z.string()).describe("8-12 hashtags without #, mix of niche (small business, local marketing) and broad"),
  ytTitle: z.string().describe("YouTube Shorts title, max 70 characters, curiosity-driven, ends with #Shorts"),
  ytDescription: z.string().describe("YouTube description: 2-3 lines + 'Start a project: https://alderwellcreative.vercel.app' + 3 hashtags"),
  ytTags: z.array(z.string()).describe("8-12 YouTube tags"),
});
const Plan = z.object({ ideas: z.array(Idea) });
export type IdeaT = z.infer<typeof Idea>;

const SYSTEM = `You are the head of social media for Alderwell Creative, a small creative studio for US small businesses (websites, product photography, AI-assisted video ads, ad campaigns, digital marketing). First project is free; clients pay what they feel it's worth.
Goal: grow Instagram, Facebook and YouTube Shorts with content US small-business owners stop for, save and share — and that makes them want to work with us.

What goes viral in this niche (apply it):
- Hook in the first second: motion or a bold claim on screen. Never start slow.
- 6-10 second loopable clips beat long ones. Satisfying motion (pours, reveals, slow-mo, macro) gets rewatched.
- Transformations ("this was just a photo"), POV formats, "3 mistakes" lists, before/after.
- Carousels that teach one useful thing get saved; slide 1 must make people swipe.
- Speak to the owner: more calls, more bookings, looking premium, standing out locally.

Pillars: ${PILLARS.map((p) => `${p.key} (${p.why})`).join("; ")}.

Rules:
- Honesty: videos are AI-generated. Captions of realistic AI videos include a short note like "Made with AI by Alderwell Creative". Portfolio campaigns are concept work for fictional brands — say "concept campaign", never claim a real client, never invent testimonials, numbers or results.
- No real brands, logos, celebrities or identifiable real people. No text inside AI video prompts.
- Voice: confident, warm, plain English, short lines, no hype words.`;

const LIBRARY_LIST = LIBRARY.filter((l) => l.kind === "image")
  .map((l) => `${l.id}: ${l.label} (${l.industry})`)
  .join("\n");

/** Asks the AI for `count` ready-to-produce pieces in the given mix of formats. */
export async function planIdeas(mix: Format[], topic: string, recentTitles: string[]): Promise<IdeaT[]> {
  if (!aiEnabled()) throw new Error("No AI key is set (OpenAI or Claude) — the planner needs one.");
  const r = await parse(
    Plan,
    "content_plan",
    SYSTEM,
    [
      `Create exactly ${mix.length} pieces in this order of formats: ${mix.join(", ")}.`,
      topic ? `Theme / topic from the owner: ${topic}` : "Pick strong, varied ideas across the pillars.",
      recentTitles.length ? `Already made recently (don't repeat): ${recentTitles.slice(0, 30).join(" | ")}` : null,
      `Portfolio image library (use ids for photo_ad and collage):\n${LIBRARY_LIST}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
  );
  if (!r?.ideas?.length) throw new Error("The AI didn't return a plan — try again.");
  const ids = new Set(LIBRARY.filter((l) => l.kind === "image").map((l) => l.id));
  const fallbackImages = LIBRARY.filter((l) => l.kind === "image").map((l) => l.id);
  return r.ideas.slice(0, mix.length).map((idea, i) => {
    const format = mix[i] ?? idea.format;
    let libraryIds = idea.libraryIds.filter((id) => ids.has(id));
    if (format === "photo_ad" && !libraryIds.length) libraryIds = [fallbackImages[Math.floor(Math.random() * fallbackImages.length)]];
    if (format === "collage" && libraryIds.length < 4) libraryIds = [...new Set([...libraryIds, ...fallbackImages.filter((_, j) => j % 5 === 0)])].slice(0, 4);
    return { ...idea, format, libraryIds, seconds: Math.max(5, Math.min(10, idea.seconds || 8)) };
  });
}

/** One week: 3 AI reels, 2 photo→ad videos, 1 carousel, 1 collage. */
export const WEEK_MIX: Format[] = ["reel", "photo_ad", "carousel", "reel", "collage", "reel", "photo_ad"];
