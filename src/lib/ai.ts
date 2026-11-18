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
      "You write short, honest cold emails from a solo web designer to US small-business owners. Under 90 words. Sound like a real person, not marketing. No hype words, no fake urgency, no claims you can't back up. Mention one specific detail from the facts. The offer: a free homepage preview already built for them; if they like it they pay what they think it's worth and it goes live. End with a simple question. Include the preview link exactly once on its own line. Do not add a signature.",
      `${leadFacts(lead)}\n\nPreview link: ${link}`,
    );
    if (!result || !result.body.includes(link)) return { ...fallback, source: "template" };
    return { ...result, source: "ai" };
  } catch (error) {
    console.error("generateEmail failed", error);
    return { ...fallback, source: "template" };
  }
}
