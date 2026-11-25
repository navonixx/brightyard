import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { sq } from "@/lib/social/db";
import { metaConnected } from "@/lib/social/publish";
import { modelslabReady, VIDEO_MODELS } from "@/lib/social/modelslab";
import { imagesReady } from "@/lib/social/images";
import { storageReady } from "@/lib/social/storage";
import { autopilotSettings, currentWeek, getPlan } from "@/lib/social/autopilot";
import { learnings } from "@/lib/social/insights";
import { FORMATS } from "@/lib/social/strategy";
import { monthSpent, studioSettings } from "@/lib/social/studio";
import { dateToEastern } from "@/lib/social/plan";
import { ActionButton, ActionForm, SubmitButton } from "@/components/admin/ui";
import { PageSkeleton } from "@/components/admin/skeleton";
import { SoHeader } from "@/components/admin/social/header";
import { StudioRunner } from "@/components/admin/social/studio-runner";
import { apNewPlan, apRunNow, apSaveSettings, apStep, apToggle } from "../../autopilot-actions";

// Turning Autopilot on plans the first posts with AI and starts making them.
export const maxDuration = 300;

export default function AutopilotPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Autopilot />
    </Suspense>
  );
}

type Item = { at: string; title: string; label: string; tone: "muted" | "work" | "ok" | "warn" | "bad"; thumb?: string | null; format?: string };

const FORMAT_LABEL = Object.fromEntries(FORMATS.map((f) => [f.key, f.label])) as Record<string, string>;
const TONE = { muted: "bg-paper text-muted", work: "bg-sky-50 text-sky-700", ok: "bg-emerald-50 text-emerald-700", warn: "bg-amber-50 text-amber-800", bad: "bg-red-50 text-red-700" } as const;
const hourLabel = (h: number) => (h === 12 ? "12 pm" : h > 12 ? `${h - 12} pm` : `${h} am`);
const time = (d: string | Date) => new Date(d).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });

