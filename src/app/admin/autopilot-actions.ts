"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { autopilotSettings, autopilotStep, createPlan, saveAutopilotSettings } from "@/lib/social/autopilot";
import { refreshInsights } from "@/lib/social/insights";
import { saveStudioSettings } from "@/lib/social/studio";
import { VIDEO_MODELS } from "@/lib/social/modelslab";
import type { StepResult } from "@/lib/social/studio";
import type { ActionState } from "./actions";

const err = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 300);

/** Turns Autopilot on (plans + starts making the first posts right away) or off. */
export async function apToggle(on: boolean): Promise<ActionState> {
  await requireAdmin();
  const s = await autopilotSettings();
  await saveAutopilotSettings({ on, startedAt: on ? (s.startedAt ?? new Date().toISOString()) : s.startedAt });
  if (!on) {
    refresh();
    return { ok: true, message: "Autopilot is off. Posts already scheduled stay in the Calendar." };
  }
  try {
    const r = await autopilotStep(150_000);
    refresh();
    return { ok: true, message: `Autopilot is on. ${r.log.slice(0, 3).join(" · ") || "Working on the next posts."}` };
  } catch (e) {
    refresh();
    return { ok: false, message: `Autopilot is on, but the first run had a problem: ${err(e)}` };
  }
}

export async function apNewPlan(): Promise<ActionState> {
  await requireAdmin();
  try {
    const p = await createPlan();
    refresh();
    return { ok: true, message: `New 2-month plan: starts with “${p.weeks[0]?.theme}”.` };
  } catch (e) {
    return { message: err(e) };
  }
}

export async function apRunNow(): Promise<ActionState> {
  await requireAdmin();
  try {
    const r = await autopilotStep(200_000);
    refresh();
    return { ok: true, message: r.log.slice(0, 4).join(" · ") || "Nothing to do right now — everything is on track." };
  } catch (e) {
    return { message: err(e) };
  }
}

/** Runner step from the Autopilot page (keeps production moving while the tab is open). */
export async function apStep(): Promise<StepResult> {
  await requireAdmin();
  return autopilotStep(150_000);
}

export async function apSaveSettings(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const perDay = Math.max(1, Math.min(3, Number(form.get("perDay")) || 2));
  const hours = [Number(form.get("h1")) || 11, Number(form.get("h2")) || 19, Number(form.get("h3")) || 15].slice(0, perDay);
  await saveAutopilotSettings({ hours, autoApprove: form.get("autoApprove") === "on" });
  const model = String(form.get("model") ?? "");
  const stills = form.get("stills") === "openai" ? "openai" : "flux";
  await saveStudioSettings({
    cap: Math.max(0, Math.min(500, Number(form.get("cap")) || 0)),
    stills,
    ...(VIDEO_MODELS.some((m) => m.key === model) ? { model } : {}),
  });
  refresh();
  return { ok: true, message: "Saved." };
}

export async function apRefreshInsights(): Promise<ActionState> {
  await requireAdmin();
  try {
    const log = await refreshInsights(Date.now() + 50_000);
    refresh();
    return { ok: true, message: log.join(" · ") || "Up to date (insights refresh about once a day per post)." };
  } catch (e) {
    return { message: err(e) };
  }
}

/** Health check: can this server download and run ffmpeg (needed to join reel clips)? No data is written. */
export async function apCheckTools(): Promise<ActionState> {
  await requireAdmin();
  const started = Date.now();
  try {
    const { ffmpegPath } = await import("@/lib/social/ffmpeg");
    const { spawnSync } = await import("node:child_process");
    const bin = await ffmpegPath();
    const r = spawnSync(bin, ["-hide_banner", "-version"], { encoding: "utf8", timeout: 20_000 });
    const line = (r.stdout || r.stderr || "").split("\n")[0].slice(0, 80);
    return { ok: r.status === 0, message: r.status === 0 ? `Video tools OK (${line}, ${((Date.now() - started) / 1000).toFixed(1)} s)` : `ffmpeg didn't run: ${line}` };
  } catch (e) {
    return { message: `Video tools problem: ${err(e)}` };
  }
}
