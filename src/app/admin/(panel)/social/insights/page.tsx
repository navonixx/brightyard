import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { learnings } from "@/lib/social/insights";
import { ActionButton } from "@/components/admin/ui";
import { PageSkeleton } from "@/components/admin/skeleton";
import { SoHeader } from "@/components/admin/social/header";
import { apRefreshInsights } from "../../../autopilot-actions";

export const maxDuration = 60;

export default function InsightsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Insights />
    </Suspense>
  );
}

const n = (v?: number | null) => (v ?? 0).toLocaleString("en-US");

async function Insights() {
  await requireAdmin();
  const l = await learnings();
  const grew = l.followers.now !== null && l.followers.start !== null ? l.followers.now - l.followers.start : null;
  return (
    <div className="space-y-6">
      <SoHeader
        active="/admin/social/insights"
        title="Insights"
        intro="How our Instagram posts are doing. Numbers update once a day by themselves; Autopilot reads this summary before planning, so it makes more of what works."
      />
      <div className="flex flex-wrap items-center gap-3">
        <ActionButton action={apRefreshInsights} className="btn-ghost" pendingText="Reading Instagram…">Refresh now</ActionButton>
        <span className="text-xs text-muted">Instagram usually needs a day before a post&apos;s numbers settle.</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Followers" value={l.followers.now === null ? "—" : n(l.followers.now)} sub={grew !== null ? `${grew >= 0 ? "+" : ""}${grew} in ${l.followers.days} days` : "tracked daily"} />
        <Stat label="Posts measured" value={n(l.posts)} />
        <Stat label="Views" value={n(l.totals.views)} />
        <Stat label="Reach" value={n(l.totals.reach)} />
        <Stat label="Likes" value={n(l.totals.likes)} />
        <Stat label="Saves + shares" value={n((l.totals.saved ?? 0) + (l.totals.shares ?? 0))} />
      </div>

      {l.posts ? (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            <Table title="By format" rows={l.byFormat} />
            <Table title="By topic (pillar)" rows={l.byPillar} />
          </div>
          <section className="card space-y-3 p-5">
            <h2 className="font-semibold">Best posts</h2>
            <ol className="space-y-2 text-sm">
              {l.top.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-paper p-3">
                  <div className="min-w-0">
                    <p className="font-medium">{t.title}</p>
                    {t.hook ? <p className="text-xs text-muted">Hook: “{t.hook}”</p> : null}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span>{n(t.m.views ?? t.m.reach)} views</span>
                    <span>{n(t.m.likes)} likes</span>
                    <span>{n((t.m.saved ?? 0) + (t.m.shares ?? 0))} saves/shares</span>
                    {t.url ? <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-brand underline">Open ↗</a> : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <section className="card space-y-2 p-5">
            <h2 className="font-semibold">What Autopilot has learned</h2>
            <p className="whitespace-pre-line text-sm text-ink/80">{l.text}</p>
          </section>
        </>
      ) : (
        <p className="card p-8 text-center text-sm text-muted">No numbers yet. Once posts are live on Instagram for a day, their views, likes and saves show up here.</p>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="font-display text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted">{label}</p>
      {sub ? <p className="mt-1 text-[11px] text-brand">{sub}</p> : null}
    </div>
  );
}

function Table({ title, rows }: { title: string; rows: { key: string; label: string; posts: number; avgViews: number; avgReach: number; engagement: number }[] }) {
  return (
    <section className="card overflow-x-auto p-5">
      <h2 className="mb-3 font-semibold">{title}</h2>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted">
          <tr>
            <th className="pb-2">Type</th>
            <th className="pb-2 text-right">Posts</th>
            <th className="pb-2 text-right">Avg views</th>
            <th className="pb-2 text-right">Avg reach</th>
            <th className="pb-2 text-right">Engagement</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-line">
              <td className="py-2">{r.label}</td>
              <td className="py-2 text-right tabular-nums">{r.posts}</td>
              <td className="py-2 text-right tabular-nums">{n(r.avgViews)}</td>
              <td className="py-2 text-right tabular-nums">{n(r.avgReach)}</td>
              <td className="py-2 text-right tabular-nums">{r.engagement}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
