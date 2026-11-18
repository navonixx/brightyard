import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { Lead, SampleContent } from "./db/schema";
import { TRADE_META } from "./brand";
import { templateEmail, templateSample } from "./templates";

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";

type Provider = "claude" | "openai";

/** Claude if its key is set, otherwise OpenAI, otherwise none (templates). */
export function aiProvider(): Provider | null {
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

export function aiEnabled(): boolean {
  return aiProvider() !== null;
}

export function aiLabel(): string {
  const provider = aiProvider();
  if (provider === "claude") return `Claude (${CLAUDE_MODEL})`;
  if (provider === "openai") return `OpenAI (${OPENAI_MODEL})`;
  return "templates";
}

let anthropic: Anthropic | undefined;
let openai: OpenAI | undefined;

const SampleSchema = z.object({
  headline: z.string().describe("6-9 words, plain and specific, no exclamation marks"),
  subheadline: z.string().describe("1-2 sentences naming the business and the city"),
  services: z
    .array(z.object({ title: z.string(), description: z.string() }))
    .describe("Exactly 4 services this kind of business typically offers"),
  whyUs: z.array(z.string()).describe("Exactly 3 short reasons to choose them"),
  about: z.string().describe("2-3 sentences, warm and local, no invented facts"),
  cta: z.string().describe("Button text, 2-4 words"),
  serviceArea: z.string(),
});

const EmailSchema = z.object({
  subject: z.string().describe("lowercase, under 7 words, no clickbait"),
  body: z.string().describe("plain text email body without signature"),
});

const EMAIL_SYSTEM_PROMPT = `You are drafting a first email for me. I am one person who builds websites for small local service businesses. I looked at this business, built a finished website for them before contacting them, and now I am writing to its owner to show it. The owner gets many spam pitches from web agencies, so the email only works if it is obviously written by a person who actually looked at their business.

How to write it:
- Open with one concrete thing about their business taken from the facts or research notes — ideally their own phrase quoted, or how long they have been around. Never open with a greeting formula or a compliment that could fit any business.
- Introduce me in one short sentence using the literal placeholder {me} for my name, for example: I'm {me}. I build websites for small service businesses. Write {me} exactly as shown; it is replaced with my real name later.
- Then one honest, specific observation about why I built this (what their current site hides or lacks, or that they have none). Be kind about it; they may have built the site themselves.
- Then say I built a new version and give the preview link alone on its own line, exactly once.
- Say plainly that the photos are placeholders until theirs go in.
- State the deal in one sentence: free to look at; if they want it they pay what they think it is worth and it goes live on their domain.
- End with one short question.

Voice: first person singular, plain American English, the way a thoughtful tradesperson would write to another. 70 to 110 words. Vary sentence length. No exclamation marks, no emoji, no bullet points, no marketing words (leading, premium, solutions, boost, skyrocket, stunning), no "I hope this finds you well", no fake urgency, no promised results.

Truthfulness: use only the facts given. Do not claim I am local to them, a customer, or that I spoke with anyone. Do not invent details about their site that are not in the notes.

Greeting: "Hi <first name>," if an owner name is given, otherwise "Hi,". No signature — it is added automatically.

Subject: lowercase, 3 to 6 words, specific to this business (their phrase, their domain or their trade), never salesy.`;

function leadFacts(lead: Lead): string {
  return [
    `Business: ${lead.businessName}`,
    `Trade: ${TRADE_META[lead.trade].label}`,
    lead.city && `City: ${lead.city}${lead.state ? `, ${lead.state}` : ""}`,
    lead.rating && `Google rating: ${lead.rating} from ${lead.reviewCount ?? "?"} reviews`,
    `Current website: ${lead.website || "none"}`,
    lead.ownerName && `Owner first name: ${lead.ownerName}`,
    lead.notes && `Notes from research: ${lead.notes}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Structured JSON from whichever provider is configured; null when unavailable or refused. */
async function parse<T extends z.ZodObject>(
  schema: T,
  name: string,
  system: string,
  prompt: string,
): Promise<z.infer<T> | null> {
  const provider = aiProvider();

  if (provider === "claude") {
    anthropic ??= new Anthropic();
    const response = await anthropic.beta.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(schema) },
      system,
      messages: [{ role: "user", content: prompt }],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) return null;
    return response.parsed_output as z.infer<T>;
  }

  if (provider === "openai") {
    openai ??= new OpenAI();
    const reasoning = /^(gpt-5|gpt-6|o\d)/.test(OPENAI_MODEL) ? { reasoning: { effort: "low" as const } } : {};
    const response = await openai.responses.parse({
      model: OPENAI_MODEL,
      instructions: system,
      input: prompt,
      text: { format: zodTextFormat(schema, name) },
      ...reasoning,
    });
    return (response.output_parsed as z.infer<T> | null) ?? null;
  }

  return null;
}

/** Homepage copy for a lead's preview. Falls back to templates without an API key or on failure. */
export async function generateSample(lead: Lead): Promise<{ sample: SampleContent; source: "ai" | "template" }> {
  const fallback = templateSample(lead);
  if (!aiEnabled()) return { sample: fallback, source: "template" };

  try {
    const result = await parse(
      SampleSchema,
      "homepage_copy",
      "You write homepage copy for small US home-service businesses. The copy appears on the business's own website, so write as the business (\"we\", \"our team\") speaking to homeowners. Write like a friendly local copywriter: concrete, short sentences, American English. Never invent awards, years in business, licenses, prices or guarantees — only use the facts given. The notes are private research for context: use them to pick the right services and tone, but never mention the notes, their social media pages, their current website or their lack of one.",
      `Write the homepage copy for this business.\n\n${leadFacts(lead)}`,
    );
    if (!result) return { sample: fallback, source: "template" };
    return {
      sample: { ...result, services: result.services.slice(0, 4), whyUs: result.whyUs.slice(0, 3) },
      source: "ai",
    };
  } catch (error) {
    console.error("generateSample failed", error);
    return { sample: fallback, source: "template" };
  }
}

/** First-touch cold email. The compliance footer is appended separately. */
export async function generateEmail(
  lead: Lead,
  link: string,
): Promise<{ subject: string; body: string; source: "ai" | "template" }> {
  const fallback = templateEmail({ ...lead, link });
  if (!aiEnabled()) return { ...fallback, source: "template" };

  try {
    const result = await parse(
      EmailSchema,
      "cold_email",
      EMAIL_SYSTEM_PROMPT,
      `${leadFacts(lead)}\n\n${
        lead.website
          ? "Situation: they already have a website. I built a redesigned version of it."
          : "Situation: they have no website. I built one for them."
      }\nPreview link: ${link}`,
    );
    if (!result || !result.body.includes(link)) return { ...fallback, source: "template" };
    return { ...result, source: "ai" };
  } catch (error) {
    console.error("generateEmail failed", error);
    return { ...fallback, source: "template" };
  }
}
