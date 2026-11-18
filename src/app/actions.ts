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
  const services = form
    .getAll("services")
    .map(String)
    .filter((s) => ["Website", "AI photos", "Promo video"].includes(s));
  const fields = {
    businessName,
    email,
    ownerName: get("name"),
    city: get("city"),
    website: get("website"),
    trade: (TRADES.includes(tradeValue as Trade) ? tradeValue : "other") as Trade,
    notes: services.length ? `Wants: ${services.join(", ")}` : null,
  };
  const id = await createLead({ ...fields, source: "inbound", score: scoreLead(fields) + 50 });
  if (id) await logEvent(id, "inbound");
  const wants = services.length ? `\nWants: ${services.join(", ")}` : "";
  await notify(`📥 New inbound request: ${businessName} (${fields.city ?? "?"}) — ${email}${wants}`);
  return { ok: true, message: "Got it! Your free sample will land in your inbox within 48 hours." };
}
