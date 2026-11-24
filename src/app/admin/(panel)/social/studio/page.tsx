import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { sq } from "@/lib/social/db";
import { metaConnected } from "@/lib/social/publish";
import { modelslabReady, VIDEO_MODELS } from "@/lib/social/modelslab";
import { imagesReady } from "@/lib/social/images";
import { storageReady } from "@/lib/social/storage";
import { FORMATS, PILLARS } from "@/lib/social/strategy";
import { estimate, modelFor, monthSpent, studioSettings, type StudioSettings, type Video } from "@/lib/social/studio";
import { ActionButton, ActionForm, SubmitButton } from "@/components/admin/ui";
import { PageSkeleton } from "@/components/admin/skeleton";
import { SoHeader } from "@/components/admin/social/header";
import { StudioRunner } from "@/components/admin/social/studio-runner";
import { stDelete, stPlan, stQueue, stQueueAll, stSaveIdea, stSaveSettings, stSchedule, stStep } from "../../../studio-actions";

// Planning asks the AI for a whole week; making a carousel draws 5 images at once.
export const maxDuration = 300;

export default function StudioPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Studio />
    </Suspense>
  );
}

const FORMAT_LABEL = Object.fromEntries(FORMATS.map((f) => [f.key, f.label])) as Record<string, string>;
const PILLAR_LABEL = Object.fromEntries(PILLARS.map((p) => [p.key, p.label])) as Record<string, string>;
const money = (n: number) => `$${n.toFixed(2)}`;

