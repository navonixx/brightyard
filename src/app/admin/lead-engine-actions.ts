"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { pgArray, q, setSetting } from "@/lib/leadengine/db";
import { engineStep, type EngineStatus } from "@/lib/leadengine/engine";
import { nicheLabel } from "@/lib/leadengine/niches";
import { sendToLeads } from "@/lib/leadengine/promote";
import { checkSources, type SourceCheck } from "@/lib/leadengine/diagnose";
import type { ActionState } from "./actions";

const all = (form: FormData, name: string) => [...new Set(form.getAll(name).map(String).map((s) => s.trim()).filter(Boolean))].slice(0, 1000);

async function addJobs(jobs: { source: string; label: string; params: unknown }[]) {
  for (let i = 0; i < jobs.length; i += 200) {
    const chunk = jobs.slice(i, i + 200);
    const values = chunk.map((_, j) => `($${j * 3 + 1}, $${j * 3 + 2}, $${j * 3 + 3}::jsonb)`).join(",");
    await q(`INSERT INTO le_jobs (source, label, params) VALUES ${values}`, chunk.flatMap((x) => [x.source, x.label, JSON.stringify(x.params)]));
  }
}

export async function leQueueLocal(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const sources = all(form, "source").filter((s) => ["overture", "osm", "google"].includes(s));
  const niches = all(form, "niche");
  const cities = all(form, "city")
    .map((c) => c.split("|"))
    .filter(([city, state]) => city && /^[A-Z]{2}$/.test(state ?? ""))
    .map(([city, state]) => ({ city, state }));
  if (!sources.length) return { message: "Pick at least one source." };
  if (!niches.length) return { message: "Pick at least one business type." };
  if (!cities.length) return { message: "Pick at least one city." };
  const nicheText = niches.length > 3 ? `${niches.length} business types` : niches.map(nicheLabel).join(", ");
  const jobs: { source: string; label: string; params: unknown }[] = [];
  for (const { city, state } of cities) {
    if (sources.includes("overture")) jobs.push({ source: "overture", label: `Overture · ${nicheText} · ${city}, ${state}`, params: { city, state, niches } });
    if (sources.includes("osm")) jobs.push({ source: "osm", label: `OpenStreetMap · ${nicheText} · ${city}, ${state}`, params: { city, state, niches } });
    if (sources.includes("google")) for (const niche of niches) jobs.push({ source: "google", label: `Google · ${nicheLabel(niche)} · ${city}, ${state}`, params: { city, state, niche } });
  }
  await addJobs(jobs);
  redirect("/admin/lead-engine?run=1");
}

export async function leQueueYouTube(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const topics = String(form.get("topics") ?? "").split("\n").map((t) => t.trim()).filter(Boolean).slice(0, 50);
  const pages = Math.min(4, Math.max(1, Number(form.get("pages") ?? 2)));
  if (!topics.length) return { message: "Add at least one topic." };
  await addJobs(topics.map((query) => ({ source: "youtube", label: `YouTube · “${query}”`, params: { query, pages } })));
  redirect("/admin/lead-engine?run=1");
}

export async function leQueueSec(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  if (!process.env.SEC_USER_AGENT?.trim()) return { message: "SEC needs a contact first: add SEC_USER_AGENT (company name + email) in Vercel → Settings → Environment Variables, then redeploy." };
  const days = Math.min(30, Math.max(1, Number(form.get("days") ?? 7)));
  const minAmount = Math.max(0, Number(form.get("minAmount") ?? 100000));
  const states = all(form, "state").filter((s) => /^[A-Z]{2}$/.test(s));
  await addJobs([{ source: "sec", label: `SEC Form D · last ${days} days${states.length ? ` · ${states.join(", ")}` : ""} · ≥ $${minAmount.toLocaleString("en-US")}`, params: { days, states, minAmount } }]);
  redirect("/admin/lead-engine?run=1");
}

export async function leStep(): Promise<EngineStatus> {
  await requireAdmin();
  return engineStep();
}

export async function leClearQueue(): Promise<ActionState> {
  await requireAdmin();
  await q("DELETE FROM le_jobs WHERE status = 'queued'");
  refresh();
  return { ok: true, message: "Queue cleared." };
}

export async function leRetryFailed(): Promise<ActionState> {
  await requireAdmin();
  await q("UPDATE le_jobs SET status = 'queued', attempts = 0, error = NULL WHERE status = 'failed'");
  refresh();
  return { ok: true, message: "Failed searches are queued again." };
}

