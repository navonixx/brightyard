import type { LeadFilter } from "./leads";

/** URL search params → lead filter (shared by the Leads page and CSV export). */
export function readFilter(sp: Record<string, string | string[] | undefined>): LeadFilter {
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "") || undefined;
  return {
    source: s("source"),
    niche: s("niche"),
    state: s("state"),
    city: s("city"),
    kind: s("kind"),
    status: s("status"),
    email: s("email"),
    site: s("site"),
    minPay: Number(s("minPay") ?? 0) || undefined,
    minPain: Number(s("minPain") ?? 0) || undefined,
    q: s("q"),
    sort: s("sort"),
    page: Number(s("page") ?? 1) || 1,
  };
}
