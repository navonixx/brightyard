import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { sentPerDay, trackedEmails, type Stage } from "@/lib/tracker";
import { ActionButton } from "@/components/admin/ui";
import { PageSkeleton } from "@/components/admin/skeleton";
import { leCheckReplies, trSetOutcome } from "../../lead-engine-actions";
import { mailReady } from "@/lib/leadengine/mailer";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default function TrackerPage({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Tracker searchParams={searchParams} />
    </Suspense>
  );
}

const LABEL: Record<Stage, { text: string; cls: string }> = {
  won: { text: "Won 🎉", cls: "bg-emerald-100 text-emerald-700" },
  wants_live: { text: "Wants it live", cls: "bg-amber-100 text-amber-800" },
  replied: { text: "Replied", cls: "bg-sky-100 text-sky-700" },
  viewed: { text: "Viewed preview", cls: "bg-violet-100 text-violet-700" },
  due: { text: "Follow-up due", cls: "bg-orange-100 text-orange-700" },
  waiting: { text: "No reply yet", cls: "bg-paper text-muted" },
  lost: { text: "Not interested", cls: "bg-red-50 text-red-600" },
};

const FILTERS: { key: string; label: string; match: (s: Stage) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  { key: "due", label: "Follow-up due", match: (s) => s === "due" },
  { key: "waiting", label: "No reply", match: (s) => s === "waiting" || s === "due" },
  { key: "replied", label: "Replied", match: (s) => s === "replied" },
  { key: "viewed", label: "Viewed preview", match: (s) => s === "viewed" },
  { key: "hot", label: "Wants live / won", match: (s) => s === "wants_live" || s === "won" },
  { key: "lost", label: "Not interested", match: (s) => s === "lost" },
];

const ago = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
};

