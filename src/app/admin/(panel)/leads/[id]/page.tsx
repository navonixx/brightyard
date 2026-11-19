/* eslint-disable @next/next/no-img-element -- thumbnails of arbitrary image URLs */
import { Suspense, type InputHTMLAttributes, type ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Eye, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getLead, getSettings, leadEvents } from "@/lib/data";
import { LEAD_STATUSES, TRADES, type Lead } from "@/lib/db/schema";
import { siteUrl, TRADE_META } from "@/lib/brand";
import { THEMES, THEME_BY_TRADE } from "@/components/site-template";
import { aiEnabled, aiLabel } from "@/lib/ai";
import { imagekitEnabled } from "@/lib/imagekit";
import { composeEmail, gmailComposeUrl } from "@/lib/email";
import {
  autoBuildAction,
  checkSiteAction,
  deleteLeadAction,
  generateEmailAction,
  generateSampleAction,
  markEmailedAction,
  moveImageFirstAction,
  removeImageAction,
  saveEmailAction,
  saveSampleAction,
  setStatusAction,
  updateLeadAction,
  uploadImagesAction,
} from "../../../actions";
import { ActionButton, ActionForm, CopyButton, SubmitButton } from "@/components/admin/ui";
import { PageSkeleton } from "@/components/admin/skeleton";
import { SiteLinks } from "@/components/admin/site-links";
import { WeaknessBadge } from "@/components/admin/site-cells";
import { STATUS_META, StatusBadge, timeAgo } from "@/components/admin/status";

export const maxDuration = 60;

export default function LeadPage({ params }: PageProps<"/admin/leads/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Workspace params={params} />
    </Suspense>
  );
}

function Field({ label, name, defaultValue, ...rest }: { label: string; name: string; defaultValue?: string | number | null } & Omit<InputHTMLAttributes<HTMLInputElement>, "defaultValue" | "name">) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} defaultValue={defaultValue ?? ""} className="input" {...rest} />
    </div>
  );
}

