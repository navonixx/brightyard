"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { saveSetting } from "@/lib/data";
import { autoBuildLead } from "@/lib/autobuild";
import { clearQueue, harvestStep, promoteProspects, queueHarvest, retryFailed, type HarvestProgress } from "@/lib/harvest";
import type { ActionState } from "./actions";

const clean = (values: FormDataEntryValue[]) =>
  [...new Set(values.map((v) => String(v).trim()).filter(Boolean))].slice(0, 1000);

export async function queueHarvestAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const niches = clean(form.getAll("niche")).map((n) => n.toLowerCase());
  const markets = clean(form.getAll("market")).filter((m) => /^[^,]{2,40},\s*[A-Za-z]{2}$/.test(m));
  const lookupCap = Number(form.get("lookupCap"));
  if (Number.isFinite(lookupCap) && lookupCap >= 100) await saveSetting("harvestLookupCap", String(Math.round(lookupCap)));
  const searchCap = Number(form.get("searchCap"));
  if (Number.isFinite(searchCap) && searchCap >= 100) await saveSetting("harvestMonthlyCap", String(Math.round(searchCap)));
  if (!niches.length || !markets.length) {
    refresh();
    return { ok: true, message: "Limits saved. (Pick at least one niche and one city to queue searches.)" };
  }
  const added = await queueHarvest(niches, markets, form.get("order") === "city" ? "city" : "niche");
  refresh();
  return {
    ok: true,
    message: added
      ? `Queued ${added} searches (${niches.length} niche${niches.length === 1 ? "" : "s"} × ${markets.length} cit${markets.length === 1 ? "y" : "ies"}). Press Start below.`
      : "Limits saved. Those niche × city searches were already in the queue or done.",
  };
}

export async function harvestStepAction(search = true): Promise<HarvestProgress> {
  await requireAdmin();
  return harvestStep({ search: search !== false });
}

export async function clearQueueAction(): Promise<ActionState> {
  await requireAdmin();
  const n = await clearQueue();
  refresh();
  return { ok: true, message: `Removed ${n} unfinished searches. Businesses already found are kept.` };
}

export async function retryFailedAction(): Promise<ActionState> {
  await requireAdmin();
  const n = await retryFailed();
  refresh();
  return { ok: true, message: `Re-queued ${n} failed searches and failed website checks.` };
}

export async function promoteAction(ids: number[], build: boolean): Promise<ActionState> {
  await requireAdmin();
  const picked = ids.filter(Number.isInteger).slice(0, build ? 5 : 200);
  if (!picked.length) return { message: "Tick at least one business first." };
  const { leadIds, created } = await promoteProspects(picked);
  if (!build) {
    refresh();
    return { ok: true, message: `Added ${created} to Leads${leadIds.length - created ? ` (${leadIds.length - created} were already there)` : ""}.` };
  }
  const results = await Promise.allSettled(leadIds.map((id) => autoBuildLead(id)));
  const ok = results.filter((r) => r.status === "fulfilled" && r.value.ok).length;
  refresh();
  return {
    ok: ok > 0,
    message: `Built ${ok} of ${leadIds.length} redesign(s) with personal emails${ok < leadIds.length ? " — the rest had no readable website or the AI call failed; build those from the lead page" : ""}. See Before & After.`,
  };
}