async function Tracker({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.key === sp.f) ?? FILTERS[0];
  const [all, perDay] = await Promise.all([trackedEmails(), sentPerDay()]);
  const rows = all.filter((r) => filter.match(r.stage));
  const count = (fn: (s: Stage) => boolean) => all.filter((r) => fn(r.stage)).length;
  const today = perDay.at(-1)?.n ?? 0;
  const week = perDay.slice(-7).reduce((s, d) => s + d.n, 0);
  const replied = count((s) => ["replied", "wants_live", "won"].includes(s));
  const max = Math.max(1, ...perDay.map((d) => d.n));

  const stats = [
    { label: "Emails sent", value: all.length, hint: `${today} today · ${week} this week` },
    { label: "Replied", value: replied, hint: all.length ? `${Math.round((replied / all.length) * 100)}% reply rate` : "—" },
    { label: "Looked at preview", value: all.filter((r) => r.views > 0).length, hint: "opened the link we sent" },
    { label: "Wants it live", value: count((s) => s === "wants_live"), hint: "chose an amount" },
    { label: "Won", value: count((s) => s === "won"), hint: `$${all.reduce((s, r) => s + r.paid, 0)} paid` },
    { label: "Follow-ups due", value: count((s) => s === "due"), hint: "send these today", href: "/admin/tracker?f=due" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Email Tracker</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Everyone you&apos;ve emailed — from the Lead Engine and from Outreach — and what happened next. We can&apos;t see whether an email was opened (Gmail doesn&apos;t tell us,
          and tracking pixels push cold email into spam), but we do see exactly when someone opens the preview link you sent.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/lead-engine/send" className="btn-primary">Send emails</Link>
        {mailReady() ? <ActionButton action={leCheckReplies} className="btn-ghost" pendingText="Reading inbox…">Check replies in Gmail</ActionButton> : <span className="text-xs text-muted">Connect Gmail on “Send emails” to send in batches and find replies automatically.</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => {
          const inner = (
            <>
              <p className="font-display text-2xl font-semibold tabular-nums">{s.value.toLocaleString("en-US")}</p>
              <p className="text-sm font-medium">{s.label}</p>
              <p className="text-xs text-muted">{s.hint}</p>
            </>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="rounded-xl border border-orange-200 bg-card px-4 py-3 hover:bg-orange-50">{inner}</Link>
          ) : (
            <div key={s.label} className="rounded-xl border border-line bg-card px-4 py-3">{inner}</div>
          );
        })}
      </div>

      <section className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Emails sent per day</h2>
          <p className={`text-xs ${today >= 20 ? "text-danger" : "text-muted"}`}>Today: {today} / 20 recommended for a new Gmail</p>
        </div>
        <div className="mt-4 flex h-28 items-end gap-1.5">
          {perDay.map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${d.day}: ${d.n}`}>
              <span className="text-[10px] tabular-nums text-muted">{d.n || ""}</span>
              <div className={`w-full rounded-t ${d.n > 20 ? "bg-danger" : "bg-brand"}`} style={{ height: `${(d.n / max) * 80}px`, minHeight: d.n ? 3 : 1, opacity: d.n ? 1 : 0.15 }} />
              <span className="text-[10px] text-muted">{new Date(`${d.day}T12:00:00Z`).getUTCDate()}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f.key} href={f.key === "all" ? "/admin/tracker" : `/admin/tracker?f=${f.key}`} className={`rounded-full border px-3 py-1.5 text-sm ${filter.key === f.key ? "border-brand bg-brand-soft text-brand-strong" : "border-line text-muted hover:text-ink"}`}>
            {f.label} ({count(f.match)})
          </Link>
        ))}
      </div>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-paper text-left text-xs text-muted">
              <tr>
                <th className="w-10 px-3 py-2.5 font-medium">#</th>
                <th className="py-2.5 font-medium">Business</th>
                <th className="py-2.5 font-medium">Sent</th>
                <th className="py-2.5 font-medium">Follow-ups</th>
                <th className="py-2.5 font-medium">Preview</th>
                <th className="py-2.5 font-medium">Status</th>
                <th className="py-2.5 font-medium">Next step</th>
                <th className="px-3 py-2.5 font-medium">Mark as</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r, i) => (
                <tr key={`${r.kind}-${r.key}`} className="align-top hover:bg-paper/60">
                  <td className="px-3 py-3 tabular-nums text-muted">{i + 1}</td>
                  <td className="max-w-[240px] py-3 pr-3">
                    <Link href={r.href} className="font-semibold hover:text-brand">{r.name}</Link>
                    <p className="truncate text-xs text-muted">{r.email} · {[r.city, r.state].filter(Boolean).join(", ")}</p>
                  </td>
                  <td className="py-3 pr-3 text-xs">
                    {new Date(r.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    <span className="block text-muted">{ago(r.sentAt)}</span>
                  </td>
                  <td className="py-3 pr-3 text-xs">{r.followups} / 2{r.lastFollowUp ? <span className="block text-muted">last {ago(r.lastFollowUp)}</span> : null}</td>
                  <td className="py-3 pr-3 text-xs">
                    {r.views ? (
                      <>
                        👀 {r.views}×<span className="block text-muted">last {ago(r.lastViewedAt!)}</span>
                      </>
                    ) : r.leadId ? (
                      <span className="text-muted">not opened</span>
                    ) : (
                      <span className="text-muted">no preview sent</span>
                    )}
                  </td>
                  <td className="py-3 pr-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${LABEL[r.stage].cls}`}>{LABEL[r.stage].text}</span></td>
                  <td className="max-w-[220px] py-3 pr-3 text-xs">{r.next}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(["replied", "won", "lost"] as const).map((o) => (
                        <ActionButton key={o} action={trSetOutcome.bind(null, r.kind, r.key, o)} className="btn-ghost px-2 py-0.5 text-[11px]" pendingText="…">
                          {o}
                        </ActionButton>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length ? (
          <p className="py-10 text-center text-sm text-muted">
            {all.length ? "Nothing in this filter." : <>No emails yet. Open a hot lead in the <Link href="/admin/lead-engine/leads?minPay=30&minPain=30&email=yes&status=new" className="text-brand hover:underline">Lead Engine</Link> and press “Open in Gmail”.</>}
          </p>
        ) : null}
      </section>
    </div>
  );
}
