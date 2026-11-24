import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { aiProvider } from "@/lib/ai";
import { q } from "@/lib/leadengine/db";
import { mailReady, sentToday } from "@/lib/leadengine/mailer";
import { metaConfig } from "@/lib/social/publish";
import { HELPER_SYSTEM } from "./knowledge";

export type ChatMessage = { role: "user" | "assistant"; text: string; image?: string };

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";

/** Live facts so answers fit the real state of the app (no secrets, just counts and yes/no). */
async function liveContext(path: string): Promise<string> {
  const safe = async <T,>(fn: () => Promise<T>, fallback: T) => fn().catch(() => fallback);
  const [le, social, meta, today] = await Promise.all([
    safe(
      () =>
        q<{ total: number; hot: number; contacted: number; replied: number; pending: number }>(
          `SELECT count(*)::int total,
             count(*) FILTER (WHERE pay_score >= 30 AND pain_score >= 30 AND email IS NOT NULL AND status = 'new')::int hot,
             count(*) FILTER (WHERE contacted_at IS NOT NULL)::int contacted,
             count(*) FILTER (WHERE status = 'replied')::int replied,
             count(*) FILTER (WHERE enrich_status IN ('pending','working'))::int pending
           FROM le_leads`,
        ).then((r) => r[0]),
      null,
    ),
    safe(() => q<{ status: string; n: number }>("SELECT status, count(*)::int n FROM so_posts GROUP BY status"), []),
    safe(() => metaConfig(), null),
    safe(() => sentToday(), 0),
  ]);
  return [
    `Current page: ${path}`,
    `Today: ${new Date().toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" })}`,
    le ? `Lead Engine: ${le.total} leads, ${le.hot} hot leads not yet emailed, ${le.contacted} emailed so far, ${le.replied} replied, ${le.pending} websites waiting to be checked.` : null,
    `Emails sent today: ${today}. Gmail sending connected: ${mailReady() ? "yes" : "no"}.`,
    `Instagram/Facebook auto-posting connected: ${meta ? `yes (Page ${meta.pageName ?? ""}, IG @${meta.igUsername ?? ""})` : "no"}.`,
    `Social posts: ${social.length ? social.map((s) => `${s.n} ${s.status}`).join(", ") : "none yet"}.`,
  ]
    .filter(Boolean)
    .join("\n");
}

const dataUrlParts = (url: string) => {
  const m = url.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/);
  return m ? { mediaType: m[1] as "image/png" | "image/jpeg" | "image/webp" | "image/gif", data: m[2] } : null;
};

let anthropic: Anthropic | undefined;
let openai: OpenAI | undefined;

export async function helperReply(messages: ChatMessage[], path: string): Promise<string> {
  const provider = aiProvider();
  if (!provider) return "AI key set nahi hai, isliye main abhi jawab nahi de sakta. Settings mein AI key check karo (ya VS Code mein Claude ko bolo).";
  const system = `${HELPER_SYSTEM}\n\nLIVE STATE OF THE APP RIGHT NOW\n${await liveContext(path)}`;
  const recent = messages.slice(-12);

  if (provider === "claude") {
    anthropic ??= new Anthropic();
    const res = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      system,
      messages: recent.map((m) => {
        const img = m.role === "user" && m.image ? dataUrlParts(m.image) : null;
        return {
          role: m.role,
          content: img
            ? [
                { type: "image" as const, source: { type: "base64" as const, media_type: img.mediaType, data: img.data } },
                { type: "text" as const, text: m.text || "Is screenshot mein kya karna hai?" },
              ]
            : m.text,
        };
      }),
    });
    return res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
  }

  openai ??= new OpenAI();
  const reasoning = /^(gpt-5|gpt-6|o\d)/.test(OPENAI_MODEL) ? { reasoning: { effort: "low" as const } } : {};
  const res = await openai.responses.create({
    model: OPENAI_MODEL,
    instructions: system,
    input: recent.map((m) =>
      m.role === "user"
        ? {
            role: "user" as const,
            content: [
              ...(m.image ? [{ type: "input_image" as const, image_url: m.image, detail: "auto" as const }] : []),
              { type: "input_text" as const, text: m.text || "Is screenshot mein kya karna hai?" },
            ],
          }
        : { role: "assistant" as const, content: m.text },
    ),
    ...reasoning,
  });
  return res.output_text.trim();
}
