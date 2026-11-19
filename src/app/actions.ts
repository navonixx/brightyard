"use server";

import { createLead, logEvent } from "@/lib/data";
import { TRADES, type Trade } from "@/lib/db/schema";
import { scoreLead } from "@/lib/places";
import { notify } from "@/lib/notify";

export type InquiryState = { ok?: boolean; message?: string } | null;

/** Public "get my free preview" form on the landing page. */
export async function submitInquiry(_: InquiryState, form: FormData): Promise<InquiryState> {
  // Honeypot: real people never fill this hidden field.
  if (String(form.get("company_url") ?? "")) return { ok: true };

  const get = (key: string) => String(form.get(key) ?? "").trim().slice(0, 300) || null;
  const businessName = get("businessName");
  const email = get("email")?.toLowerCase() ?? null;
  if (!businessName || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { message: "Please add your business name and a valid email." };
  }
  const tradeValue = get("trade");
  const needs = form
    .getAll("need")
    .map((v) => String(v).trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 12);
  const about = get("about");
  const fields = {
    businessName,
    email,
    ownerName: get("name"),
    city: get("city"),
    website: get("website"),
    trade: (TRADES.includes(tradeValue as Trade) ? tradeValue : "other") as Trade,
    notes: [about && `Business: ${about}`, needs.length && `Wants: ${needs.join(", ")}`].filter(Boolean).join(" · ") || null,
  };
  const id = await createLead({ ...fields, source: "inbound", score: scoreLead(fields) + 50 });
  if (id) await logEvent(id, "inbound");
  const wants = needs.length ? `\nWants: ${needs.join(", ")}` : "";
  await notify(`📥 New inbound request: ${businessName} (${fields.city ?? "?"}) — ${email}${wants}`);
  const websiteOnly = needs.every((n) => /website/i.test(n));
  return {
    ok: true,
    message: websiteOnly
      ? "Got it! Your free website preview will land in your inbox within 48 hours."
      : "Got it! We'll reply within a day with ideas for your free first project — and your website preview within 48 hours if you asked for one.",
  };
}
