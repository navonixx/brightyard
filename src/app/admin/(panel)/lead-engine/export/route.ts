import { isAdmin } from "@/lib/auth";
import { readFilter } from "@/lib/leadengine/filter";
import { leadsForExport } from "@/lib/leadengine/leads";
import { nicheLabel } from "@/lib/leadengine/niches";

/** CSV of the filtered Lead Engine leads (formula characters neutralised for spreadsheets). */
export async function GET(request: Request) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const rows = await leadsForExport(readFilter(Object.fromEntries(new URL(request.url).searchParams)));
  const cell = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
  };
  const head = ["name", "type", "city", "state", "phone", "email", "website", "facebook", "instagram", "sources", "can_pay", "pain", "biggest_problem", "suggested_solution", "why_they_can_pay", "status"];
  const lines = rows.map((l) =>
    [l.name, l.kind === "business" ? nicheLabel(l.niche) : l.category, l.city, l.state, l.phone, l.email, l.website, l.socials?.facebook, l.socials?.instagram, l.sources.join(" "),
      l.pay_score, l.pain_score, l.pain_signals?.[0]?.label, l.pain_signals?.[0]?.solution, l.pay_signals?.map((x) => x.label).join("; "), l.status].map(cell).join(","),
  );
  return new Response([head.join(","), ...lines].join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="lead-engine-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
