import { Suspense } from "react";
import Link from "next/link";
import { Download, ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { emailedToday, getSettings, listLeads } from "@/lib/data";
import { composeEmail, gmailComposeUrl } from "@/lib/email";
import { markEmailedAction } from "../../actions";
import { ActionButton } from "@/components/admin/ui";
import { PageSkeleton } from "@/components/admin/skeleton";

// A fresh Gmail account should stay well under this while it builds a sending history.
const DAILY_LIMIT = 20;

export default function OutreachPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Outreach />
    </Suspense>
  );
}

async function Outreach() {
  await requireAdmin();
  const [ready, settings, sentToday] = await Promise.all([listLeads("sample_ready"), getSettings(), emailedToday()]);
  const sendable = ready.filter((l) => l.email && l.emailBody);
  const missingEmail = ready.filter((l) => !l.email);
  const missingDraft = ready.filter((l) => l.email && !l.emailBody);
  const left = Math.max(0, DAILY_LIMIT - sentToday);
  const setupMissing = !settings.senderName || !settings.businessAddress || !settings.senderEmail;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Outreach</h1>
        <p className="mt-1 text-sm text-muted">
          Gmail se bhejo: &quot;Open in Gmail&quot; dabao → email padho → Send → yahan &quot;Sent&quot;. Preview link ka khulna dashboard par dikhega.
        </p>
      </div>

      {setupMissing ? (
        <p className="rounded-xl bg-sun-soft p-4 text-sm">
          Pehle <Link href="/admin/settings" className="font-semibold underline">Settings</Link> mein sender name, business address aur
          sending Gmail bharo. Address US email law (CAN-SPAM) ke liye har email ke footer mein zaroori hai.
        </p>
      ) : null}

      <section className="card p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Aaj bheje</p>
            <p className="font-display text-4xl font-semibold">
              {sentToday} <span className="text-lg font-medium text-muted">/ {DAILY_LIMIT}</span>
            </p>
          </div>
          <p className="max-w-sm text-sm text-muted">
            Naye Gmail se pehle hafte roz 10, phir 20 tak. Zyada bhejoge to Gmail account block kar sakta hai.
          </p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-line/60">
          <div className="h-full bg-brand" style={{ width: `${Math.min(100, (sentToday / DAILY_LIMIT) * 100)}%` }} />
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-semibold">
            Send queue <span className="text-muted">({sendable.length})</span>
          </h2>
          {left === 0 && sendable.length ? <span className="text-sm text-danger">Aaj ki limit poori — kal bhejo</span> : null}
        </div>
        {sendable.length ? (
          <ul className="divide-y divide-line">
            {sendable.slice(0, 40).map((lead) => {
              const body = composeEmail(lead.emailBody, settings);
              const href = gmailComposeUrl({
                to: lead.email!,
                subject: lead.emailSubject ?? "",
                body,
                account: settings.senderEmail || undefined,
              });
              return (
                <li key={lead.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <Link href={`/admin/leads/${lead.id}`} className="font-medium hover:text-brand">
                      {lead.businessName}
                    </Link>
                    <p className="truncate text-sm text-muted">
                      {lead.email} · {lead.city ?? "—"} · <span className="italic">{lead.emailSubject}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <a href={href} target="_blank" rel="noopener noreferrer" className="btn-primary">
                      Open in Gmail <ExternalLink className="size-3.5" />
                    </a>
                    <ActionButton action={markEmailedAction.bind(null, [lead.id])} className="btn-ghost" pendingText="Saving…">
                      Sent
                    </ActionButton>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="p-6 text-sm text-muted">
            Queue khaali hai. Leads mein jaakar preview copy aur email draft banao — phir wo yahan aa jayenge.
          </p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <LeadList title="Need an email address" leads={missingEmail} empty="All ready leads have an email." />
        <LeadList title="Need an email draft" leads={missingDraft} empty="Every lead with an email has a draft." />
      </div>

      <section className="card p-6">
        <h2 className="font-semibold">Baad mein: domain + Instantly</h2>
        <p className="mt-1 text-sm text-muted">
          Jab cold-email domain aur Instantly le loge, tab yahan se CSV export karke bulk sequence chala sakte ho.
        </p>
        <a href="/admin/export" className="btn-ghost mt-4">
          <Download className="size-4" /> Download CSV
        </a>
      </section>
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
