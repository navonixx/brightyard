import { Suspense } from "react";
import Link from "next/link";
import { Download, ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { emailedToday, followUpsDue, getSettings, listLeads } from "@/lib/data";
import { siteUrl } from "@/lib/brand";
import { composeEmail, followUpBody, gmailComposeUrl } from "@/lib/email";
import { markEmailedAction, markFollowUpAction } from "../../actions";
import { ActionButton } from "@/components/admin/ui";
import { PageSkeleton } from "@/components/admin/skeleton";
import { SiteLinks } from "@/components/admin/site-links";

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
  // eslint-disable-next-line react-hooks/purity -- Server Component, rendered once per request
  const followUps = await followUpsDue(Date.now());
  const setupMissing = !settings.senderName || !settings.businessAddress || !settings.senderEmail;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Outreach</h1>
        <p className="mt-1 text-sm text-muted">
          Click &quot;Open in Gmail&quot; → read → Send → click &quot;Sent&quot; here. When a prospect opens their link, it shows on the dashboard.
        </p>
      </div>

      {setupMissing ? (
        <p className="rounded-xl bg-sun-soft p-4 text-sm">
          Finish <Link href="/admin/settings" className="font-semibold underline">Settings</Link> first: sender name, sending Gmail and
          postal address. US law (CAN-SPAM) requires the address in every email footer.
        </p>
      ) : null}

      <section className="card p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Sent today</p>
            <p className="font-display text-4xl font-semibold">
              {sentToday} <span className="text-lg font-medium text-muted">/ {DAILY_LIMIT}</span>
            </p>
          </div>
          <p className="max-w-sm text-sm text-muted">
            New Gmail account: 10 a day in the first week, then up to 20. Sending more can get the account restricted.
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
          {left === 0 && sendable.length ? <span className="text-sm text-danger">Daily limit reached — send the rest tomorrow</span> : null}
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
                    <SiteLinks website={lead.website} token={lead.token} className="mt-1" />
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
            The queue is empty. Use &quot;Find &amp; build&quot; on the Leads page and new leads will appear here.
          </p>
        )}
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-semibold">
            Follow-ups due <span className="text-muted">({followUps.length})</span>
          </h2>
          <p className="mt-0.5 text-sm text-muted">On day 3 and day 7, only for leads that haven&apos;t replied. Best practice: reply to your original email in Gmail so it stays in one thread — this button opens a new email.</p>
        </div>
        {followUps.length ? (
          <ul className="divide-y divide-line">
            {followUps.map(({ lead, step, daysSince }) => {
              const body = composeEmail(
                followUpBody({ ownerName: lead.ownerName, viewCount: lead.viewCount, step, link: siteUrl() + "/p/" + lead.token }),
                settings,
              );
              const href = lead.email
                ? gmailComposeUrl({ to: lead.email, subject: "Re: " + (lead.emailSubject ?? ""), body, account: settings.senderEmail || undefined })
                : null;
              return (
                <li key={lead.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <Link href={"/admin/leads/" + lead.id} className="font-medium hover:text-brand">
                      {lead.businessName}
                    </Link>
                    <p className="text-sm text-muted">
                      Follow-up {step} of 2 · emailed {daysSince} days ago · {lead.viewCount ? "opened " + lead.viewCount + "×" : "not opened"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {href ? (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="btn-primary">
                        Open in Gmail <ExternalLink className="size-3.5" />
                      </a>
                    ) : (
                      <span className="text-sm text-muted">contact form</span>
                    )}
                    <ActionButton action={markFollowUpAction.bind(null, lead.id, step)} className="btn-ghost" pendingText="Saving…">
                      Sent
                    </ActionButton>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="p-6 text-sm text-muted">No follow-ups due right now.</p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <LeadList title="Need an email address" leads={missingEmail} empty="All ready leads have an email." />
        <LeadList title="Need an email draft" leads={missingDraft} empty="Every lead with an email has a draft." />
      </div>

      <section className="card p-6">
        <h2 className="font-semibold">Later: own domain + Instantly</h2>
        <p className="mt-1 text-sm text-muted">
          Once you have a sending domain and Instantly, export a CSV here to run sequences in bulk.
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
