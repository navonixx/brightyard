import { Suspense } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { harvestProgress, listProspects, PAGE_SIZE, prospectMatrix, type ProspectFilter } from "@/lib/harvest";
import { MARKETS, NICHES, nicheLabel } from "@/lib/niches";
import { placesEnabled } from "@/lib/places";
import { ActionButton, ActionForm } from "@/components/admin/ui";
import { PageSkeleton } from "@/components/admin/skeleton";
import { HarvestPlanner } from "@/components/admin/database/harvest-planner";
import { Disclosure } from "@/components/admin/database/disclosure";
import { HarvestRunner } from "@/components/admin/database/harvest-runner";
import { ProspectTable, type ProspectRow } from "@/components/admin/database/prospect-table";
import { clearQueueAction, harvestStepAction, queueHarvestAction, retryFailedAction } from "../../database-actions";

// Each harvester step and "Add & build" runs inside this page's server actions.
export const maxDuration = 60;

export default function DatabasePage({ searchParams }: PageProps<"/admin/database">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Database searchParams={searchParams} />
    </Suspense>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

function parseFilter(params: Record<string, string | string[] | undefined>): ProspectFilter {
  const pick = <T extends string>(v: string | undefined, allowed: readonly T[]) => (allowed.includes(v as T) ? (v as T) : undefined);
  return {
    niche: one(params.niche),
    market: one(params.market),
    email: pick(one(params.email), ["yes", "no"] as const),
    site: pick(one(params.site), ["weak", "decent", "none", "unchecked"] as const),
    lead: pick(one(params.lead), ["yes", "no"] as const),
    q: one(params.q)?.slice(0, 80),
    page: Math.max(1, Number(one(params.page)) || 1),
  };
}

function query(f: ProspectFilter, patch: Partial<ProspectFilter> = {}) {
  const merged = { ...f, ...patch };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v !== undefined && v !== "" && !(k === "page" && v === 1)) params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

async function Database({ searchParams }: { searchParams: PageProps<"/admin/database">["searchParams"] }) {
  await requireAdmin();
  const filter = parseFilter(await searchParams);
  const [progress, matrix, { rows, total }] = await Promise.all([harvestProgress(), prospectMatrix(), listProspects(filter)]);

  const nicheKeys = [...new Set(matrix.map((m) => m.niche))].sort((a, b) => {
    const ia = NICHES.findIndex((n) => n.key === a);
    const ib = NICHES.findIndex((n) => n.key === b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });
  const marketKeys = [...new Set(matrix.map((m) => m.market))].sort();
  const cell = (niche: string, market: string) => matrix.find((m) => m.niche === niche && m.market === market);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const tableRows: ProspectRow[] = rows.map((p) => ({
    id: p.id,
    name: p.name,
    niche: nicheLabel(p.niche),
    market: p.market,
    website: p.website,
    phone: p.phone,
    email: p.email,
    otherEmails: p.email ? [] : (p.emails ?? []),
    rating: p.rating,
    reviewCount: p.reviewCount,
    siteScore: p.siteScore,
    siteIssues: p.siteIssues,
    enrichStatus: p.enrichStatus,
    leadId: p.leadId,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Lead Database</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Collect thousands of local businesses at once: every niche, city by city. Each website is opened, scored for weakness and searched for an email.
          Then tick the best ones and send them to Leads — with or without a ready-built redesign.
        </p>
      </div>

      {!placesEnabled() ? (
        <p className="card bg-sun-soft p-4 text-sm">GOOGLE_PLACES_API_KEY is not set, so the harvester can&apos;t search yet.</p>
      ) : null}

      <Disclosure
        title="Collect leads"
        description="Pick niches and cities. Each one is searched in the city and its suburbs until Google has nothing new — no fixed number, no duplicates."
        defaultOpen={progress.jobsTotal === 0}
      >
        <ActionForm action={queueHarvestAction}>
          <HarvestPlanner
            niches={NICHES.map((n) => ({ value: n.key, label: n.label, group: n.group }))}
            markets={MARKETS.map((m) => {
              const [city, state] = m.value.split(", ");
              return { value: m.value, label: city, group: state, badge: m.recommended ? "top" : undefined };
            })}
            defaultMarkets={MARKETS.filter((m) => m.recommended).map((m) => m.value)}
            lookupCap={progress.usage.lookupCap}
            searchCap={progress.usage.searchCap}
          />
        </ActionForm>
      </Disclosure>

      <HarvestRunner initial={progress} step={harvestStepAction} />
      {progress.jobsTotal ? (
        <div className="-mt-3 flex flex-wrap gap-3">
          {progress.jobsFailed ? (
            <ActionButton action={retryFailedAction} className="btn-ghost px-3 py-1.5 text-xs" pendingText="Re-queuing…">
              Retry {progress.jobsFailed} failed
            </ActionButton>
          ) : null}
          {progress.jobsTotal > progress.jobsDone + progress.jobsFailed ? (
            <ActionButton
              action={clearQueueAction}
              className="btn-ghost px-3 py-1.5 text-xs"
              pendingText="Clearing…"
              confirm="Remove all unfinished searches from the queue? Businesses already found stay in the database."
            >
              Clear unfinished searches
            </ActionButton>
          ) : null}
        </div>
      ) : null}

      {matrix.length ? (
        <section className="card overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-semibold">Coverage</h2>
            <p className="mt-0.5 text-sm text-muted">Businesses found per niche and city · <span className="text-brand">emails found</span>. Click a number to see that group.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-paper text-left text-xs text-muted">
                <tr>
                  <th className="sticky left-0 bg-paper px-4 py-2.5 font-medium">Niche</th>
                  {marketKeys.map((m) => (
                    <th key={m} className="whitespace-nowrap px-3 py-2.5 text-right font-medium">
                      <Link href={`/admin/database${query({}, { market: m })}`} className="hover:text-ink">
                        {m}
                      </Link>
                    </th>
                  ))}
                  <th className="px-4 py-2.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {nicheKeys.map((n) => {
                  const rowCells = marketKeys.map((m) => cell(n, m));
                  const sum = rowCells.reduce((s, c) => s + (c?.total ?? 0), 0);
                  const sumEmails = rowCells.reduce((s, c) => s + (c?.emails ?? 0), 0);
                  return (
                    <tr key={n}>
                      <td className="sticky left-0 whitespace-nowrap bg-card px-4 py-2 font-medium">
                        <Link href={`/admin/database${query({}, { niche: n })}`} className="hover:text-brand">
                          {nicheLabel(n)}
                        </Link>
                      </td>
                      {marketKeys.map((m, i) => {
                        const c = rowCells[i];
                        return (
                          <td key={m} className="px-3 py-2 text-right tabular-nums">
                            {c ? (
                              <Link href={`/admin/database${query({}, { niche: n, market: m })}`} className="hover:underline">
                                {c.total} · <span className="text-brand">{c.emails}</span>
                              </Link>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2 text-right font-semibold tabular-nums">
                        {sum} · <span className="text-brand">{sumEmails}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="card overflow-hidden">
        <form className="grid gap-3 border-b border-line p-4 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_1.4fr_auto]" action="/admin/database">
          <select name="niche" defaultValue={filter.niche ?? ""} className="input" aria-label="Niche">
            <option value="">All niches</option>
            {nicheKeys.map((n) => (
              <option key={n} value={n}>
                {nicheLabel(n)}
              </option>
            ))}
          </select>
          <select name="market" defaultValue={filter.market ?? ""} className="input" aria-label="City">
            <option value="">All cities</option>
            {marketKeys.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select name="email" defaultValue={filter.email ?? ""} className="input" aria-label="Email">
            <option value="">Email: any</option>
            <option value="yes">Has email</option>
            <option value="no">No email</option>
          </select>
          <select name="site" defaultValue={filter.site ?? ""} className="input" aria-label="Website">
            <option value="">Website: any</option>
            <option value="weak">Weak website</option>
            <option value="decent">Decent website</option>
            <option value="none">No real website</option>
            <option value="unchecked">Not checked yet</option>
          </select>
          <select name="lead" defaultValue={filter.lead ?? ""} className="input" aria-label="In Leads">
            <option value="">In Leads: any</option>
            <option value="no">Not in Leads yet</option>
            <option value="yes">Already in Leads</option>
          </select>
          <input name="q" defaultValue={filter.q ?? ""} placeholder="Search name, site or email" className="input" />
          <div className="flex gap-2">
            <button className="btn-primary">Filter</button>
            <Link href="/admin/database" className="btn-ghost">
              Reset
            </Link>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
          <p className="text-muted">
            <strong className="text-ink">{total.toLocaleString("en-US")}</strong> businesses
            {total > PAGE_SIZE ? ` · page ${filter.page} of ${pages}` : ""}
          </p>
          <div className="flex items-center gap-2">
            <a href={`/admin/database/export${query(filter, { page: undefined })}`} className="btn-ghost px-3 py-1.5 text-xs">
              <Download className="size-3.5" /> Export CSV
            </a>
            <Link
              href={`/admin/database${query({}, { email: "yes", site: "weak", lead: "no" })}`}
              className="btn-ghost px-3 py-1.5 text-xs"
            >
              Best targets: weak site + email
            </Link>
          </div>
        </div>

        {tableRows.length ? (
          <ProspectTable rows={tableRows} firstNumber={(filter.page! - 1) * PAGE_SIZE + 1} />
        ) : (
          <p className="p-10 text-center text-sm text-muted">
            {progress.prospects ? "No businesses match these filters." : "The database is empty. Pick niches and cities above, then press Start."}
          </p>
        )}

        {pages > 1 ? (
          <nav className="flex items-center justify-center gap-2 border-t border-line p-4 text-sm">
            {filter.page! > 1 ? (
              <Link href={`/admin/database${query(filter, { page: filter.page! - 1 })}`} className="btn-ghost px-3 py-1.5">
                ← Previous
              </Link>
            ) : null}
            <span className="px-2 text-muted">
              {filter.page} / {pages}
            </span>
            {filter.page! < pages ? (
              <Link href={`/admin/database${query(filter, { page: filter.page! + 1 })}`} className="btn-ghost px-3 py-1.5">
                Next →
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>
    </div>
  );
}
