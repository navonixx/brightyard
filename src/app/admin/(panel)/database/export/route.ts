import { isAdmin } from "@/lib/auth";
import { prospectsForExport, type ProspectFilter } from "@/lib/harvest";
import { nicheLabel } from "@/lib/niches";

const csv = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  // Quote everything; neutralise leading formula characters for spreadsheet apps.
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

export async function GET(request: Request) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const params = new URL(request.url).searchParams;
  const get = (k: string) => params.get(k) || undefined;
  const filter: ProspectFilter = {
    niche: get("niche"),
    market: get("market"),
    email: get("email") as ProspectFilter["email"],
    site: get("site") as ProspectFilter["site"],
    lead: get("lead") as ProspectFilter["lead"],
    q: get("q"),
  };
  const rows = await prospectsForExport(filter);
  const header = ["business", "niche", "city", "state", "email", "phone", "website", "weakness_score", "top_issue", "rating", "reviews", "address"];
  const lines = rows.map((p) =>
    [
      p.name,
      nicheLabel(p.niche),
      p.city ?? p.market.split(",")[0],
      p.state ?? p.market.split(",")[1]?.trim(),
      p.email,
      p.phone,
      p.website,
      p.siteScore,
      p.siteIssues?.[0],
      p.rating,
      p.reviewCount,
      p.address,
    ]
      .map(csv)
      .join(","),
  );
  return new Response([header.join(","), ...lines].join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="alderwell-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
