import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { getSetting, q } from "@/lib/leadengine/db";
import { followUpsDue } from "@/lib/leadengine/followups";
import type { Lead } from "@/lib/leadengine/leads";
import { mailReady, sentToday } from "@/lib/leadengine/mailer";
import { nicheLabel } from "@/lib/leadengine/niches";
import { draftEmail } from "@/lib/leadengine/outreach";
import { followUpDraft } from "@/lib/leadengine/replies";
import { ActionButton, ActionForm, SubmitButton } from "@/components/admin/ui";
import { PageSkeleton } from "@/components/admin/skeleton";
import { LeHeader } from "@/components/admin/lead-engine/tabs";
import { LeBulkSender, type Draft } from "@/components/admin/lead-engine/bulk-sender";
import { leCheckReplies, leSendFollowUp, leSendOne, leSendTest, leSetDailyCap } from "../../../lead-engine-actions";

// Each send and the inbox check run inside this page's server actions.
export const maxDuration = 60;

type SP = Promise<Record<string, string | string[] | undefined>>;

export default function SendPage({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Send searchParams={searchParams} />
    </Suspense>
  );
}

async function Send({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const n = [10, 20].includes(Number((await searchParams).n)) ? Number((await searchParams).n) : 10;
  const ready = mailReady();
  const [settings, cap, today, due] = await Promise.all([getSettings(), getSetting("dailyCap", "20").then(Number), sentToday(), followUpsDue()]);
  const me = { name: settings.senderName, company: "Alderwell Creative", site: "", address: settings.businessAddress };

  // Best hot leads first; topped up with other scored leads that have an email.
  const leads = await q<Lead>(
    `SELECT * FROM le_leads WHERE status = 'new' AND email IS NOT NULL AND enrich_status IN ('done','no_site','failed') AND pain_score >= 20
     ORDER BY (pay_score >= 30 AND pain_score >= 30) DESC, (pay_score * 0.4 + pain_score * 0.4 + LEAST(pay_score, pain_score) * 0.6) DESC, id
     LIMIT $1`,
    [n],
  );
  const drafts: Draft[] = leads.map((l) => {
    const d = draftEmail(l, me);
    return { id: l.id, name: l.name, email: l.email!, sub: [nicheLabel(l.niche), l.city].filter(Boolean).join(" · "), subject: d.subject, body: d.body, note: l.pain_signals?.[0]?.label };
  });
  const followUps: Draft[] = due.map((l) => {
    const d = followUpDraft(l, l.step, me);
    return { id: l.id, name: l.name, email: l.email!, sub: l.step === 1 ? "1st follow-up" : "last follow-up", subject: d.subject, body: d.body };
  });

  return (
    <div className="space-y-6">
      <LeHeader
        active="/admin/lead-engine/send"
        title="Send emails"
        intro="Review the next batch on one screen, press Send, and they go out from your Gmail one at a time with a random gap — no opening leads one by one. Replies come to your Gmail inbox as usual."
      />

      {!ready ? (
        <section className="card space-y-3 border-amber-200 bg-amber-50 p-5 text-sm">
          <h2 className="font-semibold">Connect your Gmail once (5 minutes)</h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Open <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-brand underline">myaccount.google.com/security</a> while signed in to the studio Gmail, and turn on <strong>2-Step Verification</strong>.</li>
            <li>Open <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-brand underline">myaccount.google.com/apppasswords</a>, type a name like “Alderwell admin”, press Create, and copy the 16-letter password.</li>
            <li>In <code>e:\mind\brightyard\.env.local</code> add two lines: <code>GMAIL_USER=your studio gmail</code> and <code>GMAIL_APP_PASSWORD=the 16 letters</code>. Don&apos;t paste the password in chat.</li>
            <li>Tell Claude “Gmail ready” — it copies them to Vercel and redeploys. Until then, use “Open in Gmail” on each lead.</li>
          </ol>
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card flex flex-wrap items-end justify-between gap-3 p-5">
          <ActionForm action={leSetDailyCap} className="flex items-end gap-2">
            <div>
              <label className="label" htmlFor="dailyCap">Daily limit</label>
              <select id="dailyCap" name="dailyCap" defaultValue={String(cap)} className="input w-auto">
                {[10, 15, 20, 30, 40].map((v) => <option key={v} value={v}>{v} emails a day{v === 20 ? " (recommended)" : v > 20 ? " (only after a few weeks)" : ""}</option>)}
              </select>
            </div>
            <SubmitButton className="btn-ghost">Save</SubmitButton>
          </ActionForm>
          <p className="text-sm">Sent today: <strong>{today}</strong> / {cap}</p>
        </section>
        <section className="card flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h2 className="font-semibold">Who replied?</h2>
            <p className="text-sm text-muted">Reads your Gmail inbox and marks everyone who wrote back.</p>
          </div>
          {ready ? <ActionButton action={leCheckReplies} className="btn-ghost" pendingText="Reading inbox…">Check replies</ActionButton> : <span className="text-xs text-muted">needs Gmail connected</span>}
        </section>
      </div>

      {ready ? (
        <>
          <section className="card p-5">
            <h2 className="font-semibold">Send a test first</h2>
            <p className="text-sm text-muted">Sends the next email draft to an address you choose (a friend's Gmail or Outlook is best) so you can see whether it lands in the Inbox or Spam.</p>
            <ActionForm action={leSendTest} className="mt-3 flex flex-wrap items-end gap-2">
              <input name="to" type="email" required placeholder="friend@gmail.com" className="input max-w-xs" />
              <SubmitButton className="btn-ghost" pendingText="Sending…">Send test</SubmitButton>
            </ActionForm>
          </section>

          {followUps.length ? (
            <section className="card p-5">
              <h2 className="mb-3 font-semibold">📬 Follow-ups due ({followUps.length}) — they go in the same Gmail thread</h2>
              <LeBulkSender kind="followup" drafts={followUps} sendFollowUp={leSendFollowUp} today={today} cap={cap} />
            </section>
          ) : null}
          <section className="card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Next {drafts.length} emails — best leads first</h2>
              <div className="flex gap-2 text-sm">
                {[10, 20].map((v) => (
                  <Link key={v} href={`/admin/lead-engine/send?n=${v}`} className={`rounded-full border px-3 py-1 ${n === v ? "border-brand bg-brand-soft text-brand-strong" : "border-line text-muted"}`}>
                    {v} at a time
                  </Link>
                ))}
              </div>
            </div>
            <p className="mb-3 text-xs text-muted">Untick anyone you don&apos;t want to email. Click a line to read or edit that email.</p>
            <LeBulkSender kind="first" drafts={drafts} send={leSendOne} today={today} cap={cap} />
          </section>
        </>
      ) : null}
    </div>
  );
}
