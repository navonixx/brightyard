"use server";

import { isAdmin } from "@/lib/auth";
import { getLeadByToken, getSettings, logEvent, updateLead } from "@/lib/data";
import { notify } from "@/lib/notify";

const PRE_VIEW_STATUSES = ["new", "sample_ready", "emailed"];

/** Called once when a prospect opens their preview. Admin visits are ignored. */
export async function recordView(token: string): Promise<void> {
  if (await isAdmin()) return;
  const lead = await getLeadByToken(token);
  if (!lead || lead.status === "opted_out") return;
  const now = new Date();
  await updateLead(lead.id, {
    viewCount: lead.viewCount + 1,
    firstViewedAt: lead.firstViewedAt ?? now,
    lastViewedAt: now,
    status: PRE_VIEW_STATUSES.includes(lead.status) ? "viewed" : lead.status,
  });
  await logEvent(lead.id, "view", { n: lead.viewCount + 1 });
  if (lead.viewCount === 0 || lead.viewCount === 2) {
    await notify(`👀 ${lead.businessName} (${lead.city ?? "?"}) opened their preview — view #${lead.viewCount + 1}`);
  }
}

export type ClaimState = { ok?: boolean; message?: string; paypalLink?: string; amount?: number } | null;

export async function claimPreview(token: string, _: ClaimState, form: FormData): Promise<ClaimState> {
  const lead = await getLeadByToken(token);
  if (!lead) return { message: "This preview link is no longer active." };

  const amount = Math.round(Number(form.get("amount")));
  const email = String(form.get("email") ?? "").trim().slice(0, 200);
  const note = String(form.get("note") ?? "").trim().slice(0, 1000);
  if (!Number.isFinite(amount) || amount < 1 || amount > 5000) {
    return { message: "Please choose an amount." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { message: "Please enter a valid email so we can reach you." };
  }

  await updateLead(lead.id, {
    status: "interested",
    offerAmount: amount,
    email: lead.email ?? email,
  });
  await logEvent(lead.id, "claim", { amount, email, note });
  await notify(`💰 ${lead.businessName} wants to go live for $${amount}\nEmail: ${email}${note ? `\nNote: ${note}` : ""}`);

  const { paypalLink } = await getSettings();
  return { ok: true, amount, paypalLink: paypalLink || undefined };
}

export async function optOut(token: string): Promise<void> {
  const lead = await getLeadByToken(token);
  if (!lead) return;
  await updateLead(lead.id, { status: "opted_out" });
  await logEvent(lead.id, "opt_out");
  await notify(`🚫 ${lead.businessName} opted out.`);
}