export async function leRescoreAll(): Promise<ActionState> {
  await requireAdmin();
  await q("UPDATE le_leads SET enrich_status = 'pending' WHERE enrich_status IN ('done','no_site','failed')");
  refresh();
  return { ok: true, message: "Every lead will be checked again — press Start on the dashboard." };
}

export async function leUpdateLead(id: number, form: FormData) {
  await requireAdmin();
  const status = String(form.get("status") ?? "new");
  if (!["new", "contacted", "replied", "won", "lost", "skip"].includes(status)) return;
  const notes = String(form.get("notes") ?? "").slice(0, 4000) || null;
  const followUp = /^\d{4}-\d{2}-\d{2}$/.test(String(form.get("follow_up") ?? "")) ? String(form.get("follow_up")) : null;
  await q(
    `UPDATE le_leads SET status = $2, notes = $3, follow_up = $4::date, updated_at = now(),
       contacted_at = CASE WHEN $2 IN ('contacted','replied','won') AND contacted_at IS NULL THEN now() ELSE contacted_at END
     WHERE id = $1`,
    [id, status, notes, followUp],
  );
  refresh();
}

export async function leMarkContacted(id: number) {
  await requireAdmin();
  await q("UPDATE le_leads SET status = 'contacted', contacted_at = COALESCE(contacted_at, now()), updated_at = now() WHERE id = $1 AND status = 'new'", [id]);
}

export async function leBulkStatus(ids: number[], status: string): Promise<ActionState> {
  await requireAdmin();
  if (!ids.length || !["new", "contacted", "replied", "won", "lost", "skip"].includes(status)) return { message: "Nothing to change." };
  await q("UPDATE le_leads SET status = $2, updated_at = now() WHERE id = ANY($1::int[])", [pgArray(ids.slice(0, 500).map(Number)), status]);
  refresh();
  return { ok: true, message: `${ids.length} marked ${status}.` };
}

export async function leSendToLeads(ids: number[]): Promise<ActionState> {
  await requireAdmin();
  const { created, already } = await sendToLeads(ids.map(Number).filter(Number.isFinite));
  refresh();
  return { ok: true, message: `${created} added to Leads${already ? ` · ${already} were already there` : ""}.` };
}

export async function leSaveSettings(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const cap = Math.max(0, Math.min(100000, Number(form.get("googleLookupCap") ?? 0) || 0));
  await setSetting("googleLookupCap", String(cap));
  refresh();
  return { ok: true, message: cap ? `Google limit: ${cap.toLocaleString("en-US")} paid lookups a month.` : "Google is off." };
}

export async function leCheckSources(): Promise<SourceCheck[]> {
  await requireAdmin();
  return checkSources();
}

export async function leClearHistory(): Promise<ActionState> {
  await requireAdmin();
  await q("DELETE FROM le_jobs WHERE status IN ('done','failed','queued')");
  refresh();
  return { ok: true, message: "Search history cleared (leads are kept)." };
}

export async function leRestartCities(): Promise<ActionState> {
  await requireAdmin();
  await setSetting("autoCursor", "0");
  refresh();
  return { ok: true, message: "Autopilot will start again from the first city (businesses already found are skipped)." };
}

export async function leBuildPreview(id: number): Promise<ActionState> {
  await requireAdmin();
  const { buildPreview } = await import("@/lib/leadengine/preview");
  const r = await buildPreview(Number(id));
  refresh();
  return { ok: r.ok, message: r.message };
}

export async function leFollowUpSent(id: number) {
  await requireAdmin();
  const { markFollowUpSent } = await import("@/lib/leadengine/followups");
  await markFollowUpSent(Number(id));
  refresh();
}

export async function trSetOutcome(kind: "le" | "main", key: string, outcome: "replied" | "won" | "lost" | "contacted"): Promise<ActionState> {
  await requireAdmin();
  if (!["le", "main"].includes(kind) || !["replied", "won", "lost", "contacted"].includes(outcome)) return { message: "Not allowed." };
  const { setOutcome } = await import("@/lib/tracker");
  await setOutcome(kind, String(key), outcome);
  refresh();
  return { ok: true, message: `Marked ${outcome}.` };
}

export type SendResult = { ok: boolean; message: string; sentToday: number; stop?: boolean };

async function capAndToday() {
  const { getSetting } = await import("@/lib/leadengine/db");
  const { sentToday } = await import("@/lib/leadengine/mailer");
  return { cap: Number(await getSetting("dailyCap", "20")), today: await sentToday() };
}

