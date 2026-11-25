import "server-only";
import { z } from "zod";
import { aiEnabled, parse } from "@/lib/ai";
import { sq } from "./db";
import { learnings } from "./insights";
import { dateToEastern, easternToDate } from "./plan";
import { PILLARS, type Format } from "./strategy";
import { createIdeas, studioStep, type StepResult } from "./studio";

/**
 * Social Autopilot: a 2-month plan (8 weekly themes), then every run it keeps the next few days of
 * slots filled (2 posts a day by default), makes the pieces, schedules them into their slots and
 * — with auto-approve — they publish by themselves. Runs from the cron (twice a day), the ModelsLab
 * webhook and the Autopilot page while it's open.
 */
export type AutopilotSettings = { on: boolean; perDay: number; hours: number[]; horizon: number; autoApprove: boolean; days: number; startedAt: string | null };
export type Week = { week: number; theme: string; goal: string; ideas: string[] };
export type Plan = { start: string; weeks: Week[]; createdAt: string };

const DEFAULTS: AutopilotSettings = { on: false, perDay: 2, hours: [11, 19], horizon: 3, autoApprove: true, days: 60, startedAt: null };

async function getJson<T>(key: string, fallback: T): Promise<T> {
  const [r] = await sq<{ value: string }>("SELECT value FROM so_settings WHERE key = $1", [key]);
  try {
    return r ? { ...fallback, ...JSON.parse(r.value) } : fallback;
  } catch {
    return fallback;
  }
}
async function setJson(key: string, value: unknown) {
  await sq("INSERT INTO so_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [key, JSON.stringify(value)]);
}

export const autopilotSettings = () => getJson<AutopilotSettings>("autopilot", DEFAULTS);
export async function saveAutopilotSettings(patch: Partial<AutopilotSettings>) {
  const next = { ...(await autopilotSettings()), ...patch };
  next.hours = [...new Set(next.hours.map((h) => Math.max(6, Math.min(22, Math.round(h)))))].sort((a, b) => a - b).slice(0, 3);
  next.perDay = next.hours.length;
  await setJson("autopilot", next);
  return next;
}

export async function getPlan(): Promise<Plan | null> {
  const p = await getJson<Plan | null>("plan2m", null);
  return p?.weeks?.length ? p : null;
}

/** Which week of the plan today is (1-based; null before start / after the end). */
export function currentWeek(plan: Plan | null): Week | null {
  if (!plan) return null;
  const days = Math.floor((Date.now() - new Date(`${plan.start}T12:00:00Z`).getTime()) / 86_400_000);
  if (days < 0) return plan.weeks[0];
  return plan.weeks[Math.floor(days / 7)] ?? null;
}

const PlanSchema = z.object({
  weeks: z
    .array(z.object({ theme: z.string().describe("Short theme name, 3-6 words"), goal: z.string().describe("What this week should achieve, one sentence"), ideas: z.array(z.string()).describe("4-6 concrete post ideas for the week") }))
    .describe("Exactly 8 weeks, building on each other"),
});

/** AI writes the 8-week plan (uses account learnings when there are any). */
export async function createPlan(): Promise<Plan> {
  if (!aiEnabled()) throw new Error("No AI key is set.");
  const l = await learnings().catch(() => null);
  const r = await parse(
    PlanSchema,
    "two_month_plan",
    `You plan social media for Alderwell Creative, a small creative studio for US small businesses (websites, product photography, AI-assisted video ads, ad campaigns, digital marketing). First project is free; clients pay what it's worth.
Audience: US small-business owners (restaurants, cafés, salons, home services, local shops, e-commerce). Goal over 2 months: grow followers and get DMs/enquiries.
Content pillars: ${PILLARS.map((p) => `${p.label} — ${p.why}`).join("; ")}.
Two posts a day: mostly multi-scene AI video reels with music, plus photo→ad reels, tips carousels and portfolio collages.
Plan 8 weekly themes that build: weeks 1-2 show what we do (proof, wow), weeks 3-4 teach (tips, mistakes), weeks 5-6 niche-by-niche (cafés, salons, trades, e-commerce), weeks 7-8 offers and transformations. Honest only: no invented clients, results or testimonials.`,
    [l?.text ? `Account data so far:\n${l.text}` : "New account — no data yet.", "Write the 8 weeks."].join("\n\n"),
  );
  if (!r?.weeks?.length) throw new Error("The AI didn't return a plan — try again.");
  const plan: Plan = {
    start: dateToEastern(new Date()).slice(0, 10),
    createdAt: new Date().toISOString(),
    weeks: r.weeks.slice(0, 8).map((w, i) => ({ week: i + 1, theme: w.theme, goal: w.goal, ideas: w.ideas.slice(0, 6) })),
  };
  await setJson("plan2m", plan);
  return plan;
}

/** Upcoming slot times (US Eastern hours) for the next `horizon` days, at least 2 h from now. */
export function upcomingSlots(s: AutopilotSettings): Date[] {
  const out: Date[] = [];
  const today = dateToEastern(new Date()).slice(0, 10);
  for (let d = 0; d <= s.horizon; d++) {
    const day = new Date(`${today}T12:00:00Z`);
    day.setUTCDate(day.getUTCDate() + d);
    for (const h of s.hours) {
      const at = easternToDate(`${day.toISOString().slice(0, 10)}T${String(h).padStart(2, "0")}:00`);
      if (at && at.getTime() > Date.now() + 2 * 3_600_000) out.push(at);
    }
  }
  return out.slice(0, s.horizon * s.hours.length);
}

// Weekday-based mix: the first slot of the day is usually a multi-scene reel; the second rotates.
const FIRST: Format[] = ["story_reel", "story_reel", "photo_ad", "story_reel", "story_reel", "photo_ad", "story_reel"];
const SECOND: Format[] = ["carousel", "story_reel", "collage", "story_reel", "carousel", "story_reel", "story_reel"];

function formatFor(at: Date, indexInDay: number): Format {
  const wd = new Date(`${dateToEastern(at).slice(0, 10)}T12:00:00Z`).getUTCDay();
  return indexInDay === 0 ? FIRST[wd] : indexInDay === 1 ? SECOND[wd] : "story_reel";
}

/** Creates (and queues) pieces for empty slots. Returns how many were added. */
async function fillSlots(s: AutopilotSettings, plan: Plan | null): Promise<number> {
  const slots = upcomingSlots(s);
  if (!slots.length) return 0;
  const taken = await sq<{ slot: string }>("SELECT slot FROM so_videos WHERE slot IS NOT NULL AND slot >= $1 AND status <> 'failed'", [slots[0].toISOString()]);
  const used = new Set(taken.map((t) => new Date(t.slot).toISOString()));
  const empty = slots.filter((d) => !used.has(d.toISOString())).slice(0, 6);
  if (!empty.length) return 0;
  const mix = empty.map((d) => formatFor(d, s.hours.indexOf(Number(dateToEastern(d).slice(11, 13)))));
  const week = currentWeek(plan);
  const topic = week ? `This week's theme: ${week.theme}. Goal: ${week.goal}. Ideas to draw from: ${week.ideas.join("; ")}` : "";
  const l = await learnings().catch(() => null);
  const ids = await createIdeas(mix, topic, { learnings: l?.text, slots: empty, auto: true });
  return ids.length;
}

export type AutopilotResult = StepResult & { added: number; on: boolean };

/** One autopilot run. */
export async function autopilotStep(budgetMs = 200_000): Promise<AutopilotResult> {
  const started = Date.now();
  const s = await autopilotSettings();
  let added = 0;
  const log: string[] = [];
  if (s.on) {
    try {
      let plan = await getPlan();
      if (!plan || !currentWeek(plan)) {
        plan = await createPlan();
        log.push("New 2-month plan created");
      }
      added = await fillSlots(s, plan);
      if (added) log.push(`Planned ${added} new posts for the coming days`);
    } catch (e) {
      log.push(`Planning failed: ${e instanceof Error ? e.message : e}`);
    }
  }
  const step = await studioStep({ budgetMs: Math.max(30_000, budgetMs - (Date.now() - started)), approve: s.autoApprove });
  return { ...step, log: [...log, ...step.log], added, on: s.on };
}
