"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { ADMIN_COOKIE, createSessionValue, passwordMatches } from "@/lib/session";
import {
  createLead,
  deleteLead,
  getLead,
  listLeads,
  logEvent,
  saveSettings,
  setGuideStep,
  updateLead,
} from "@/lib/data";
import { LEAD_STATUSES, TRADES, type LeadImage, type LeadStatus, type Trade } from "@/lib/db/schema";
import { scoreLead, searchPlaces } from "@/lib/places";
import { aiLabel, generateEmail, generateSample } from "@/lib/ai";
import { uploadImage } from "@/lib/imagekit";
import { siteUrl } from "@/lib/brand";
import { autoBuildLead } from "@/lib/autobuild";
import { checkSite, WEAK_SITE_THRESHOLD } from "@/lib/sitecheck";

export type ActionState = { ok?: boolean; message?: string } | null;

const str = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
};
const num = (form: FormData, key: string) => {
  const value = str(form, key);
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const trade = (value: string | null): Trade =>
  TRADES.includes(value as Trade) ? (value as Trade) : "other";

// ─── Auth ──────────────────────────────────────────────────────────────

export async function login(_: ActionState, form: FormData): Promise<ActionState> {
  if (!process.env.ADMIN_PASSWORD) {
    return { message: "ADMIN_PASSWORD is not set in the environment." };
  }
  if (!passwordMatches(String(form.get("password") ?? ""))) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { message: "Wrong password." };
  }
  const { value, expires } = createSessionValue();
  (await cookies()).set(ADMIN_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
  redirect("/admin");
}

export async function logout(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

// ─── Guide + settings ──────────────────────────────────────────────────

export async function toggleGuideStep(stepId: string, done: boolean): Promise<void> {
  await requireAdmin();
  await setGuideStep(stepId, done);
  refresh();
}

export async function saveSettingsAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  await saveSettings({
    startDate: String(form.get("startDate") ?? ""),
    goalUsd: String(form.get("goalUsd") ?? "100"),
    senderName: String(form.get("senderName") ?? ""),
    senderEmail: String(form.get("senderEmail") ?? "").trim().toLowerCase(),
    businessAddress: String(form.get("businessAddress") ?? ""),
    paypalLink: (() => {
      const user = String(form.get("paypalUser") ?? "")
        .trim()
        .replace(/^https?:\/\/(www\.)?paypal\.me\//i, "")
        .replace(/[^A-Za-z0-9_.-]/g, "");
      return user ? `https://paypal.me/${user}` : "";
    })(),
  });
  refresh();
  return { ok: true, message: "Saved." };
}

// ─── Leads ─────────────────────────────────────────────────────────────

export async function addLeadAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const businessName = str(form, "businessName");
  if (!businessName) return { message: "Business name is required." };
  const fields = {
    businessName,
    trade: trade(str(form, "trade")),
    ownerName: str(form, "ownerName"),
    city: str(form, "city"),
    state: str(form, "state")?.toUpperCase() ?? null,
    email: str(form, "email")?.toLowerCase() ?? null,
    phone: str(form, "phone"),
    website: str(form, "website"),
    rating: num(form, "rating"),
    reviewCount: num(form, "reviewCount"),
    notes: str(form, "notes"),
  };
  const id = await createLead({ ...fields, source: "manual", score: scoreLead(fields) });
  redirect(`/admin/leads/${id}`);
}

export async function findLeadsAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const what = str(form, "trade");
  const where = str(form, "location");
  if (!what || !where) return { message: "Pick a trade and a city." };
  try {
    const results = await searchPlaces(`${what.replace("_", " ")} in ${where}`);
    let added = 0;
    for (const place of results) {
      const fields = {
        businessName: place.name,
        trade: trade(what),
        phone: place.phone,
        website: place.website,
        rating: place.rating,
        reviewCount: place.reviewCount,
        city: place.city,
        state: place.state,
        placeId: place.placeId,
      };
      const id = await createLead({ ...fields, source: "places", score: scoreLead(fields) });
      if (id) added++;
    }
    refresh();
    return {
      ok: true,
      message: `Found ${results.length} businesses, added ${added} new (duplicates skipped).`,
    };
  } catch (error) {
    return { message: error instanceof Error ? error.message : "Search failed." };
  }
}

