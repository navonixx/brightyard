import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Phone } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { getLead } from "@/lib/leadengine/leads";
import { one } from "@/lib/leadengine/db";
import { describe, draftEmail } from "@/lib/leadengine/outreach";
import { SOURCES, type SourceId } from "@/lib/leadengine/sources/meta";
import { ActionButton } from "@/components/admin/ui";
import { PageSkeleton } from "@/components/admin/skeleton";
import { LeEmailDraft } from "@/components/admin/lead-engine/email-draft";
import { LeReplies } from "@/components/admin/lead-engine/replies";
import { replyTemplates } from "@/lib/leadengine/replies";
import { previewUrlFor } from "@/lib/leadengine/preview";
import { CopyButton } from "@/components/admin/ui";
import { leBuildPreview, leSendToLeads, leUpdateLead } from "../../../../lead-engine-actions";

// “Build preview” reads their site and writes the page with AI inside this page's server action.
export const maxDuration = 60;

export default function LeLeadPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LeadDetail params={params} />
    </Suspense>
  );
}

const day = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : v ? String(v).slice(0, 10) : "");

async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const lead = Number.isFinite(Number(id)) ? await getLead(Number(id)) : null;
  if (!lead) notFound();
  const settings = await getSettings();
  const sentToday = Number((await one<{ n: number }>("SELECT count(*)::int n FROM le_leads WHERE contacted_at >= date_trunc('day', now())"))?.n ?? 0);
  const draft = draftEmail(lead, {
    name: settings.senderName,
    company: "Alderwell Creative",
    site: (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/^https?:\/\//, ""),
    address: settings.businessAddress,
  });
  const previewUrl = await previewUrlFor(lead.lead_id);
  const me = { name: settings.senderName, company: "Alderwell Creative", site: "", address: settings.businessAddress };
  const replies = replyTemplates(lead, previewUrl, me);
  const build = leBuildPreview.bind(null, lead.id);
  const solutions = [...new Set(lead.pain_signals.map((p) => p.solution).filter(Boolean))] as string[];
  const extra = lead.extra ?? {};
  const google = `https://www.google.com/search?q=${encodeURIComponent(`${lead.name} ${lead.city ?? ""} ${lead.state ?? ""}`)}`;
  const scored = !["pending", "working"].includes(lead.enrich_status);
  const save = leUpdateLead.bind(null, lead.id);
  const send = leSendToLeads.bind(null, [lead.id]);

  return (
    <div className="space-y-5">
      <Link href="/admin/lead-engine/leads" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Lead Engine leads
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{lead.name}</h1>
          <p className="text-muted">{describe(lead)}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {lead.sources.map((s) => (
              <span key={s} className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-black/80" style={{ background: SOURCES[s as SourceId]?.color ?? "#ddd" }}>
                {SOURCES[s as SourceId]?.label ?? s}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="card px-5 py-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Can pay</p>
            <p className="font-display text-3xl font-semibold text-emerald-600">{scored ? lead.pay_score : "…"}</p>
          </div>
          <div className="card px-5 py-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Pain</p>
            <p className="font-display text-3xl font-semibold text-pink-600">{scored ? lead.pain_score : "…"}</p>
          </div>
          {lead.lead_id ? (
            <Link href={`/admin/leads/${lead.lead_id}`} className="btn-ghost">Open in Leads →</Link>
          ) : (
            <ActionButton action={send} pendingText="Adding…">Send to Leads</ActionButton>
          )}
        </div>
      </div>

      <section className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="font-semibold">Free website preview</h2>
          <p className="text-sm text-muted">{previewUrl ? "Ready — send this link when they reply “yes”." : "Builds a working homepage for them in about a minute (from their current site, or fresh if they have none)."}</p>
          {previewUrl ? <p className="mt-1 break-all text-sm text-brand">{previewUrl}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {previewUrl ? (
            <>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">Open preview</a>
              <CopyButton text={previewUrl} label="Copy link" />
            </>
          ) : (
            <ActionButton action={build} pendingText="Building… (up to a minute)">Build preview</ActionButton>
          )}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
        <div className="space-y-5">
          <section className="card space-y-2 p-5 text-sm">
            <h2 className="mb-2 font-semibold">Contact</h2>
            {lead.phone ? (
              <p className="flex items-center gap-2"><Phone className="size-4 text-muted" /> <a href={`tel:${lead.phone}`} className="hover:underline">{lead.phone}</a></p>
            ) : null}
            {lead.email ? <p>✉️ {lead.email}</p> : <p className="text-muted">✉️ No email found</p>}
            {lead.emails?.length > 1 ? <p className="text-xs text-muted">Other addresses on the site: {lead.emails.filter((e) => e !== lead.email).slice(0, 5).join(", ")}</p> : null}
            {lead.website ? (
              <p>🌐 <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">{lead.domain ?? lead.website}</a></p>
            ) : (
              <p className="text-muted">🌐 No website</p>
            )}
            {lead.address ? <p>📍 {lead.address}</p> : null}
            <div className="flex flex-wrap gap-2 pt-2">
              {Object.entries(lead.socials ?? {}).map(([k, v]) => (
                <a key={k} href={v} target="_blank" rel="noopener noreferrer" className="btn-ghost px-3 py-1 text-xs capitalize">{k} <ExternalLink className="size-3" /></a>
              ))}
              <a href={google} target="_blank" rel="noopener noreferrer" className="btn-ghost px-3 py-1 text-xs">Google them <ExternalLink className="size-3" /></a>
            </div>
            {lead.rating != null ? <p className="pt-1">⭐ {lead.rating} · {lead.review_count ?? 0} reviews</p> : null}
            {extra.subscribers != null ? <p>▶️ {Number(extra.subscribers).toLocaleString("en-US")} subscribers · {Number(extra.videos ?? 0)} videos</p> : null}
            {Array.isArray(extra.people) && extra.people.length ? <p>👤 {(extra.people as string[]).join(", ")}</p> : null}
            {extra.about ? <p className="text-xs text-muted">“{String(extra.about).slice(0, 300)}”</p> : null}
          </section>

          <section className="card p-5">
            <h2 className="font-semibold">Why they can pay</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {lead.pay_signals.length ? (
                lead.pay_signals.map((s) => (
                  <li key={s.key} className="flex justify-between gap-3"><span>✅ {s.label}</span><span className="shrink-0 text-muted">+{s.points}</span></li>
                ))
              ) : (
                <li className="text-muted">{scored ? "No strong budget signals found." : "Still checking…"}</li>
              )}
            </ul>
          </section>

          <section className="card p-5">
            <h2 className="font-semibold">What hurts them</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {lead.pain_signals.length ? (
                lead.pain_signals.map((s) => (
                  <li key={s.key} className="flex justify-between gap-3">
                    <span>
                      ⚠️ {s.label}
                      {s.solution ? <span className="block text-xs text-emerald-700">→ {s.solution}</span> : null}
                    </span>
                    <span className="shrink-0 text-muted">+{s.points}</span>
                  </li>
                ))
              ) : (
                <li className="text-muted">{scored ? "No obvious problems found." : "Still checking…"}</li>
              )}
            </ul>
            {solutions.length ? (
              <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm">
                <p className="font-semibold text-emerald-700">What you can offer</p>
                <p className="mt-1">{solutions.join(" · ")}</p>
              </div>
            ) : null}
          </section>

          <section className="card p-5">
            <h2 className="font-semibold">Pipeline</h2>
            <form action={save} className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="status">Status</label>
                  <select id="status" name="status" defaultValue={lead.status} className="input">
                    {["new", "contacted", "replied", "won", "lost", "skip"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="follow_up">Follow up on</label>
                  <input id="follow_up" name="follow_up" type="date" defaultValue={day(lead.follow_up)} className="input" />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="notes">Notes</label>
                <textarea id="notes" name="notes" rows={3} defaultValue={lead.notes ?? ""} className="input" />
              </div>
              <button className="btn-ghost">Save</button>
            </form>
          </section>
        </div>

        <section className="card p-5">
          <h2 className="font-semibold">First email</h2>
          <p className="mb-4 text-sm text-muted">
            Written only from what we found. Edit anything, then open it in Gmail.{" "}
            {settings.businessAddress ? "" : <>Add your business address in <Link href="/admin/settings" className="text-brand hover:underline">Settings</Link> — US law requires it in cold emails.</>}
          </p>
          <p className={`mb-4 rounded-xl px-3 py-2 text-sm ${sentToday >= 20 ? "bg-red-50 text-danger" : "bg-paper"}`}>
            Sent today: <strong>{sentToday}</strong> / 20. {sentToday >= 20 ? "Stop for today — more than this from one Gmail lands in spam." : "A new Gmail should send about 15–20 a day, by hand, a few minutes apart."}
          </p>
          <LeEmailDraft id={lead.id} to={lead.email} subject={draft.subject} body={draft.body} />

          <h2 className="mt-8 font-semibold">When they reply</h2>
          <p className="mb-3 text-sm text-muted">Pick what they said, copy the answer into your reply in Gmail. Then set the status to “replied” on the left.</p>
          <LeReplies replies={replies} />
        </section>
      </div>
    </div>
  );
}
