import { Suspense } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listLeads } from "@/lib/data";
import { markEmailedAction } from "../../actions";
import { ActionButton } from "@/components/admin/ui";
import { PageSkeleton } from "@/components/admin/skeleton";

export default function OutreachPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Outreach />
    </Suspense>
  );
}

async function Outreach() {
  await requireAdmin();
  const ready = await listLeads("sample_ready");
  const sendable = ready.filter((l) => l.email && l.emailBody);
  const missingEmail = ready.filter((l) => !l.email);
  const missingDraft = ready.filter((l) => l.email && !l.emailBody);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Outreach</h1>
        <p className="mt-1 text-sm text-muted">
          Ready leads ko CSV mein export karo → Instantly/Smartlead mein import → sequence chalao → yahan &quot;Mark as emailed&quot;.
        </p>
      </div>

      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-display text-4xl font-semibold">{sendable.length}</p>
            <p className="text-sm text-muted">leads ready to send (preview + email + draft)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/admin/export" className="btn-primary">
              <Download className="size-4" /> Download CSV
            </a>
            {sendable.length ? (
              <ActionButton
                action={markEmailedAction.bind(null, sendable.map((l) => l.id))}
                className="btn-ghost"
                confirm={`Mark ${sendable.length} leads as emailed?`}
              >
                Mark all as emailed
              </ActionButton>
            ) : null}
          </div>
        </div>
        <p className="mt-4 rounded-lg bg-paper p-3 text-xs text-muted">
          CSV columns: email, first_name, company, city, preview_link, subject, body (footer included). Instantly mein
          custom variables ke roop mein map karo. Har inbox se 20–30/day se zyada mat bhejna.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <LeadList title="Need an email address" leads={missingEmail} empty="All ready leads have an email." />
        <LeadList title="Need an email draft" leads={missingDraft} empty="Every lead with an email has a draft." />
      </div>
    </div>
  );
}

function LeadList({ title, leads, empty }: { title: string; leads: { id: string; businessName: string; city: string | null }[]; empty: string }) {
  return (
    <section className="card p-6">
      <h2 className="font-semibold">
        {title} <span className="text-muted">({leads.length})</span>
      </h2>
      {leads.length ? (
        <ul className="mt-3 divide-y divide-line text-sm">
          {leads.slice(0, 30).map((lead) => (
            <li key={lead.id} className="py-2">
              <Link href={`/admin/leads/${lead.id}`} className="font-medium hover:text-brand">
                {lead.businessName}
              </Link>
              <span className="text-muted"> · {lead.city ?? "—"}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">{empty}</p>
      )}
    </section>
  );
}
