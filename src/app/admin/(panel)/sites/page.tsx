/* eslint-disable @next/next/no-img-element -- screenshots come from an external capture service */
import { Suspense } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listLeads } from "@/lib/data";
import { THEMES, type ThemeKey } from "@/components/site-template";
import { BrowserRender } from "@/components/site-render";
import { TRADE_FALLBACK } from "@/lib/photos";
import { siteUrl } from "@/lib/brand";
import { PageSkeleton } from "@/components/admin/skeleton";
import { StatusBadge } from "@/components/admin/status";
import { WeaknessBadge } from "@/components/admin/site-cells";
import { screenshotUrl } from "@/lib/sitecheck";

export default function SitesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Sites />
    </Suspense>
  );
}

const short = (url: string) => url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
const full = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);


async function Sites() {
  await requireAdmin();
  const leads = (await listLeads()).filter((l) => l.sample).slice(0, 24);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Before &amp; After</h1>
        <p className="mt-1 text-sm text-muted">
          Every lead with a finished redesign: their current website on the left, the one we built on the right. Click either side to open it. A new screenshot can take a minute to appear the first time.
        </p>
      </div>

      {leads.length ? (
        <div className="space-y-8">
          {leads.map((lead) => {
            const theme = lead.theme && lead.theme in THEMES ? (lead.theme as ThemeKey) : undefined;
            const images = lead.images.length ? lead.images : [TRADE_FALLBACK[lead.trade]];
            const after = `/p/${lead.token}`;
            return (
              <section key={lead.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
                  <div className="min-w-0">
                    <Link href={`/admin/leads/${lead.id}`} className="font-semibold hover:text-brand">
                      {lead.businessName}
                    </Link>
                    <p className="text-sm text-muted">{[lead.city, lead.state].filter(Boolean).join(", ") || "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <WeaknessBadge score={lead.siteScore} checked={Boolean(lead.siteCheckedAt)} />
                    <StatusBadge status={lead.status} />
                  </div>
                </div>

                <div className="grid gap-5 p-5 lg:grid-cols-2">
                  {/* Before */}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Before · their current site</p>
                    {lead.website ? (
                      <a href={full(lead.website)} target="_blank" rel="noopener noreferrer" className="group block">
                        <div className="overflow-hidden rounded-[12px] bg-white ring-1 ring-black/10">
                          <div className="flex items-center gap-1.5 border-b border-black/5 bg-[#f3f3f5] px-3 py-2">
                            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
                            <span className="size-2.5 rounded-full bg-[#febc2e]" />
                            <span className="size-2.5 rounded-full bg-[#28c840]" />
                            <span className="mx-auto truncate rounded-md bg-white px-6 py-0.5 text-[11px] text-[#6e6e73]">{short(lead.website)}</span>
                          </div>
                          <img
                            src={screenshotUrl(lead.website)}
                            alt={`Current website of ${lead.businessName}`}
                            loading="lazy"
                            className="aspect-[1280/820] w-full bg-[#f3f3f5] object-cover object-top"
                          />
                        </div>
                        <p className="mt-2 inline-flex items-center gap-1 text-sm group-hover:text-brand">
                          {short(lead.website)} <ExternalLink className="size-3.5" />
                        </p>
                      </a>
                    ) : (
                      <div className="grid aspect-[1280/860] place-items-center rounded-[12px] bg-paper text-sm text-muted ring-1 ring-line">
                        No website — we built their first one
                      </div>
                    )}
                    {lead.siteIssues?.length ? (
                      <ul className="mt-3 space-y-1 text-xs text-muted">
                        {lead.siteIssues.slice(0, 4).map((issue) => (
                          <li key={issue}>• {issue}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>

                  {/* After */}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand">After · the site we built</p>
                    <a href={after} target="_blank" rel="noopener noreferrer" className="group block">
                      <BrowserRender
                        data={{ ...lead, sample: lead.sample!, images, theme }}
                        url={short(`${siteUrl()}${after}`)}
                        scroll="hover"
                        initialZoom={0.42}
                        shadow={false}
                      />
                      <p className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand group-hover:underline">
                        {short(`${siteUrl()}${after}`)} <ExternalLink className="size-3.5" />
                      </p>
                    </a>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <p className="card p-8 text-center text-sm text-muted">
          No redesigns yet. Use &quot;Find &amp; build&quot; on the Leads page.
        </p>
      )}
    </div>
  );
}