/** CSV with header: business,trade,owner,email,phone,website,city,state */
export async function importCsvAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const raw = str(form, "csv");
  if (!raw) return { message: "Paste CSV rows first." };
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  const header = lines[0].toLowerCase().includes("business") ? lines.shift() : null;
  const cols = (header ?? "business,trade,owner,email,phone,website,city,state")
    .toLowerCase()
    .split(",")
    .map((c) => c.trim());
  let added = 0;
  for (const line of lines) {
    const cells = line.split(",").map((c) => c.trim());
    const get = (name: string) => cells[cols.indexOf(name)] || null;
    const businessName = get("business");
    if (!businessName) continue;
    const fields = {
      businessName,
      trade: trade(get("trade")),
      ownerName: get("owner"),
      email: get("email")?.toLowerCase() ?? null,
      phone: get("phone"),
      website: get("website"),
      city: get("city"),
      state: get("state")?.toUpperCase() ?? null,
    };
    if (await createLead({ ...fields, source: "csv", score: scoreLead(fields) })) added++;
  }
  refresh();
  return { ok: true, message: `Imported ${added} leads.` };
}

export async function updateLeadAction(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const lead = await getLead(id);
  if (!lead) return { message: "Lead not found." };
  const fields = {
    businessName: str(form, "businessName") ?? lead.businessName,
    trade: trade(str(form, "trade")),
    ownerName: str(form, "ownerName"),
    city: str(form, "city"),
    state: str(form, "state")?.toUpperCase() ?? null,
    email: str(form, "email")?.toLowerCase() ?? null,
    phone: str(form, "phone"),
    website: str(form, "website"),
    rating: num(form, "rating"),
    reviewCount: num(form, "reviewCount"),
    notes: str(form, "notes"),
    videoUrl: str(form, "videoUrl"),
    theme: str(form, "theme"),
  };
  await updateLead(id, { ...fields, score: scoreLead(fields) });
  refresh();
  return { ok: true, message: "Saved." };
}

export async function setStatusAction(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const status = str(form, "status") as LeadStatus | null;
  if (!status || !LEAD_STATUSES.includes(status)) return { message: "Invalid status." };
  const paidAmount = num(form, "paidAmount") ?? 0;
  await updateLead(id, { status, paidAmount: Math.max(0, Math.round(paidAmount)) });
  await logEvent(id, "status", { status, paidAmount });
  refresh();
  return { ok: true, message: "Updated." };
}

export async function deleteLeadAction(id: string): Promise<void> {
  await requireAdmin();
  await deleteLead(id);
  redirect("/admin/leads");
}

// ─── Workspace: preview content ───────────────────────────────────────

export async function generateSampleAction(id: string): Promise<ActionState> {
  await requireAdmin();
  const lead = await getLead(id);
  if (!lead) return { message: "Lead not found." };
  const { sample, source } = await generateSample(lead);
  await updateLead(id, {
    sample,
    status: lead.status === "new" ? "sample_ready" : lead.status,
  });
  await logEvent(id, "sample_generated", { source });
  refresh();
  return {
    ok: true,
    message: source === "ai" ? `Copy written by ${aiLabel()}.` : "Template copy added (no AI key, or the AI call failed — check the server log).",
  };
}