function Check({ ok, label, hint }: { ok: boolean; label: string; hint?: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`} title={hint}>
      {ok ? "✓" : "✗"} {label}
    </span>
  );
}

async function Studio() {
  await requireAdmin();
  const [rows, settings, spent, meta] = await Promise.all([
    sq<Video>("SELECT * FROM so_videos ORDER BY id DESC LIMIT 80"),
    studioSettings(),
    monthSpent(),
    metaConnected(),
  ]);
  const by = (...s: Video["status"][]) => rows.filter((r) => s.includes(r.status));
  const ideas = by("idea").sort((a, b) => a.id - b.id);
  const working = by("queued", "starting", "rendering", "finishing");
  const ready = by("ready");
  const scheduled = by("scheduled").slice(0, 12);
  const failed = by("failed");
  const pending = by("starting", "rendering", "finishing").length;
  const queued = by("queued").length;
  const ideaCost = ideas.reduce((s, v) => s + estimate(v, settings), 0);

  return (
    <div className="space-y-6">
      <SoHeader
        active="/admin/social/studio"
        title="AI Video Studio"
        intro="The AI plans viral-style content for our accounts, ModelsLab makes the videos, OpenAI draws covers, thumbnails and carousel slides, and finished pieces are scheduled to Instagram, Facebook and Stories automatically. YouTube gets a ready-to-upload package."
      />

      <div className="flex flex-wrap items-center gap-2">
        <Check ok={modelslabReady()} label="ModelsLab (videos)" hint="MODELSLAB_API_KEY in .env.local and Vercel" />
        <Check ok={imagesReady()} label="OpenAI (covers, thumbnails, slides)" />
        <Check ok={storageReady()} label="ImageKit (storage)" />
        <Check ok={meta} label="Instagram/Facebook connected" />
        <span className="rounded-full bg-paper px-2.5 py-1 text-xs">
          Budget this month: <strong>{money(spent)}</strong> of {money(settings.cap)}
        </span>
        <span className="rounded-full bg-paper px-2.5 py-1 text-xs">Video model: {modelFor(settings.model).label.split(" (")[0]}</span>
      </div>

      {!modelslabReady() ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Videos need a ModelsLab key: add <code>MODELSLAB_API_KEY=…</code> to <code>.env.local</code> and tell Claude to put it on Vercel. Carousels and collages work without it.
        </p>
      ) : null}

      <StudioRunner pending={pending} queued={queued} step={stStep} />

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold">1 · Create content</h2>
        <ActionForm action={stPlan} className="grid gap-3 sm:grid-cols-[1fr_120px_2fr_auto] sm:items-end">
          <div>
            <label className="label" htmlFor="format">What to make</label>
            <select id="format" name="format" className="input" defaultValue="week">
              <option value="week">A full week (7 mixed pieces)</option>
              {FORMATS.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="count">How many</label>
            <select id="count" name="count" className="input" defaultValue="3">
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="topic">Topic (optional)</label>
            <input id="topic" name="topic" className="input" placeholder="e.g. coffee shops, Black Friday, why websites lose calls" />
          </div>
          <SubmitButton pendingText="AI is planning… (~30 s)">Plan with AI</SubmitButton>
        </ActionForm>
        <p className="text-xs text-muted">
          Ideas cost nothing. Money is only spent when you press “Make it”: a video ≈ {money(estimate({ format: "reel", duration: 8 }, settings))} (8 s clip + cover + thumbnail), a carousel ≈ {money(estimate({ format: "carousel", duration: 0 }, settings))}, a collage is free.
        </p>
      </section>

      {ideas.length ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">2 · Ideas to check ({ideas.length})</h2>
            <ActionButton action={stQueueAll} pendingText="Queuing…" confirm={`Make all ${ideas.length}? Estimated cost ${money(ideaCost)}.`}>
              Make all · ≈ {money(ideaCost)}
            </ActionButton>
          </div>
          {ideas.map((v) => (
            <IdeaCard key={v.id} v={v} settings={settings} />
          ))}
        </section>
      ) : null}

      {working.length ? (
        <section className="space-y-3">
          <h2 className="font-semibold">In production ({working.length})</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {working.map((v) => (
              <div key={v.id} className="card flex gap-3 p-3 text-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {v.cover_url ? <img src={v.cover_url} alt="" className="h-28 w-16 rounded-lg object-cover" /> : <div className="h-28 w-16 animate-pulse rounded-lg bg-paper" />}
                <div className="min-w-0">
                  <p className="font-medium">{v.title}</p>
                  <p className="text-xs text-muted">{FORMAT_LABEL[v.format]}</p>
                  <p className="mt-1 text-xs text-brand">
                    {{ queued: "Waiting to start…", starting: "Starting…", rendering: "AI is making the video (1–3 min)…", finishing: "Adding the hook text…" }[v.status as string]}
                  </p>
                  {v.error ? <p className="text-xs text-danger">{v.error}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {ready.length ? (
        <section className="space-y-3">
          <h2 className="font-semibold">3 · Ready ({ready.length})</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {ready.map((v) => (
              <ReadyCard key={v.id} v={v} />
            ))}
          </div>
        </section>
      ) : null}

      {failed.length ? (
        <section className="space-y-2">
          <h2 className="font-semibold text-danger">Failed ({failed.length})</h2>
          {failed.map((v) => (
            <div key={v.id} className="card flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{v.title} <span className="text-xs text-muted">· {FORMAT_LABEL[v.format]}</span></p>
                <p className="text-xs text-danger">{v.error}</p>
              </div>
              <div className="flex gap-2">
                <ActionButton action={stQueue.bind(null, v.id)} className="btn-ghost px-3 py-1.5 text-xs">Retry</ActionButton>
                <ActionButton action={stDelete.bind(null, v.id)} className="px-3 py-1.5 text-xs text-muted hover:text-danger" confirm="Delete?">Delete</ActionButton>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {scheduled.length ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Scheduled</h2>
            <Link href="/admin/social" className="text-sm text-brand hover:underline">See all posts →</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {scheduled.map((v) => (
              <div key={v.id} className="w-36 shrink-0 text-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {v.cover_url ? <img src={v.cover_url} alt="" className="aspect-[9/16] w-full rounded-lg object-cover" /> : <div className="aspect-[9/16] rounded-lg bg-paper" />}
                <p className="mt-1 line-clamp-2 font-medium">{v.title}</p>
                <p className="text-muted">{v.scheduled_for ? new Date(v.scheduled_for).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric" }) : ""}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Our growth plan</h2>
          <ul className="space-y-2 text-sm">
            {PILLARS.map((p) => (
              <li key={p.key}>
                <strong>{p.label}:</strong> <span className="text-ink/80">{p.why}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">
            Routine: 1 feed post a day (reels most days) + the same reel as a Story. Reply to every comment and DM yourself within a few hours — that&apos;s what the algorithm rewards. No bought followers, no auto-likes or cold DMs. AI videos are labelled “Made with AI”.
          </p>
        </section>
        <SettingsCard s={settings} />
      </div>
    </div>
  );
}

function IdeaCard({ v, settings }: { v: Video; settings: StudioSettings }) {
  const isVideo = v.format === "reel" || v.format === "photo_ad";
  return (
    <article className="card space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-brand-soft px-2 py-0.5 font-medium text-brand">{FORMAT_LABEL[v.format]}</span>
            {(PILLAR_LABEL[v.pillar] ?? v.pillar) !== FORMAT_LABEL[v.format] ? <span className="text-muted">{PILLAR_LABEL[v.pillar] ?? v.pillar}</span> : null}
            {isVideo ? <span className="text-muted">· {v.duration}s</span> : null}
            <span className="text-muted">· ≈ {money(estimate(v, settings))}</span>
          </div>
          <p className="font-semibold">{v.title}</p>
          {v.hook ? <p className="text-sm">🎬 Hook on screen: <strong>“{v.hook}”</strong></p> : null}
        </div>
        <div className="flex gap-2">
          <ActionButton action={stQueue.bind(null, v.id)} pendingText="Queuing…">Make it</ActionButton>
          <ActionButton action={stDelete.bind(null, v.id)} className="btn-ghost px-3 text-xs" confirm="Delete this idea?">Delete</ActionButton>
        </div>
      </div>
      {v.error ? <p className="text-xs text-danger">{v.error}</p> : null}
      <div className="flex flex-wrap gap-3">
        {v.format === "photo_ad" && v.image_src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.image_src} alt="" className="h-28 rounded-lg object-cover" title="This photo will come alive" />
        ) : null}
        {v.format === "collage"
          ? v.media.map((m) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={m} src={m} alt="" className="size-20 rounded-lg object-cover" />
            ))
          : null}
        {v.format === "carousel" ? (
          <ol className="list-decimal space-y-0.5 pl-5 text-sm">
            {v.slides.map((s, i) => (
              <li key={i}>
                <strong>{s.headline}</strong> {s.body ? <span className="text-muted">— {s.body}</span> : null}
              </li>
            ))}
          </ol>
        ) : null}
        <p className="line-clamp-3 min-w-0 flex-1 whitespace-pre-line text-sm text-ink/80">{v.caption}</p>
      </div>
      <details className="rounded-xl border border-line">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Edit hook, prompt, caption & YouTube text</summary>
        <ActionForm action={stSaveIdea.bind(null, v.id)} className="grid gap-3 p-3 sm:grid-cols-2">
          <Field name="title" label="Title" value={v.title} />
          <Field name="cover_text" label="Cover / thumbnail text" value={v.cover_text} />
          <Field name="hook" label="Hook on screen (first 3 s)" value={v.hook} />
          <Field name="cta" label="Call to action (last 3 s)" value={v.cta} />
          {isVideo ? (
            <>
              <Field name="prompt" label="Video prompt (what the AI should film)" value={v.prompt} area wide />
              <Field name="duration" label="Seconds (4–15)" value={String(v.duration)} />
            </>
          ) : (
            <input type="hidden" name="duration" value={v.duration} />
          )}
          <Field name="caption" label="Caption" value={v.caption} area wide />
          <Field name="hashtags" label="Hashtags" value={v.hashtags} wide />
          <Field name="yt_title" label="YouTube title" value={v.yt_title} />
          <Field name="yt_tags" label="YouTube tags" value={v.yt_tags} />
          <Field name="yt_description" label="YouTube description" value={v.yt_description} area wide />
          {!isVideo ? <input type="hidden" name="prompt" value={v.prompt} /> : null}
          <div className="sm:col-span-2">
            <SubmitButton>Save</SubmitButton>
          </div>
        </ActionForm>
      </details>
    </article>
  );
}

function Field({ name, label, value, area, wide }: { name: string; label: string; value: string; area?: boolean; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label className="label" htmlFor={`${name}`}>{label}</label>
      {area ? <textarea name={name} defaultValue={value} rows={4} className="input" /> : <input name={name} defaultValue={value} className="input" />}
    </div>
  );
}

function ReadyCard({ v }: { v: Video }) {
  const isVideo = v.format === "reel" || v.format === "photo_ad";
  return (
    <article className="card flex gap-4 p-4">
      <div className="w-36 shrink-0">
        {isVideo && v.final_url ? (
          <video src={v.final_url} poster={v.cover_url ?? undefined} controls playsInline className="aspect-[9/16] w-full rounded-lg bg-black object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.media[0] ?? v.cover_url ?? ""} alt="" className="w-full rounded-lg object-cover" />
        )}
        {v.format === "carousel" ? <p className="mt-1 text-xs text-muted">{v.media.length} slides</p> : null}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-semibold">{v.title}</p>
        <p className="line-clamp-4 whitespace-pre-line text-sm text-ink/80">{v.caption}</p>
        {v.error ? <p className="text-xs text-amber-700">{v.error}</p> : null}
        <ActionForm action={stSchedule.bind(null, v.id)} className="flex flex-wrap items-end gap-2">
          <div>
            <label className="label text-xs" htmlFor={`when-${v.id}`}>When (US Eastern) — empty = next free day</label>
            <input id={`when-${v.id}`} type="datetime-local" name="when" className="input py-1.5 text-sm" />
          </div>
          <SubmitButton pendingText="Scheduling…">Schedule</SubmitButton>
        </ActionForm>
        <div className="flex flex-wrap gap-2 text-xs">
          {v.format === "carousel"
            ? v.media.map((m, i) => (
                <a key={m} href={m} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">Slide {i + 1}</a>
              ))
            : null}
          <ActionButton action={stDelete.bind(null, v.id)} className="text-muted hover:text-danger" confirm="Delete this piece?">Delete</ActionButton>
        </div>
      </div>
    </article>
  );
}

function SettingsCard({ s }: { s: StudioSettings }) {
  return (
    <section className="card space-y-3 p-5">
      <h2 className="font-semibold">Studio settings</h2>
      <ActionForm action={stSaveSettings} className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="model">Video model (ModelsLab)</label>
          <select id="model" name="model" defaultValue={s.model} className="input">
            {VIDEO_MODELS.map((m) => (
              <option key={m.key} value={m.key}>{m.label} — ≈ ${m.perSecond.toFixed(2)}/sec</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="cap">Monthly budget (USD)</label>
          <input id="cap" name="cap" type="number" min={0} max={500} step={1} defaultValue={s.cap} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="postHour">Post time (US Eastern, hour)</label>
          <select id="postHour" name="postHour" defaultValue={s.postHour} className="input">
            {Array.from({ length: 17 }, (_, i) => i + 6).map((h) => (
              <option key={h} value={h}>{h <= 12 ? `${h}:00 ${h === 12 ? "pm" : "am"}` : `${h - 12}:00 pm`}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="autoSchedule" defaultChecked={s.autoSchedule} /> Schedule finished pieces automatically (next free day)
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="autoApprove" defaultChecked={s.autoApprove} /> Approve them automatically too (posts go out without my check)
        </label>
        <details className="text-sm sm:col-span-2">
          <summary className="cursor-pointer text-muted">Advanced: custom ModelsLab model ids</summary>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="t2vOverride">Text-to-video model_id</label>
              <input id="t2vOverride" name="t2vOverride" defaultValue={s.t2vOverride} className="input" placeholder="leave empty = from preset" />
            </div>
            <div>
              <label className="label" htmlFor="i2vOverride">Image-to-video model_id</label>
              <input id="i2vOverride" name="i2vOverride" defaultValue={s.i2vOverride} className="input" placeholder="leave empty = from preset" />
            </div>
          </div>
        </details>
        <p className="text-xs text-muted sm:col-span-2">
          Posts publish once a day at about 10–11 am US Eastern (Vercel&apos;s daily run), or press “Publish now” on the Posts tab. Prices are ModelsLab&apos;s published rates — estimates only.
        </p>
        <div className="sm:col-span-2">
          <SubmitButton>Save settings</SubmitButton>
        </div>
      </ActionForm>
    </section>
  );
}