async function Autopilot() {
  await requireAdmin();
  const [s, studio, spent, plan, meta, videos, posts, l, ytWaiting, failed] = await Promise.all([
    autopilotSettings(),
    studioSettings(),
    monthSpent(),
    getPlan(),
    metaConnected(),
    sq<{ id: number; slot: string; title: string; status: string; format: string; cover_url: string | null; scenes: { image?: string }[] }>(
      "SELECT id, slot, title, status, format, cover_url, scenes FROM so_videos WHERE slot >= now() - interval '1 day' AND slot < now() + interval '8 days' AND status NOT IN ('scheduled') ORDER BY slot",
    ),
    sq<{ id: number; scheduled_for: string; idea: string | null; status: string; assets: { src: string; kind: string; poster?: string }[] }>(
      "SELECT id, scheduled_for, idea, status, assets FROM so_posts WHERE kind = 'feed' AND scheduled_for >= now() - interval '1 day' AND scheduled_for < now() + interval '8 days' ORDER BY scheduled_for",
    ),
    learnings().catch(() => null),
    sq<{ n: number }>("SELECT count(*)::int n FROM so_videos WHERE format IN ('story_reel','reel','photo_ad') AND status IN ('ready','scheduled') AND youtube_url IS NULL AND final_url IS NOT NULL"),
    sq<{ n: number }>("SELECT count(*)::int n FROM so_videos WHERE status = 'failed' AND updated_at > now() - interval '7 days'"),
  ]);
  const week = currentWeek(plan);
  const ready = { meta, ml: modelslabReady(), ai: imagesReady(), store: storageReady() };
  const allReady = ready.meta && ready.ml && ready.store;
  const pending = videos.filter((v) => ["starting", "rendering", "stitching", "finishing"].includes(v.status)).length;
  const queued = videos.filter((v) => v.status === "queued").length;

  // Board: next 7 days (US Eastern), pieces still being made + scheduled posts.
  const items: Item[] = [
    ...videos.map((v): Item => {
      const map: Record<string, [string, Item["tone"]]> = {
        idea: ["Idea", "muted"],
        queued: ["Waiting to start", "muted"],
        starting: ["Starting", "work"],
        rendering: ["Making the video", "work"],
        stitching: ["Adding music", "work"],
        finishing: ["Adding text", "work"],
        ready: ["Ready", "ok"],
        failed: ["Failed — see Create", "bad"],
      };
      const [label, tone] = map[v.status] ?? [v.status, "muted"];
      return { at: v.slot, title: v.title, label, tone, thumb: v.cover_url ?? v.scenes?.[0]?.image ?? null, format: v.format };
    }),
    ...posts.map((p): Item => {
      const map: Record<string, [string, Item["tone"]]> = { draft: ["Needs your OK", "warn"], approved: ["Will publish", "ok"], posted: ["Posted ✓", "ok"], failed: ["Couldn't publish", "bad"] };
      const [label, tone] = map[p.status] ?? [p.status, "muted"];
      const a = p.assets?.[0];
      return { at: p.scheduled_for, title: (p.idea ?? "Post").replace(/^(Autopilot|Studio|Story): /, ""), label, tone, thumb: a ? (a.kind === "video" ? a.poster : a.src) : null };
    }),
  ].sort((a, b) => +new Date(a.at) - +new Date(b.at));
  const today = dateToEastern(new Date()).slice(0, 10);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    return { key, label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }), items: items.filter((it) => dateToEastern(it.at).slice(0, 10) === key) };
  });
  const needsOk = posts.filter((p) => p.status === "draft").length;

  return (
    <div className="space-y-6">
      <SoHeader
        active="/admin/social"
        title="Social Autopilot"
        intro="Turn it on once. Every day it plans, makes and publishes posts on Instagram & Facebook — multi-scene video reels with music, carousels and more — then reads how they did and makes the next ones better."
      />

      {/* 1. On/off */}
      <section className={`card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between ${s.on ? "border-emerald-300" : ""}`}>
        <div className="space-y-1">
          <p className="text-lg font-semibold">{s.on ? "🟢 Autopilot is ON" : "⚪ Autopilot is OFF"}</p>
          <p className="text-sm text-ink/80">
            {s.on
              ? `${s.hours.length} post${s.hours.length > 1 ? "s" : ""} a day at ${s.hours.map(hourLabel).join(" & ")} US Eastern${s.autoApprove ? ", published automatically" : " — each waits for your OK"}.`
              : "Press the button: it writes a 2-month plan, makes the first posts and keeps going by itself."}
          </p>
          {s.on && week ? <p className="text-sm text-muted">This week: <strong>{week.theme}</strong> — {week.goal}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {s.on ? (
            <>
              <ActionButton action={apRunNow} className="btn-ghost" pendingText="Working… (up to 3 min)">Run now</ActionButton>
              <ActionButton action={apToggle.bind(null, false)} className="btn-ghost" confirm="Turn Autopilot off?">Turn off</ActionButton>
            </>
          ) : (
            <ActionButton action={apToggle.bind(null, true)} className="btn-primary px-6 py-3 text-base" pendingText="Planning & starting… (1–3 min)">
              Turn on Autopilot
            </ActionButton>
          )}
        </div>
      </section>

      {!allReady ? (
        <section className="card space-y-2 border-amber-200 bg-amber-50/60 p-4 text-sm">
          <p className="font-semibold">Before it can run</p>
          <ul className="space-y-1">
            <li>{ready.meta ? "✅" : "❌"} Instagram & Facebook connected {ready.meta ? null : <Link href="/admin/social/setup" className="text-brand underline">→ Setup</Link>}</li>
            <li>{ready.ml ? "✅" : "❌"} ModelsLab key (videos, pictures, music)</li>
            <li>{ready.store ? "✅" : "❌"} ImageKit (storage)</li>
            <li>{ready.ai ? "✅" : "⚠️"} OpenAI key (carousel slides){ready.ai ? null : " — optional"}</li>
          </ul>
        </section>
      ) : null}

      <StudioRunner pending={pending} queued={queued} step={apStep} />

      {/* 2. What you do */}
      <section className="card space-y-2 p-5">
        <h2 className="font-semibold">What you do</h2>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm">
          <li>Keep Autopilot <strong>on</strong>. Nothing else is needed for Instagram & Facebook.</li>
          <li>Reply to <strong>comments and DMs</strong> in the Instagram app once or twice a day — that&apos;s what brings clients.</li>
          {needsOk ? (
            <li>
              <strong>{needsOk} post{needsOk > 1 ? "s" : ""} need your OK</strong> → <Link href="/admin/social/calendar" className="text-brand underline">Calendar</Link> → Approve (or switch on automatic publishing below).
            </li>
          ) : null}
          <li>
            YouTube: <strong>{ytWaiting[0]?.n ?? 0} video{ytWaiting[0]?.n === 1 ? "" : "s"}</strong> ready to upload by hand → <Link href="/admin/social/youtube" className="text-brand underline">YouTube</Link> (download, upload, paste link).
          </li>
          {failed[0]?.n ? (
            <li>
              <strong>{failed[0].n} piece{failed[0].n > 1 ? "s" : ""} failed</strong> this week → <Link href="/admin/social/studio" className="text-brand underline">Create</Link> → Retry. Autopilot fills the slot with a new one anyway.
            </li>
          ) : null}
        </ol>
      </section>

      {/* 3. Next 7 days */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Next 7 days</h2>
          <Link href="/admin/social/calendar" className="text-sm text-brand hover:underline">Open Calendar →</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {days.map((d) => (
            <div key={d.key} className="card space-y-2 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{d.label}</p>
              {d.items.length ? (
                d.items.map((it, i) => (
                  <div key={i} className="flex gap-2">
                    {it.thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.thumb.includes("ik.imagekit.io") ? `${it.thumb}${it.thumb.includes("?") ? "" : "?tr=w-120"}` : it.thumb} alt="" className="h-16 w-10 shrink-0 rounded object-cover" />
                    ) : (
                      <div className="h-16 w-10 shrink-0 rounded bg-paper" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted">{time(it.at)}</p>
                      <p className="line-clamp-2 text-xs font-medium">{it.title}</p>
                      <span className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${TONE[it.tone]}`}>{it.label}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted">{s.on ? "Will be planned" : "—"}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* 4. Plan */}
        <section className="card space-y-3 p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">2-month plan</h2>
            <ActionButton action={apNewPlan} className="btn-ghost px-3 py-1.5 text-xs" pendingText="Writing… (~30 s)" confirm={plan ? "Write a new 2-month plan? The current one is replaced." : undefined}>
              {plan ? "New plan" : "Write plan"}
            </ActionButton>
          </div>
          {plan ? (
            <ol className="space-y-2 text-sm">
              {plan.weeks.map((w) => (
                <li key={w.week} className={`rounded-lg p-2 ${week?.week === w.week ? "bg-brand-soft" : ""}`}>
                  <span className="text-xs font-semibold text-muted">Week {w.week}{week?.week === w.week ? " · now" : ""}</span>
                  <p className="font-medium">{w.theme}</p>
                  <p className="text-xs text-ink/70">{w.goal}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">No plan yet — it&apos;s written automatically when you turn Autopilot on (or press “Write plan”).</p>
          )}
        </section>

        <div className="space-y-5">
          {/* 5. Numbers */}
          <section className="card space-y-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">How it&apos;s going</h2>
              <Link href="/admin/social/insights" className="text-sm text-brand hover:underline">Insights →</Link>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Followers (IG)" value={l?.followers.now ?? "—"} />
              <Stat label="Posts measured" value={l?.posts ?? 0} />
              <Stat label="Total views" value={l?.totals.views ?? l?.totals.reach ?? 0} />
            </div>
            <p className="text-xs text-muted">Spent this month: ${spent.toFixed(2)} of ${studio.cap} budget.</p>
          </section>

          {/* 6. Settings */}
          <section className="card space-y-3 p-5">
            <h2 className="font-semibold">Settings</h2>
            <ActionForm action={apSaveSettings} className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="perDay">Posts per day</label>
                <select id="perDay" name="perDay" defaultValue={s.hours.length} className="input">
                  <option value={1}>1</option>
                  <option value={2}>2 (recommended)</option>
                  <option value={3}>3</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {["h1", "h2", "h3"].map((n, i) => (
                  <div key={n}>
                    <label className="label" htmlFor={n}>Time {i + 1}</label>
                    <select id={n} name={n} defaultValue={s.hours[i] ?? [11, 19, 15][i]} className="input px-2">
                      {Array.from({ length: 17 }, (_, k) => k + 6).map((h) => (
                        <option key={h} value={h}>{hourLabel(h)}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div>
                <label className="label" htmlFor="cap">Monthly budget (USD)</label>
                <input id="cap" name="cap" type="number" min={0} max={500} defaultValue={studio.cap} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="model">Video model</label>
                <select id="model" name="model" defaultValue={studio.model} className="input">
                  {VIDEO_MODELS.map((m) => (
                    <option key={m.key} value={m.key}>{m.label.split(" · ").slice(0, 2).join(" · ")}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" name="autoApprove" defaultChecked={s.autoApprove} /> Publish automatically (no approval needed)
              </label>
              <p className="text-xs text-muted sm:col-span-2">
                Times are US Eastern. Posts go out at the twice-daily run (around 11 am and 7 pm ET) or right after. Each multi-scene reel costs about ${"0.24"} on ModelsLab; carousels about $0.25 (OpenAI); collages are free.
              </p>
              <div className="sm:col-span-2">
                <SubmitButton>Save settings</SubmitButton>
              </div>
            </ActionForm>
          </section>
        </div>
      </div>

      <p className="text-xs text-muted">
        Rules we keep: no bought followers, no auto-likes or cold DMs, AI videos are labelled “Made with AI”, and portfolio campaigns are always called concept work. Formats used: {Object.values(FORMAT_LABEL).join(", ")}.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-paper p-3">
      <p className="font-display text-2xl font-semibold tabular-nums">{typeof value === "number" ? value.toLocaleString("en-US") : value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