function Section({ title, hint, children, aside }: { title: string; hint?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {hint ? <p className="mt-0.5 text-sm text-muted">{hint}</p> : null}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

async function Workspace({ params }: { params: PageProps<"/admin/leads/[id]">["params"] }) {
  await requireAdmin();
  const { id } = await params;
  const [lead, settings] = await Promise.all([getLead(id), getSettings()]);
  if (!lead) notFound();
  const events = await leadEvents(id);
  // eslint-disable-next-line react-hooks/purity -- Server Component, rendered once per request
  const now = Date.now();
  const link = `${siteUrl()}/p/${lead.token}`;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/leads" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Leads
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-semibold tracking-tight">{lead.businessName}</h1>
            <StatusBadge status={lead.status} />
            <span className="inline-flex items-center gap-1 text-sm text-muted">
              <Eye className="size-4" /> {lead.viewCount} views
              {lead.lastViewedAt ? ` · last ${timeAgo(lead.lastViewedAt, now)}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CopyButton text={link} label="Copy preview link" />
            <a href={`/p/${lead.token}`} target="_blank" className="btn-ghost px-3 py-1.5 text-xs">
              Open preview <ExternalLink className="size-3.5" />
            </a>
          </div>
        </div>
      </div>

      <SiteLinks website={lead.website} token={lead.token} size="lg" />

      {lead.website ? (
        <section className="card flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">Their current website</h2>
              <WeaknessBadge score={lead.siteScore} checked={Boolean(lead.siteCheckedAt)} />
            </div>
            {lead.siteIssues?.length ? (
              <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm text-muted sm:grid-cols-2">
                {lead.siteIssues.map((issue) => (
                  <li key={issue}>• {issue}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-muted">
                {lead.siteCheckedAt ? "No problems found — this site is already decent." : "Not checked yet."}
              </p>
            )}
          </div>
          <ActionButton action={checkSiteAction.bind(null, lead.id)} pendingText="Opening site…" className="btn-ghost">
            {lead.siteCheckedAt ? "Re-check" : "Check website"}
          </ActionButton>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ── Left: work ── */}
        <div className="space-y-6">
          {lead.website ? (
            <section className="card flex flex-wrap items-center justify-between gap-3 p-5">
              <div className="min-w-0">
                <h2 className="font-semibold">Auto-build from their website</h2>
                <p className="mt-0.5 text-sm text-muted">
                  Reads their website and writes the copy, theme, photos and email in one go (replaces what is here now).
                </p>
              </div>
              <ActionButton
                action={autoBuildAction.bind(null, lead.id)}
                pendingText="Reading their site…"
                confirm={lead.sample ? "This replaces the copy, photos and email draft for this lead. Continue?" : undefined}
              >
                {lead.sample ? "Rebuild" : "Auto-build"}
              </ActionButton>
            </section>
          ) : null}
          <SampleSection lead={lead} />
          <ImagesSection lead={lead} />
          <EmailSection
            lead={lead}
            footer={composeEmail("", settings)}
            full={lead.emailBody ? composeEmail(lead.emailBody, settings) : ""}
            account={settings.senderEmail}
          />
          <DetailsSection lead={lead} />
        </div>

        {/* ── Right: live preview + status ── */}
        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-2 text-xs text-muted">
              <span className="truncate">{link}</span>
              <span>Live preview</span>
            </div>
            <iframe
              key={lead.updatedAt.getTime()}
              src={`/p/${lead.token}`}
              title="Preview"
              className="h-[560px] w-full bg-white"
            />
          </section>

          <Section title="Status & money">
            <ActionForm action={setStatusAction.bind(null, lead.id)}>
<div key={lead.updatedAt.getTime()} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <div>
                  <label className="label" htmlFor="status">Status</label>
                  <select id="status" name="status" defaultValue={lead.status} className="input">
                    {LEAD_STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_META[s].label}</option>
                    ))}
                  </select>
                </div>
                <Field label="Paid amount ($)" name="paidAmount" defaultValue={lead.paidAmount} inputMode="numeric" />
                <SubmitButton>Update</SubmitButton>
              </div>
            </div>
</ActionForm>
            {lead.offerAmount ? (
              <p className="mt-3 rounded-lg bg-sun-soft p-3 text-sm">
                Prospect chose <strong>${lead.offerAmount}</strong>. Send a PayPal invoice, then set status to Won and fill the paid amount.
              </p>
            ) : null}
          </Section>

          <Section title="Timeline">
            {events.length ? (
              <ul className="space-y-2 text-sm">
                {events.map((event) => (
                  <li key={event.id} className="flex justify-between gap-3">
                    <span>
                      <span className="font-medium">{event.type.replace("_", " ")}</span>
                      {event.data ? (
                        <span className="text-muted"> {JSON.stringify(event.data).slice(0, 120)}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-xs text-muted">{timeAgo(event.createdAt, now)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No activity yet.</p>
            )}
          </Section>

          <ActionButton
            action={deleteLeadAction.bind(null, lead.id)}
            className="btn text-danger hover:bg-danger/10"
            confirm={`Delete ${lead.businessName}? This can't be undone.`}
            pendingText="Deleting…"
          >
            <Trash2 className="size-4" /> Delete lead
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

function SampleSection({ lead }: { lead: Lead }) {
  const s = lead.sample;
  return (
    <Section
      title="1 · Preview copy"
      hint={aiEnabled() ? `${aiLabel()} writes it from the lead's details. Edit anything before sending.` : "No AI key yet — templates are used. Edit freely."}
      aside={
        <ActionButton action={generateSampleAction.bind(null, lead.id)} pendingText="Writing…" className="btn-primary">
          {s ? "Regenerate" : "Generate copy"}
        </ActionButton>
      }
    >
      {s ? (
        <ActionForm action={saveSampleAction.bind(null, lead.id)} className="space-y-3">
<div key={lead.updatedAt.getTime()} className="space-y-3">
          <Field label="Headline" name="headline" defaultValue={s.headline} />
          <div>
            <label className="label" htmlFor="subheadline">Subheadline</label>
            <textarea id="subheadline" name="subheadline" rows={2} defaultValue={s.subheadline} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="services">Services — one per line: Title — description</label>
            <textarea
              id="services"
              name="services"
              rows={4}
              defaultValue={s.services.map((x) => `${x.title} — ${x.description}`).join("\n")}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="whyUs">Why us — one per line</label>
            <textarea id="whyUs" name="whyUs" rows={3} defaultValue={s.whyUs.join("\n")} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="about">About</label>
            <textarea id="about" name="about" rows={3} defaultValue={s.about} className="input" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Button text" name="cta" defaultValue={s.cta} />
            <Field label="Service area" name="serviceArea" defaultValue={s.serviceArea} />
          </div>
          <SubmitButton>Save copy</SubmitButton>
        </div>
</ActionForm>
      ) : (
        <p className="text-sm text-muted">No copy yet — the preview shows template text until you generate it.</p>
      )}
    </Section>
  );
}

function ImagesSection({ lead }: { lead: Lead }) {
  return (
    <Section title="2 · Images" hint="First image = hero. Rest = gallery. Upload AI-made or stock photos.">
      {lead.images.length ? (
        <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {lead.images.map((image, i) => (
            <div key={image.url + i} className="group relative">
              <img src={image.url} alt={image.alt} className="aspect-square w-full rounded-xl object-cover" />
              {i === 0 ? (
                <span className="absolute left-1.5 top-1.5 rounded bg-ink/80 px-1.5 py-0.5 text-[10px] font-semibold text-paper">HERO</span>
              ) : null}
              <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between opacity-0 transition group-hover:opacity-100">
                {i > 0 ? (
                  <ActionButton action={moveImageFirstAction.bind(null, lead.id, i)} className="rounded bg-card px-1.5 py-0.5 text-[10px] font-semibold">
                    Make hero
                  </ActionButton>
                ) : <span />}
                <ActionButton action={removeImageAction.bind(null, lead.id, i)} className="rounded bg-danger px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Remove
                </ActionButton>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <ActionForm action={uploadImagesAction.bind(null, lead.id)} resetOnSuccess className="space-y-3">
        {imagekitEnabled() ? (
          <input type="file" name="files" accept="image/*" multiple className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:font-semibold file:text-brand" />
        ) : (
          <p className="rounded-lg bg-sun-soft p-3 text-sm">IMAGEKIT_PRIVATE_KEY is not set — you can only paste image URLs for now.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input name="url" placeholder="…or paste an https:// image URL" className="input" />
          <input name="alt" placeholder="Alt text (optional)" className="input" />
          <SubmitButton pendingText="Uploading…">Add</SubmitButton>
        </div>
      </ActionForm>
    </Section>
  );
}

function EmailSection({ lead, footer, full, account }: { lead: Lead; footer: string; full: string; account: string }) {
  const gmail =
    lead.email && lead.emailBody
      ? gmailComposeUrl({ to: lead.email, subject: lead.emailSubject ?? "", body: full, account: account || undefined })
      : null;
  return (
    <Section
      title="3 · Email"
      hint={lead.email ? `To: ${lead.email}` : "No email address yet — add it in Details below."}
      aside={
        <ActionButton action={generateEmailAction.bind(null, lead.id)} pendingText="Writing…" className="btn-primary">
          {lead.emailBody ? "Rewrite" : "Write draft"}
        </ActionButton>
      }
    >
      {lead.emailBody ? (
        <>
          <ActionForm action={saveEmailAction.bind(null, lead.id)} className="space-y-3">
<div key={lead.updatedAt.getTime()} className="space-y-3">
            <Field label="Subject" name="subject" defaultValue={lead.emailSubject} />
            <div>
              <label className="label" htmlFor="body">Body — {"{me}"} becomes the first word of your sender name</label>
              <textarea id="body" name="body" rows={9} defaultValue={lead.emailBody} className="input" />
            </div>
            <pre className="whitespace-pre-wrap rounded-lg bg-paper p-3 text-xs text-muted">{footer}</pre>
            <div className="flex flex-wrap items-center gap-2">
              <SubmitButton className="btn-ghost">Save draft</SubmitButton>
              <CopyButton text={lead.emailSubject ?? ""} label="Copy subject" />
              <CopyButton text={full} label="Copy email" />
            </div>
          </div>
</ActionForm>
          <div className="mt-4 flex flex-wrap items-start gap-2 border-t border-line pt-4">
            {gmail ? (
              <a href={gmail} target="_blank" rel="noopener noreferrer" className="btn-primary">
                Open in Gmail <ExternalLink className="size-3.5" />
              </a>
            ) : null}
            {lead.emailedAt ? (
              <p className="py-2 text-sm text-muted">Emailed {lead.emailedAt.toLocaleDateString("en-US")}.</p>
            ) : (
              <ActionButton action={markEmailedAction.bind(null, [lead.id])} className="btn-ghost">
                Mark as emailed
              </ActionButton>
            )}
          </div>
          {gmail && !lead.emailedAt ? (
            <p className="mt-2 text-xs text-muted">Gmail opens with everything filled in. Send it, then click &quot;Mark as emailed&quot; here.</p>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted">Generate the preview first, then write the email — it includes their personal link.</p>
      )}
    </Section>
  );
}

function DetailsSection({ lead }: { lead: Lead }) {
  return (
    <Section title="4 · Details">
      <ActionForm action={updateLeadAction.bind(null, lead.id)} className="space-y-3">
<div key={lead.updatedAt.getTime()} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Business name" name="businessName" defaultValue={lead.businessName} />
          <div>
            <label className="label" htmlFor="trade">Trade</label>
            <select id="trade" name="trade" defaultValue={lead.trade} className="input">
              {TRADES.map((t) => (
                <option key={t} value={t}>{TRADE_META[t].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="theme">Design theme</label>
            <select id="theme" name="theme" defaultValue={lead.theme ?? ""} className="input">
              <option value="">Auto ({THEME_BY_TRADE[lead.trade]})</option>
              {Object.keys(THEMES).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <Field label="Owner first name" name="ownerName" defaultValue={lead.ownerName} />
          <Field label="Email" name="email" type="email" defaultValue={lead.email} />
          <Field label="Phone" name="phone" defaultValue={lead.phone} />
          <Field label="Website" name="website" defaultValue={lead.website} />
          <Field label="City" name="city" defaultValue={lead.city} />
          <Field label="State" name="state" defaultValue={lead.state} maxLength={2} />
          <Field label="Google rating" name="rating" defaultValue={lead.rating} />
          <Field label="Review count" name="reviewCount" defaultValue={lead.reviewCount} />
        </div>
        <Field label="Promo video URL (optional, .mp4)" name="videoUrl" defaultValue={lead.videoUrl} />
        <div>
          <label className="label" htmlFor="notes">Notes</label>
          <textarea id="notes" name="notes" rows={3} defaultValue={lead.notes ?? ""} className="input" />
        </div>
        <div className="flex items-center justify-between">
          <SubmitButton>Save details</SubmitButton>
          <span className="text-xs text-muted">Score {lead.score} · source {lead.source}</span>
        </div>
      </div>
</ActionForm>
    </Section>
  );
}
