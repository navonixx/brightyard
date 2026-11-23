import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { q } from "@/lib/leadengine/db";
import { engineStatus } from "@/lib/leadengine/engine";
import { nicheLabel } from "@/lib/leadengine/niches";
import { PageSkeleton } from "@/components/admin/skeleton";
import { LeHeader } from "@/components/admin/lead-engine/tabs";
import { LeRunner } from "@/components/admin/lead-engine/runner";
import { leStep } from "../../lead-engine-actions";
import { getSettings } from "@/lib/data";
import { followUpsDue } from "@/lib/leadengine/followups";
import { followUpDraft } from "@/lib/leadengine/replies";
import { LeFollowUps, type FollowUpItem } from "@/components/admin/lead-engine/replies";

// Every engine step (one search, or a batch of website checks) runs inside this page's server action.
export const maxDuration = 60;

type SP = Promise<Record<string, string | string[] | undefined>>;

export default function LeadEnginePage({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}

async function Dashboard({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const autoStart = (await searchParams).run === "1";
  const [status, hot, jobs, due, settings] = await Promise.all([
    engineStatus(),
    q<{ id: number; name: string; niche: string | null; city: string | null; state: string | null; pay_score: number; pain_score: number; pain_signals: { label: string }[] }>(
      `SELECT id, name, niche, city, state, pay_score, pain_score, pain_signals FROM le_leads
       WHERE pay_score >= 30 AND pain_score >= 30 AND email IS NOT NULL AND status = 'new'
       ORDER BY (pay_score + pain_score) DESC, id DESC LIMIT 8`,
    ),
    q<{ id: number; label: string; status: string; added: number; error: string | null }>(
      "SELECT id, label, status, added, error FROM le_jobs ORDER BY CASE status WHEN 'running' THEN 0 ELSE 1 END, COALESCE(finished_at, created_at) DESC LIMIT 8",
    ),
    followUpsDue(),
    getSettings(),
  ]);
  const me = { name: settings.senderName, company: "Alderwell Creative", site: "", address: settings.businessAddress };
  const days = (d: unknown) => Math.max(1, Math.round((Date.now() - new Date(String(d)).getTime()) / 86_400_000));
  const followUps: FollowUpItem[] = due.map((l) => {
    const d = followUpDraft(l, l.step, me);
    return { id: l.id, name: l.name, email: l.email!, step: l.step, subject: d.subject, body: d.body, sentAgo: `${days(l.contacted_at)} days ago` };
  });

  return (
    <div className="space-y-6">
      <LeHeader
        active="/admin/lead-engine"
        title="Lead Engine"
        intro="Press Start. It goes city by city across the US, finds every kind of business, checks each website and scores who can pay and what's wrong — then moves to the next city on its own."
      />

      <LeRunner initial={status} step={leStep} autoStart={autoStart} />

      <section className="card p-5">
        <h2 className="font-semibold">📬 Follow-ups due today {followUps.length ? `(${followUps.length})` : ""}</h2>
        <p className="mb-2 text-sm text-muted">People you emailed who haven't replied: a short nudge after 3 days, a last one after 7. Mark a lead “replied” to stop them.</p>
        <LeFollowUps items={followUps} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">🔥 Best leads so far</h2>
            <Link href="/admin/lead-engine/leads?minPay=30&minPain=30&email=yes&status=new" className="text-sm text-brand hover:underline">
              See all →
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-line">
            {hot.length ? (
              hot.map((l) => (
                <li key={l.id} className="py-2.5">
                  <Link href={`/admin/lead-engine/leads/${l.id}`} className="flex items-start justify-between gap-3 hover:text-brand">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{l.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {nicheLabel(l.niche)} · {[l.city, l.state].filter(Boolean).join(", ")} · {l.pain_signals?.[0]?.label}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">pay {l.pay_score} · pain {l.pain_score}</span>
                  </Link>
                </li>
              ))
            ) : (
              <li className="py-6 text-center text-sm text-muted">They show up here as soon as the first city is checked.</li>
            )}
          </ul>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold">Recent searches</h2>
          <ul className="mt-3 divide-y divide-line">
            {jobs.length ? (
              jobs.map((j) => (
                <li key={j.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{j.label.replace(/^Auto · /, "")}</p>
                    {j.error && j.status === "failed" ? <p className="truncate text-xs text-danger">{j.error}</p> : null}
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs ${j.status === "done" ? "bg-emerald-100 text-emerald-700" : j.status === "running" ? "bg-sky-100 text-sky-700" : j.status === "failed" ? "bg-red-100 text-red-700" : "bg-paper text-muted"}`}>
                    {j.status === "done" ? `+${j.added} new` : j.status}
                  </span>
                </li>
              ))
            ) : (
              <li className="py-6 text-center text-sm text-muted">Nothing yet — press Start.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
