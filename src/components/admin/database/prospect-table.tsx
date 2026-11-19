"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Sparkles, Star, UserPlus } from "lucide-react";
import { WeaknessBadge } from "@/components/admin/site-cells";
import { promoteAction } from "@/app/admin/database-actions";

export type ProspectRow = {
  id: number;
  name: string;
  niche: string;
  market: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  otherEmails: string[];
  rating: number | null;
  reviewCount: number | null;
  siteScore: number | null;
  siteIssues: string[] | null;
  enrichStatus: string;
  leadId: string | null;
};

const short = (url: string) => url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "").slice(0, 40);

function SiteCell({ row }: { row: ProspectRow }) {
  if (!row.website) return <span className="text-xs text-muted">No website — build their first</span>;
  if (row.enrichStatus === "social") {
    return (
      <a href={row.website} target="_blank" rel="noopener noreferrer" className="text-xs text-muted hover:text-ink">
        Only a social page ↗
      </a>
    );
  }
  return (
    <div className="min-w-0 space-y-1">
      <a href={row.website} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-57.5 items-center gap-1 text-sm hover:text-brand">
        <span className="truncate">{short(row.website)}</span> <ExternalLink className="size-3 shrink-0" />
      </a>
      <div className="flex items-center gap-2">
        {row.enrichStatus === "pending" || row.enrichStatus === "working" ? (
          <WeaknessBadge score={null} checked={false} />
        ) : (
          <WeaknessBadge score={row.enrichStatus === "failed" ? null : row.siteScore} checked />
        )}
        {row.siteIssues?.[0] ? (
          <span className="max-w-50 truncate text-[11px] text-muted" title={row.siteIssues.join("\n")}>
            {row.siteIssues[0]}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** `firstNumber` = number of the first row, so numbering continues across pages. */
export function ProspectTable({ rows, firstNumber = 1 }: { rows: ProspectRow[]; firstNumber?: number }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<"add" | "build" | null>(null);
  const [message, setMessage] = useState<{ ok?: boolean; text: string } | null>(null);

  const allPicked = rows.length > 0 && rows.every((r) => picked.has(r.id));
  const toggle = (id: number) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const run = (build: boolean) => {
    const ids = [...picked];
    if (build && ids.length > 5) {
      setMessage({ ok: false, text: "Build up to 5 at a time (each one is read and written by the AI). Untick a few." });
      return;
    }
    setBusy(build ? "build" : "add");
    setMessage(null);
    start(async () => {
      const result = await promoteAction(ids, build);
      setMessage(result?.message ? { ok: result.ok, text: result.message } : null);
      if (result?.ok) setPicked(new Set());
      setBusy(null);
      router.refresh();
    });
  };

  return (
    <div>
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-line bg-card/95 px-4 py-3 backdrop-blur">
        <span className="text-sm">
          <strong>{picked.size}</strong> <span className="text-muted">selected</span>
        </span>
        <button type="button" className="btn-ghost px-3 py-1.5 text-sm" disabled={!picked.size || pending} onClick={() => run(false)}>
          {busy === "add" ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />} Add to Leads
        </button>
        <button type="button" className="btn-primary px-3 py-1.5 text-sm" disabled={!picked.size || pending} onClick={() => run(true)}>
          {busy === "build" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {busy === "build" ? "Building — up to a minute…" : "Add & build sites (max 5)"}
        </button>
        {message ? <span className={`text-sm ${message.ok ? "text-brand" : "text-danger"}`}>{message.text}</span> : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-245 text-sm">
          <thead className="border-b border-line bg-paper text-left text-xs text-muted">
            <tr>
              <th className="w-12 py-3 pl-4 text-right font-medium">#</th>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all on this page"
                  checked={allPicked}
                  onChange={() => setPicked(allPicked ? new Set() : new Set(rows.map((r) => r.id)))}
                  className="size-4 accent-brand"
                />
              </th>
              <th className="px-3 py-3 font-medium">Business</th>
              <th className="px-3 py-3 font-medium">Their website</th>
              <th className="px-3 py-3 font-medium">Email</th>
              <th className="px-3 py-3 font-medium">Phone</th>
              <th className="px-3 py-3 font-medium">In Leads</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row, i) => (
              <tr key={row.id} className={picked.has(row.id) ? "bg-brand-soft/50" : "hover:bg-paper"}>
                <td className="py-3 pl-4 text-right align-top text-xs tabular-nums text-muted">{firstNumber + i}</td>
                <td className="px-4 py-3 align-top">
                  <input
                    type="checkbox"
                    aria-label={`Select ${row.name}`}
                    checked={picked.has(row.id)}
                    onChange={() => toggle(row.id)}
                    className="size-4 accent-brand"
                  />
                </td>
                <td className="px-3 py-3 align-top">
                  <p className="font-medium">{row.name}</p>
                  <p className="flex items-center gap-2 text-xs text-muted">
                    {row.niche} · {row.market}
                    {row.rating ? (
                      <span className="inline-flex items-center gap-0.5">
                        <Star className="size-3 fill-sun text-sun" /> {row.rating} ({row.reviewCount ?? 0})
                      </span>
                    ) : null}
                  </p>
                </td>
                <td className="px-3 py-3 align-top">
                  <SiteCell row={row} />
                </td>
                <td className="px-3 py-3 align-top">
                  {row.email ? (
                    <a href={`mailto:${row.email}`} className="text-sm text-brand hover:underline">
                      {row.email}
                    </a>
                  ) : row.otherEmails.length ? (
                    <span className="text-xs text-muted" title={row.otherEmails.join("\n")}>
                      Only other-domain emails ({row.otherEmails.length})
                    </span>
                  ) : (
                    <span className="text-xs text-muted">{row.enrichStatus === "pending" || row.enrichStatus === "working" ? "Not checked yet" : "—"}</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-3 align-top text-xs text-muted">{row.phone ?? "—"}</td>
                <td className="px-3 py-3 align-top">
                  {row.leadId ? (
                    <Link href={`/admin/leads/${row.leadId}`} className="whitespace-nowrap text-xs font-medium text-brand hover:underline">
                      Open lead →
                    </Link>
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
