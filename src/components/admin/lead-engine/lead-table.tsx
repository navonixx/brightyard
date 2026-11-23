"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Globe, Mail, Phone } from "lucide-react";
import { leBulkStatus, leSendToLeads } from "@/app/admin/lead-engine-actions";
import { SOURCES, type SourceId } from "@/lib/leadengine/sources/meta";

export type LeRow = {
  id: number;
  name: string;
  sub: string;
  sources: string[];
  phone: string | null;
  email: string | null;
  website: string | null;
  pay: number;
  pain: number;
  topPain: string | null;
  topPay: string | null;
  status: string;
  scored: boolean;
  inLeads: boolean;
};

const bar = (v: number, color: string) => (
  <div className="flex items-center gap-2">
    <div className="h-1.5 w-14 overflow-hidden rounded-full bg-line/70">
      <div className="h-full rounded-full" style={{ width: `${v}%`, background: color }} />
    </div>
    <span className="w-7 text-right tabular-nums">{v}</span>
  </div>
);

export function LeLeadTable({ rows, firstNumber }: { rows: LeRow[]; firstNumber: number }) {
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const all = rows.length > 0 && rows.every((r) => picked.has(r.id));
  const set = (id: number, on: boolean) =>
    setPicked((p) => {
      const n = new Set(p);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
  const run = (fn: () => Promise<{ message?: string } | null>) =>
    start(async () => {
      const r = await fn();
      setMessage(r?.message ?? null);
      setPicked(new Set());
    });

  return (
    <div className="card overflow-hidden">
      {picked.size || message ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-brand-soft px-4 py-2.5 text-sm">
          {picked.size ? (
            <>
              <span className="font-medium">{picked.size} selected:</span>
              <button disabled={pending} onClick={() => run(() => leSendToLeads([...picked]))} className="btn-primary px-3 py-1 text-xs">
                Send to Leads
              </button>
              <span className="text-muted">mark as</span>
              {["contacted", "replied", "won", "lost", "skip", "new"].map((s) => (
                <button key={s} disabled={pending} onClick={() => run(() => leBulkStatus([...picked], s))} className="btn-ghost px-3 py-1 text-xs">
                  {s}
                </button>
              ))}
            </>
          ) : null}
          {message ? <span className="text-brand">{message}</span> : null}
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-paper text-left text-xs text-muted">
            <tr>
              <th className="w-8 px-3 py-2.5"><input type="checkbox" aria-label="Select all" checked={all} onChange={(e) => setPicked(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} /></th>
              <th className="w-10 py-2.5 font-medium">#</th>
              <th className="py-2.5 font-medium">Lead</th>
              <th className="py-2.5 font-medium">Contact</th>
              <th className="py-2.5 font-medium">Found on</th>
              <th className="py-2.5 font-medium">Can pay</th>
              <th className="py-2.5 font-medium">Pain</th>
              <th className="py-2.5 font-medium">Biggest problem</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r, i) => (
              <tr key={r.id} className="hover:bg-paper/60">
                <td className="px-3 py-3"><input type="checkbox" aria-label={`Select ${r.name}`} checked={picked.has(r.id)} onChange={(e) => set(r.id, e.target.checked)} /></td>
                <td className="py-3 tabular-nums text-muted">{firstNumber + i}</td>
                <td className="max-w-[240px] py-3 pr-3">
                  <Link href={`/admin/lead-engine/leads/${r.id}`} className="font-semibold hover:text-brand">{r.name}</Link>
                  <p className="truncate text-xs text-muted">{r.sub}</p>
                </td>
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-2.5">
                    <Phone className={`size-4 ${r.phone ? "text-emerald-600" : "text-line"}`} aria-label={r.phone ?? "no phone"} />
                    <Mail className={`size-4 ${r.email ? "text-emerald-600" : "text-line"}`} aria-label={r.email ?? "no email"} />
                    <Globe className={`size-4 ${r.website ? "text-emerald-600" : "text-line"}`} aria-label={r.website ?? "no website"} />
                  </div>
                  {r.email ? <p className="mt-1 max-w-[190px] truncate text-xs text-muted">{r.email}</p> : null}
                </td>
                <td className="py-3 pr-3">
                  <div className="flex flex-wrap gap-1">
                    {r.sources.map((s) => (
                      <span key={s} className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-black/80" style={{ background: SOURCES[s as SourceId]?.color ?? "#ddd" }}>
                        {SOURCES[s as SourceId]?.short ?? s}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3 pr-3" title={r.topPay ?? ""}>{r.scored ? bar(r.pay, "#16a34a") : <span className="text-muted">checking…</span>}</td>
                <td className="py-3 pr-3">{r.scored ? bar(r.pain, "#db2777") : null}</td>
                <td className="max-w-[260px] py-3 pr-3 text-ink/80">{r.topPain ?? <span className="text-muted">—</span>}</td>
                <td className="px-3 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${r.status === "new" ? "bg-paper text-muted" : r.status === "won" ? "bg-emerald-100 text-emerald-700" : "bg-brand-soft text-brand-strong"}`}>{r.status}</span>
                  {r.inLeads ? <span className="ml-1 rounded-full bg-sun-soft px-2 py-0.5 text-xs">in Leads</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length ? <p className="py-10 text-center text-muted">No leads match these filters.</p> : null}
    </div>
  );
}