/** Sends one first email from the studio Gmail and marks the lead contacted. */
export async function leSendOne(id: number, subject: string, body: string): Promise<SendResult> {
  await requireAdmin();
  const { sendMail } = await import("@/lib/leadengine/mailer");
  const { getLead } = await import("@/lib/leadengine/leads");
  const { getSettings } = await import("@/lib/data");
  const { cap, today } = await capAndToday();
  if (today >= cap) return { ok: false, stop: true, sentToday: today, message: `Daily limit reached (${cap}). More from one Gmail in a day lands in spam — continue tomorrow.` };
  const lead = await getLead(Number(id));
  if (!lead?.email) return { ok: false, sentToday: today, message: "No email address." };
  if (lead.status !== "new") return { ok: false, sentToday: today, message: `${lead.name} was already contacted — skipped.` };
  if (!subject.trim() || !body.trim()) return { ok: false, sentToday: today, message: "Empty subject or email." };
  try {
    const settings = await getSettings();
    const messageId = await sendMail({ to: lead.email, subject: subject.slice(0, 200), text: body.slice(0, 5000), fromName: settings.senderName });
    await q(
      `UPDATE le_leads SET status = 'contacted', contacted_at = now(), updated_at = now(),
         extra = extra || jsonb_build_object('messageId', $2::text, 'subject', $3::text, 'sentVia', 'gmail') WHERE id = $1`,
      [lead.id, messageId, subject.slice(0, 200)],
    );
    return { ok: true, sentToday: today + 1, message: `Sent to ${lead.name}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Auth problems or Gmail limits: stop the whole run instead of failing 10 times.
    const stop = /auth|credentials|535|534|limit|quota|421|454|550/i.test(msg);
    return { ok: false, stop, sentToday: today, message: `${lead.name}: ${msg.slice(0, 200)}` };
  }
}

/** Sends the due follow-up as a reply in the same Gmail thread. */
export async function leSendFollowUp(id: number): Promise<SendResult> {
  await requireAdmin();
  const { sendMail } = await import("@/lib/leadengine/mailer");
  const { getLead } = await import("@/lib/leadengine/leads");
  const { followUpDraft } = await import("@/lib/leadengine/replies");
  const { markFollowUpSent } = await import("@/lib/leadengine/followups");
  const { getSettings } = await import("@/lib/data");
  const { cap, today } = await capAndToday();
  if (today >= cap) return { ok: false, stop: true, sentToday: today, message: `Daily limit reached (${cap}) — continue tomorrow.` };
  const lead = await getLead(Number(id));
  if (!lead?.email || lead.status !== "contacted") return { ok: false, sentToday: today, message: "Not waiting for a follow-up — skipped." };
  const step = (Number(lead.extra?.followups ?? 0) + 1) as 1 | 2;
  if (step > 2) return { ok: false, sentToday: today, message: `${lead.name}: both follow-ups already sent.` };
  const settings = await getSettings();
  const draft = followUpDraft(lead, step, { name: settings.senderName, company: "Alderwell Creative", site: "", address: settings.businessAddress });
  const original = lead.extra?.subject ? `Re: ${String(lead.extra.subject).replace(/^re:\s*/i, "")}` : draft.subject;
  try {
    await sendMail({ to: lead.email, subject: original, text: draft.body, fromName: settings.senderName, inReplyTo: (lead.extra?.messageId as string) ?? null });
    await markFollowUpSent(lead.id);
    return { ok: true, sentToday: today + 1, message: `Follow-up ${step} sent to ${lead.name}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, stop: /auth|credentials|535|534|limit|quota|421|454|550/i.test(msg), sentToday: today, message: `${lead.name}: ${msg.slice(0, 200)}` };
  }
}

export async function leCheckReplies(): Promise<ActionState> {
  await requireAdmin();
  const { checkReplies } = await import("@/lib/leadengine/mailer");
  try {
    const r = await checkReplies();
    refresh();
    const parts = [
      r.replied.length ? `${r.replied.length} replied: ${r.replied.slice(0, 5).join(", ")}` : "No new replies",
      r.stopped.length ? `${r.stopped.length} asked to stop (marked not interested)` : null,
    ].filter(Boolean);
    return { ok: true, message: `${parts.join(" · ")} (${r.checked} inbox emails checked).` };
  } catch (e) {
    return { message: e instanceof Error ? e.message : String(e) };
  }
}

export async function leSetDailyCap(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const cap = Math.max(5, Math.min(40, Number(form.get("dailyCap")) || 20));
  await setSetting("dailyCap", String(cap));
  refresh();
  return { ok: true, message: `Daily limit: ${cap} emails.` };
}
