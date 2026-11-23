import { Suspense } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { readFilter } from "@/lib/leadengine/filter";
import { facets, listLeads, PAGE_SIZE } from "@/lib/leadengine/leads";
import { NICHES, nicheLabel } from "@/lib/leadengine/niches";
import { SOURCES } from "@/lib/leadengine/sources/meta";
import { PageSkeleton } from "@/components/admin/skeleton";
import { LeHeader } from "@/components/admin/lead-engine/tabs";
import { LeLeadTable, type LeRow } from "@/components/admin/lead-engine/lead-table";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default function LeLeadsPage({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Leads searchParams={searchParams} />
    </Suspense>
  );
}

async function Leads({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const f = readFilter(await searchParams);
  if (f.q) f.q = f.q.slice(0, 80);
  const [{ rows, total, page }, { states }] = await Promise.all([listLeads(f), facets()]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (patch: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, ...patch })) if (v !== undefined && v !== "" && v !== 0 && !(k === "page" && v === 1)) p.set(k, String(v));
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  const tableRows: LeRow[] = rows.map((l) => ({
    id: l.id,
    name: l.name,
    sub: [l.kind === "business" ? nicheLabel(l.niche) : l.category, [l.city, l.state].filter(Boolean).join(", ")].filter(Boolean).join(" · "),
    sources: l.sources,
    phone: l.phone,
    email: l.email,
    website: l.website,
    pay: l.pay_score,
    pain: l.pain_score,
    topPain: l.pain_signals?.[0]?.label ?? null,
    topPay: l.pay_signals?.map((x) => x.label).join(" · ") || null,
    status: l.status,
    scored: !["pending", "working"].includes(l.enrich_status),
    inLeads: Boolean(l.lead_id),
  }));

  return (
    <div className="space-y-5">
      <LeHeader active="/admin/lead-engine/leads" title="Leads" intro={`${total.toLocaleString("en-US")} leads · businesses that can pay and need help come first. Tick the best ones and “Send to Leads” to build previews and do outreach there.`} />

      <div className="flex flex-wrap gap-2">
        <Link href="/admin/lead-engine/leads?minPay=30&minPain=30&email=yes&status=new" className="btn-ghost px-3 py-1.5 text-sm">🔥 Hot leads</Link>
        <a href={`/admin/lead-engine/export${qs({ page: undefined })}`} className="btn-ghost px-3 py-1.5 text-sm"><Download className="size-4" /> Export CSV</a>
      </div>

      <form className="card flex flex-wrap items-end gap-2 p-4" action="/admin/lead-engine/leads">
        <input name="q" defaultValue={f.q} placeholder="Search name, domain, email" className="input w-56 py-2" />
        <select name="source" defaultValue={f.source ?? ""} className="input w-auto py-2" aria-label="Source">
          <option value="">All sources</option>
          {Object.entries(SOURCES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select name="niche" defaultValue={f.niche ?? ""} className="input w-auto py-2" aria-label="Business type">
          <option value="">All business types</option>
          {NICHES.map((n) => <option key={n.key} value={n.key}>{n.label}</option>)}
        </select>
        <select name="state" defaultValue={f.state ?? ""} className="input w-auto py-2" aria-label="State">
          <option value="">All states</option>
          {states.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input name="city" defaultValue={f.city} placeholder="City" className="input w-32 py-2" />
        <select name="email" defaultValue={f.email ?? ""} className="input w-auto py-2" aria-label="Email">
          <option value="">Email: any</option>
          <option value="yes">Has email</option>
          <option value="no">No email</option>
        </select>
        <select name="site" defaultValue={f.site ?? ""} className="input w-auto py-2" aria-label="Website">
          <option value="">Website: any</option>
          <option value="yes">Has website</option>
          <option value="no">No website</option>
        </select>
        <select name="minPay" defaultValue={String(f.minPay ?? "")} className="input w-auto py-2" aria-label="Can pay">
          <option value="">Can pay: any</option>
          {[20, 30, 40, 60].map((v) => <option key={v} value={v}>Can pay ≥ {v}</option>)}
        </select>
        <select name="minPain" defaultValue={String(f.minPain ?? "")} className="input w-auto py-2" aria-label="Pain">
          <option value="">Pain: any</option>
          {[20, 30, 50].map((v) => <option key={v} value={v}>Pain ≥ {v}</option>)}
        </select>
        <select name="status" defaultValue={f.status ?? ""} className="input w-auto py-2" aria-label="Status">
          <option value="">Status: active</option>
          {["new", "contacted", "replied", "won", "lost", "skip"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="kind" defaultValue={f.kind ?? ""} className="input w-auto py-2" aria-label="Kind">
          <option value="">All kinds</option>
          <option value="business">Local businesses</option>
          <option value="creator">Creators</option>
          <option value="company">Funded companies</option>
        </select>
        <select name="sort" defaultValue={f.sort ?? "best"} className="input w-auto py-2" aria-label="Sort">
          <option value="best">Best first</option>
          <option value="pay">Can pay first</option>
          <option value="pain">Most pain first</option>
          <option value="new">Newest first</option>
        </select>
        <button className="btn-primary py-2">Filter</button>
        <Link href="/admin/lead-engine/leads" className="btn-ghost py-2">Reset</Link>
      </form>

      <LeLeadTable rows={tableRows} firstNumber={(page - 1) * PAGE_SIZE + 1} />

      {pages > 1 ? (
        <div className="flex items-center justify-center gap-2 text-sm">
          {page > 1 ? <Link href={`/admin/lead-engine/leads${qs({ page: page - 1 })}`} className="btn-ghost">← Prev</Link> : null}
          <span className="text-muted">Page {page} of {pages}</span>
          {page < pages ? <Link href={`/admin/lead-engine/leads${qs({ page: page + 1 })}`} className="btn-ghost">Next →</Link> : null}
        </div>
      ) : null}
    </div>
  );
}