export async function saveSampleAction(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const lead = await getLead(id);
  if (!lead) return { message: "Lead not found." };
  const services = (str(form, "services") ?? "")
    .split(/\r?\n/)
    .map((line) => line.split(/\s+[—|-]\s+/))
    .filter(([title]) => title?.trim())
    .map(([title, ...rest]) => ({ title: title.trim(), description: rest.join(" — ").trim() }));
  const whyUs = (str(form, "whyUs") ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  await updateLead(id, {
    sample: {
      headline: str(form, "headline") ?? "",
      subheadline: str(form, "subheadline") ?? "",
      services,
      whyUs,
      about: str(form, "about") ?? "",
      cta: str(form, "cta") ?? "Get a free quote",
      serviceArea: str(form, "serviceArea") ?? "",
    },
    status: lead.status === "new" ? "sample_ready" : lead.status,
  });
  refresh();
  return { ok: true, message: "Preview updated." };
}

export async function uploadImagesAction(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const lead = await getLead(id);
  if (!lead) return { message: "Lead not found." };
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const url = str(form, "url");
  const alt = str(form, "alt") ?? `${lead.businessName} work photo`;
  const added: LeadImage[] = [];
  try {
    for (const file of files.slice(0, 6)) {
      added.push({ url: await uploadImage(file, `/alderwell/${lead.id}`), alt });
    }
  } catch (error) {
    return { message: error instanceof Error ? error.message : "Upload failed." };
  }
  if (url) {
    if (!/^https:\/\//i.test(url)) return { message: "Image URL must start with https://" };
    added.push({ url, alt });
  }
  if (!added.length) return { message: "Choose a file or paste an image URL." };
  await updateLead(id, { images: [...lead.images, ...added].slice(0, 8) });
  refresh();
  return { ok: true, message: `Added ${added.length} image(s).` };
}

export async function removeImageAction(id: string, index: number): Promise<void> {
  await requireAdmin();
  const lead = await getLead(id);
  if (!lead) return;
  await updateLead(id, { images: lead.images.filter((_, i) => i !== index) });
  refresh();
}

export async function moveImageFirstAction(id: string, index: number): Promise<void> {
  await requireAdmin();
  const lead = await getLead(id);
  if (!lead || !lead.images[index]) return;
  const images = [...lead.images];
  const [picked] = images.splice(index, 1);
  await updateLead(id, { images: [picked, ...images] });
  refresh();
}

// ─── Workspace: email ─────────────────────────────────────────────────

export async function generateEmailAction(id: string): Promise<ActionState> {
  await requireAdmin();
  const lead = await getLead(id);
  if (!lead) return { message: "Lead not found." };
  const link = `${siteUrl()}/p/${lead.token}`;
  const { subject, body, source } = await generateEmail(lead, link);
  await updateLead(id, { emailSubject: subject, emailBody: body });
  refresh();
  return { ok: true, message: source === "ai" ? `Draft written by ${aiLabel()}.` : "Template draft added (no AI key, or the AI call failed)." };
}

export async function saveEmailAction(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  await updateLead(id, { emailSubject: str(form, "subject"), emailBody: str(form, "body") });
  refresh();
  return { ok: true, message: "Draft saved." };
}

export async function markEmailedAction(ids: string[]): Promise<void> {
  await requireAdmin();
  for (const id of ids) {
    const lead = await getLead(id);
    if (!lead || lead.emailedAt) continue;
    await updateLead(id, {
      emailedAt: new Date(),
      status: ["new", "sample_ready"].includes(lead.status) ? "emailed" : lead.status,
    });
    await logEvent(id, "emailed");
  }
  refresh();
}

// ─── Automation ────────────────────────────────────────────────────────

export async function autoBuildAction(id: string): Promise<ActionState> {
  await requireAdmin();
  const result = await autoBuildLead(id);
  refresh();
  return result;
}

/**
 * Finds businesses with their own website, opens every site, and builds a redesign + email
 * only for the weakest ones. Strong sites are skipped and never added as leads.
 */
export async function findAndBuildAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const what = str(form, "trade");
  const where = str(form, "location");
  const limit = Math.min(5, Math.max(1, num(form, "count") ?? 3));
  if (!what || !where) return { message: "Pick a trade and a city." };

  try {
    const results = await searchPlaces(`${what.replace("_", " ")} in ${where}`);
    // Small local businesses with their own site: skip social-only pages and big-review chains.
    const candidates = results
      .filter((p) => p.website && !/facebook\.com|instagram\.com|yelp\.com/i.test(p.website) && (p.reviewCount ?? 0) <= 400)
      .slice(0, 14);

    const checks = await Promise.all(candidates.map(async (place) => ({ place, check: await checkSite(place.website!) })));
    const weak = checks
      .filter((c) => c.check.reachable && c.check.score >= WEAK_SITE_THRESHOLD)
      .sort((a, b) => b.check.score - a.check.score);
    const strong = checks.filter((c) => c.check.reachable && c.check.score < WEAK_SITE_THRESHOLD).length;
    const broken = checks.filter((c) => !c.check.reachable).length;

    const created: string[] = [];
    for (const { place, check } of weak) {
      if (created.length >= limit) break;
      const fields = {
        businessName: place.name,
        trade: trade(what),
        phone: place.phone,
        website: place.website,
        // Ratings below 4.5 stay off the redesigned site.
        rating: (place.rating ?? 0) >= 4.5 ? place.rating : null,
        reviewCount: (place.rating ?? 0) >= 4.5 ? place.reviewCount : null,
        city: place.city,
        state: place.state,
        placeId: place.placeId,
        notes: place.rating ? `Google: ${place.rating}★ (${place.reviewCount ?? 0} reviews)` : null,
      };
      const id = await createLead({ ...fields, source: "places", score: scoreLead(fields) });
      if (!id) continue; // already a lead
      await updateLead(id, { siteScore: check.score, siteIssues: check.issues, siteCheckedAt: new Date() });
      created.push(id);
    }

    const built = await Promise.allSettled(created.map((id) => autoBuildLead(id)));
    const ok = built.filter((r) => r.status === "fulfilled" && r.value.ok).length;
    refresh();
    return {
      ok: true,
      message:
        `Opened ${checks.length} websites: ${weak.length} weak, ${strong} already good (skipped)${broken ? `, ${broken} didn't load` : ""}. ` +
        `Built ${ok} redesign(s)${created.length - ok ? `, ${created.length - ok} need a manual build` : ""}.` +
        (created.length ? " Open the Before & After page to review them." : " Try another city."),
    };
  } catch (error) {
    return { message: error instanceof Error ? error.message : "Search failed." };
  }
}

/** Opens and scores the current website of up to 12 leads that haven't been checked yet. */
export async function checkWebsitesAction(): Promise<ActionState> {
  await requireAdmin();
  const social = /facebook.com|instagram.com|yelp.com|linktr.ee/i;
  const pending = (await listLeads()).filter((l) => l.website && !social.test(l.website) && !l.siteCheckedAt).slice(0, 12);
  if (!pending.length) return { ok: true, message: "Every lead with a website has already been checked." };
  const results = await Promise.all(
    pending.map(async (lead) => {
      const check = await checkSite(lead.website!);
      await updateLead(lead.id, { siteScore: check.reachable ? check.score : null, siteIssues: check.issues, siteCheckedAt: new Date() });
      return check;
    }),
  );
  refresh();
  const weak = results.filter((c) => c.reachable && c.score >= WEAK_SITE_THRESHOLD).length;
  return { ok: true, message: `Checked ${results.length} websites: ${weak} weak — worth a redesign.` };
}

export async function checkSiteAction(id: string): Promise<ActionState> {
  await requireAdmin();
  const lead = await getLead(id);
  if (!lead?.website) return { message: "This lead has no website." };
  const check = await checkSite(lead.website);
  await updateLead(id, { siteScore: check.reachable ? check.score : null, siteIssues: check.issues, siteCheckedAt: new Date() });
  refresh();
  return { ok: true, message: check.reachable ? `Weakness score ${check.score}/100.` : check.issues[0] };
}

export async function markFollowUpAction(id: string, step: number): Promise<void> {
  await requireAdmin();
  await logEvent(id, "followup", { step });
  refresh();
}
