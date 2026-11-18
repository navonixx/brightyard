import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Eye, Flame } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getSettings, guideState, hotLeads, pipelineStats, recentActivity } from "@/lib/data";
import { ALL_STEPS } from "@/lib/guide";
import { PageSkeleton } from "@/components/admin/skeleton";
import { StatusBadge, timeAgo } from "@/components/admin/status";

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

const EVENT_TEXT: Record<string, string> = {
  view: "opened their preview",
  claim: "clicked “Make it live”",
  opt_out: "opted out",
  emailed: "was emailed",
  sample_generated: "preview generated",
  status: "status changed",
  inbound: "requested a preview from the website",
};

async function Dashboard() {
  await requireAdmin();
  const [stats, settings, guide, hot, activity] = await Promise.all([
    pipelineStats(),
    getSettings(),
    guideState(),
    hotLeads(),
    recentActivity(),
  ]);
  // eslint-disable-next-line react-hooks/purity -- Server Component, rendered once per request
  const now = Date.now();

  const start = settings.startDate ? new Date(`${settings.startDate}T00:00:00`) : null;
  const day = start ? Math.max(1, Math.floor((now - start.getTime()) / 86_400_000) + 1) : null;
  const goal = settings.goalUsd;
  const pct = Math.min(100, Math.round((stats.earned / goal) * 100));
  const doneSteps = ALL_STEPS.filter((s) => guide[s.id]).length;
  const nextStep = ALL_STEPS.find((s) => !guide[s.id]);
  const s = stats.byStatus;

  const funnel = [
    { label: "Leads", value: stats.total },
    { label: "Preview ready", value: (s.sample_ready ?? 0) + stats.emailed },
    { label: "Emailed", value: stats.emailed },
    { label: "Opened preview", value: stats.viewedLeads },
    { label: "Interested", value: (s.interested ?? 0) + (s.won ?? 0) },
    { label: "Won", value: s.won ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            {day ? `Day ${day} of 30` : "Set your start date in Settings to track the 30-day sprint."}
          </p>
        </div>
        <Link href="/admin/leads" className="btn-primary">
          Work on leads <ArrowRight className="size-4" />
        </Link>
      </div>

      {/* Goal */}
      <section className="card p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-muted">30-day goal</p>
          <p className="text-sm text-muted">
            ${stats.promised} promised by interested leads
          </p>
        </div>
        <p className="mt-2 font-display text-4xl font-semibold">
          ${stats.earned} <span className="text-lg font-medium text-muted">/ ${goal}</span>
        </p>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-line/60">
          <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
        </div>
      </section>

      {/* Funnel */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {funnel.map((item) => (
          <div key={item.label} className="card p-4">
            <p className="text-xs font-medium text-muted">{item.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{item.value}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Hot leads */}
        <section className="card p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <Flame className="size-4 text-sun" /> Opened their preview — follow up today
          </h2>
          {hot.length ? (
            <ul className="mt-4 divide-y divide-line">
              {hot.map((lead) => (
                <li key={lead.id} className="flex items-center justify-between gap-3 py-3">
                  <Link href={`/admin/leads/${lead.id}`} className="min-w-0">
                    <p className="truncate font-medium hover:text-brand">{lead.businessName}</p>
                    <p className="text-xs text-muted">
                      {lead.city ?? "—"} · last opened {timeAgo(lead.lastViewedAt, now)}
                    </p>
                  </Link>
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold">
                    <Eye className="size-4 text-muted" /> {lead.viewCount}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">No opens yet. They show up here as soon as someone clicks their link.</p>
          )}
        </section>

        {/* Guide */}
        <section className="card p-6">
          <h2 className="font-semibold">Guide progress</h2>
          <p className="mt-1 text-sm text-muted">
            {doneSteps} of {ALL_STEPS.length} steps done
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-line/60">
            <div className="h-full bg-brand" style={{ width: `${(doneSteps / ALL_STEPS.length) * 100}%` }} />
          </div>
          {nextStep ? (
            <div className="mt-5 rounded-xl bg-brand-soft p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand">Next step</p>
              <p className="mt-1 font-medium">{nextStep.title}</p>
              <Link href="/admin/guide" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand">
                Open guide <ArrowRight className="size-4" />
              </Link>
            </div>
          ) : (
            <p className="mt-5 text-sm text-brand">All steps done. Keep the outreach going! 🎉</p>
          )}
        </section>
      </div>

      {/* Activity */}
      <section className="card p-6">
        <h2 className="font-semibold">Recent activity</h2>
        {activity.length ? (
          <ul className="mt-4 space-y-3">
            {activity.map((event) => (
              <li key={event.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">
                  {event.leadId ? (
                    <Link href={`/admin/leads/${event.leadId}`} className="font-medium hover:text-brand">
                      {event.businessName ?? "Lead"}
                    </Link>
                  ) : (
                    "System"
                  )}{" "}
                  <span className="text-muted">
                    {EVENT_TEXT[event.type] ?? event.type}
                    {event.type === "claim" && event.data?.amount ? ` — $${String(event.data.amount)}` : ""}
                    {event.type === "status" && event.data?.status ? ` → ` : ""}
                  </span>
                  {event.type === "status" && event.data?.status ? (
                    <StatusBadge status={event.data.status as never} />
                  ) : null}
                </span>
                <span className="shrink-0 text-xs text-muted">{timeAgo(event.createdAt, now)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted">Nothing yet.</p>
        )}
      </section>
    </div>
  );
}
