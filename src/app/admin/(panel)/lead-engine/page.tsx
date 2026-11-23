import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { q } from "@/lib/leadengine/db";
import { engineStatus } from "@/lib/leadengine/engine";
import { stats } from "@/lib/leadengine/leads";
import { SOURCES, type SourceId } from "@/lib/leadengine/sources/meta";
import { ActionButton } from "@/components/admin/ui";
import { PageSkeleton } from "@/components/admin/skeleton";
import { LeHeader } from "@/components/admin/lead-engine/tabs";
import { LeRunner } from "@/components/admin/lead-engine/runner";
import { leClearQueue, leRetryFailed, leStep } from "../../lead-engine-actions";

// Every engine step (one search, or a batch of website checks) runs inside this page's server action.
export const maxDuration = 60;

export default function LeadEnginePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

const fmt = (n: number) => Number(n ?? 0).toLocaleString("en-US");

async function Dashboard() {
  await requireAdmin();
  const [status, s, jobs, logs] = await Promise.all([
    engineStatus(),
    stats(),
    q<{ id: number; label: string; status: string; added: number; merged: number; error: string | null }>(
      "SELECT id, label, status, added, merged, error FROM le_jobs ORDER BY CASE status WHEN 'running' THEN 0 WHEN 'queued' THEN 2 ELSE 1 END, COALESCE(finished_at, created_at) DESC LIMIT 25",
    ),
    q<{ at: Date; text: string }>("SELECT at, text FROM le_log ORDER BY id DESC LIMIT 12"),
  ]);

  return (
    <div className="space-y-6">
      <LeHeader
        active="/admin/lead-engine"
        title="Dashboard"
        intro="Finds US leads on several platforms, merges the same business into one lead, checks every website and scores each lead for “can pay” and “pain” — with a suggested solution and a ready first email."
      />

      <LeRunner initial={status} step={leStep} />
      {status.failed || status.queued ? (
        <div className="-mt-3 flex flex-wrap gap-3">
          {status.failed ? (
            <ActionButton action={leRetryFailed} className="btn-ghost px-3 py-1.5 text-xs" pendingText="Re-queuing…">
              Retry {status.failed} failed
            </ActionButton>
          ) : null}
          {status.queued ? (
            <ActionButton action={leClearQueue} className="btn-ghost px-3 py-1.5 text-xs" pendingText="Clearing…" confirm="Remove all waiting searches? Leads already found stay.">
              Clear waiting searches
            </ActionButton>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">By source</h2>
            <Link href="/admin/lead-engine/leads?minPay=30&minPain=30&email=yes&status=new" className="text-sm text-brand hover:underline">
              Hot leads →
            </Link>
          </div>
          <p className="mt-0.5 text-xs text-muted">{fmt(s.multi)} leads were found on 2+ platforms and merged.</p>
          <div className="mt-4 space-y-3">
            {(Object.keys(SOURCES) as SourceId[]).map((key) => {
              const row = s.bySource.find((b) => b.source === key);
              const pct = s.total ? Math.round((Number(row?.n ?? 0) / s.total) * 100) : 0;
              return (
                <Link key={key} href={`/admin/lead-engine/leads?source=${key}`} className="block">
                  <div className="flex justify-between text-sm">
                    <span>{SOURCES[key].label}</span>
                    <span className="text-muted">{fmt(row?.n ?? 0)} · {fmt(row?.email ?? 0)} emails</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line/60">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: SOURCES[key].color }} />
                  </div>
                </Link>
              );
            })}
          </div>
          <h2 className="mt-8 font-semibold">Activity</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {logs.length ? (
              logs.map((l, i) => (
                <li key={i} className="flex gap-2">
                  <span className="shrink-0 text-muted">{new Date(l.at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                  <span>{l.text}</span>
                </li>
              ))
            ) : (
              <li className="text-muted">Nothing yet — start on “Find leads”.</li>
            )}
          </ul>
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Searches</h2>
            <p className="text-xs text-muted">{fmt(status.queued)} waiting · {fmt(status.done)} done · {fmt(status.failed)} failed</p>
          </div>
          <ul className="mt-4 divide-y divide-line">
            {jobs.length ? (
              jobs.map((j) => (
                <li key={j.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{j.label}</p>
                    {j.error ? <p className="text-xs text-danger">{j.error}</p> : null}
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs ${j.status === "done" ? "bg-emerald-100 text-emerald-700" : j.status === "running" ? "bg-sky-100 text-sky-700" : j.status === "failed" ? "bg-red-100 text-red-700" : "bg-paper text-muted"}`}>
                    {j.status === "done" ? `+${j.added} new · ${j.merged} merged` : j.status}
                  </span>
                </li>
              ))
            ) : (
              <li className="py-6 text-center text-sm text-muted">
                No searches yet. <Link href="/admin/lead-engine/find" className="text-brand hover:underline">Find leads →</Link>
              </li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
