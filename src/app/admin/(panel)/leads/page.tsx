import { Suspense } from "react";
import Link from "next/link";
import { Mail, Star } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listLeads } from "@/lib/data";
import { LEAD_STATUSES, TRADES, type LeadStatus } from "@/lib/db/schema";
import { TRADE_META } from "@/lib/brand";
import { placesEnabled } from "@/lib/places";
import { addLeadAction, checkWebsitesAction, findAndBuildAction, findLeadsAction, importCsvAction } from "../../actions";
import { ActionButton, ActionForm, SubmitButton } from "@/components/admin/ui";
import { PageSkeleton } from "@/components/admin/skeleton";
import { CurrentSiteCell, NewSiteCell } from "@/components/admin/site-cells";
import { STATUS_META, StatusBadge } from "@/components/admin/status";

// Find & build reads several websites and calls the AI; allow it time on Vercel.
export const maxDuration = 60;

export default function LeadsPage({ searchParams }: PageProps<"/admin/leads">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Leads searchParams={searchParams} />
    </Suspense>
  );
}

function TradeSelect({ name = "trade" }: { name?: string }) {
  return (
    <select name={name} className="input" defaultValue="landscaping">
      {TRADES.map((t) => (
        <option key={t} value={t}>{TRADE_META[t].label}</option>
      ))}
    </select>
  );
}

async function Leads({ searchParams }: { searchParams: PageProps<"/admin/leads">["searchParams"] }) {
  await requireAdmin();
  const params = await searchParams;
  const status = LEAD_STATUSES.includes(params.status as LeadStatus) ? (params.status as LeadStatus) : undefined;
  const leads = await listLeads(status);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Leads</h1>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Find via Google Places */}
        <section className="card p-5 lg:col-span-2">
          <h2 className="font-semibold">Find &amp; build (automatic)</h2>
          <p className="mt-1 text-sm text-muted">
            Opens the website of every business it finds, skips the ones that are already good, and builds a redesign + personal email only for weak sites.
            Takes 30–60 seconds. Read each lead before sending.
          </p>
          {placesEnabled() ? (
            <>
              <ActionForm action={findAndBuildAction} className="mt-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
                  <TradeSelect />
                  <input name="location" required placeholder="Spokane, WA" className="input" />
                  <select name="count" defaultValue="3" className="input" aria-label="How many">
                    <option value="1">1 lead</option>
                    <option value="3">3 leads</option>
                    <option value="5">5 leads</option>
                  </select>
                  <SubmitButton pendingText="Finding & building…">Find &amp; build</SubmitButton>
                </div>
              </ActionForm>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-muted">Just the list (no build)</summary>
                <ActionForm action={findLeadsAction} className="mt-3">
                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <TradeSelect />
                    <input name="location" required placeholder="Boise, ID" className="input" />
                    <SubmitButton className="btn-ghost" pendingText="Searching…">Search only</SubmitButton>
                  </div>
                </ActionForm>
              </details>
            </>
          ) : (
            <p className="mt-4 rounded-lg bg-sun-soft p-3 text-sm">
              GOOGLE_PLACES_API_KEY is not set yet. Add leads manually or by CSV below.
            </p>
          )}
        </section>

        {/* CSV */}
        <section className="card p-5">
          <h2 className="font-semibold">Import CSV</h2>
          <ActionForm action={importCsvAction} className="mt-3" resetOnSuccess>
            <textarea
              name="csv"
              rows={4}
              className="input font-mono text-xs"
              placeholder={"business,trade,owner,email,phone,website,city,state\nAcme Lawn,landscaping,Mike,mike@acme.com,,,Boise,ID"}
            />
            <div className="mt-2">
              <SubmitButton className="btn-ghost w-full" pendingText="Importing…">Import</SubmitButton>
            </div>
          </ActionForm>
        </section>
      </div>

      {/* Manual add */}
      <details className="card p-5">
        <summary className="cursor-pointer font-semibold">+ Add a lead manually</summary>
        <ActionForm action={addLeadAction} className="mt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <input name="businessName" required placeholder="Business name *" className="input" />
            <TradeSelect />
            <input name="ownerName" placeholder="Owner first name" className="input" />
            <input name="email" type="email" placeholder="Email" className="input" />
            <input name="phone" placeholder="Phone" className="input" />
            <input name="website" placeholder="Website / Facebook" className="input" />
            <input name="city" placeholder="City" className="input" />
            <input name="state" placeholder="State (ID)" maxLength={2} className="input" />
            <div className="grid grid-cols-2 gap-3">
              <input name="rating" placeholder="Rating 4.8" className="input" />
              <input name="reviewCount" placeholder="Reviews 37" className="input" />
            </div>
          </div>
          <textarea name="notes" rows={2} placeholder="Notes (what you noticed about them)" className="input mt-3" />
          <div className="mt-3">
            <SubmitButton>Add lead</SubmitButton>
          </div>
        </ActionForm>
      </details>

      <section className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="font-semibold">Check websites</h2>
          <p className="mt-0.5 text-sm text-muted">
            Opens each lead&apos;s current website and rates how weak it is (12 at a time). Red &quot;Weak&quot; = worth a redesign.
          </p>
        </div>
        <ActionButton action={checkWebsitesAction} pendingText="Opening websites…" className="btn-ghost">
          Check unchecked websites
        </ActionButton>
      </section>

      {/* Filters */}
      <nav className="flex gap-2 overflow-x-auto pb-1">
        <Link
          href="/admin/leads"
          className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${!status ? "bg-ink text-paper" : "bg-card text-muted"}`}
        >
          All
        </Link>
        {LEAD_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/leads?status=${s}`}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${status === s ? "bg-ink text-paper" : "bg-card text-muted"}`}
          >
            {STATUS_META[s].label}
          </Link>
        ))}
      </nav>

      {/* Table */}
      <section className="card overflow-hidden">
        {leads.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-line bg-paper text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Business</th>
                  <th className="px-4 py-3 font-medium">Their website (before)</th>
                  <th className="px-4 py-3 font-medium">Our new site (after)</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-paper">
                    <td className="px-4 py-3">
                      <Link href={`/admin/leads/${lead.id}`} className="font-medium hover:text-brand">
                        {lead.businessName}
                      </Link>
                      <p className="text-xs text-muted">
                        {TRADE_META[lead.trade].label} · {[lead.city, lead.state].filter(Boolean).join(", ") || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <CurrentSiteCell
                        website={lead.website}
                        score={lead.siteScore}
                        checked={Boolean(lead.siteCheckedAt)}
                        issues={lead.siteIssues}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <NewSiteCell token={lead.token} built={Boolean(lead.sample)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 text-muted">
                        {lead.rating ? (
                          <span className="inline-flex items-center gap-1 text-xs">
                            <Star className="size-3.5 fill-sun text-sun" /> {lead.rating}
                          </span>
                        ) : null}
                        <span title={lead.email ?? "No email yet"} className={lead.email ? "text-brand" : "opacity-40"}>
                          <Mail className="size-4" />
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-8 text-center text-sm text-muted">
            No leads here yet. Search above or add one manually.
          </p>
        )}
      </section>
    </div>
  );
}
