import { isAdmin } from "@/lib/auth";
import { getSettings, listLeads } from "@/lib/data";
import { composeEmail } from "@/lib/email";
import { siteUrl } from "@/lib/brand";

function csvCell(value: string | null | undefined): string {
  const text = (value ?? "").replace(/\r\n/g, "\n");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET() {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });

  const [leads, settings] = await Promise.all([listLeads("sample_ready"), getSettings()]);
  const rows = leads
    .filter((l) => l.email && l.emailBody)
    .map((l) =>
      [
        l.email,
        l.ownerName?.split(" ")[0] ?? "",
        l.businessName,
        l.city,
        `${siteUrl()}/p/${l.token}`,
        l.emailSubject,
        composeEmail(l.emailBody, settings),
      ]
        .map(csvCell)
        .join(","),
    );
  const csv = ["email,first_name,company,city,preview_link,subject,body", ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="brightyard-outreach.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
