"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Pause, Send } from "lucide-react";
import type { SendResult } from "@/app/admin/lead-engine-actions";

export type Draft = { id: number; name: string; email: string; sub: string; subject: string; body: string; note?: string };
type RowState = { status: "waiting" | "sending" | "sent" | "error" | "skipped"; message?: string };

const GAPS = [
  { v: "60-120", l: "1–2 minutes apart (recommended)" },
  { v: "120-240", l: "2–4 minutes apart (safest)" },
  { v: "30-60", l: "30–60 seconds apart (faster, riskier)" },
];

/**
 * Review a batch of emails on one screen, then send them from the studio Gmail one by one with
 * a random gap in between (a burst of identical-looking emails is what spam filters look for).
 */
export function LeBulkSender({
  drafts,
  kind,
  send,
  sendFollowUp,
  today,
  cap,
}: {
  drafts: Draft[];
  kind: "first" | "followup";
  send?: (id: number, subject: string, body: string) => Promise<SendResult>;
  sendFollowUp?: (id: number) => Promise<SendResult>;
  today: number;
  cap: number;
}) {
  const router = useRouter();
  const [items, setItems] = useState(drafts);
  const [picked, setPicked] = useState<Set<number>>(new Set(drafts.map((d) => d.id)));
  const [rows, setRows] = useState<Record<number, RowState>>({});
  const [running, setRunning] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [gap, setGap] = useState("60-120");
  const [sentToday, setSentToday] = useState(today);
  const [banner, setBanner] = useState<string | null>(null);
  const stop = useRef(false);

  const edit = (id: number, patch: Partial<Draft>) => setItems((list) => list.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const queue = items.filter((d) => picked.has(d.id) && rows[d.id]?.status !== "sent");
  const left = Math.max(0, cap - sentToday);

  const run = async () => {
    stop.current = false;
    setRunning(true);
    setBanner(null);
    const [lo, hi] = gap.split("-").map(Number);
    const list = queue.slice(0, left);
    for (let i = 0; i < list.length && !stop.current; i++) {
      const d = list[i];
      setRows((r) => ({ ...r, [d.id]: { status: "sending" } }));
      let res: SendResult;
      try {
        res = kind === "first" ? await send!(d.id, d.subject, d.body) : await sendFollowUp!(d.id);
      } catch {
        res = { ok: false, message: "Lost connection — try again", sentToday };
      }
      setSentToday(res.sentToday);
      setRows((r) => ({ ...r, [d.id]: { status: res.ok ? "sent" : /skipped/i.test(res.message) ? "skipped" : "error", message: res.message } }));
      if (res.stop) {
        setBanner(res.message);
        break;
      }
      if (i < list.length - 1 && !stop.current) {
        // Random gap, shown as a countdown; Pause stops it.
        let wait = Math.round(lo + Math.random() * (hi - lo));
        while (wait > 0 && !stop.current) {
          setCountdown(wait);
          await new Promise((r) => setTimeout(r, 1000));
          wait--;
        }
        setCountdown(null);
      }
    }
    setRunning(false);
    setCountdown(null);
    router.refresh();
  };

  if (!items.length) return <p className="py-6 text-center text-sm text-muted">{kind === "first" ? "No hot leads waiting — press Start on the Lead Engine page to find more." : "No follow-ups due right now."}</p>;
  const sent = Object.values(rows).filter((r) => r.status === "sent").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-paper p-3">
        <span className="text-sm">
          Sent today: <strong>{sentToday}</strong> / {cap}
        </span>
        <select value={gap} onChange={(e) => setGap(e.target.value)} disabled={running} className="input w-auto py-1.5 text-sm" aria-label="Gap between emails">
          {GAPS.map((g) => <option key={g.v} value={g.v}>{g.l}</option>)}
        </select>
        {running ? (
          <button type="button" className="btn-ghost" onClick={() => (stop.current = true)}>
            <Pause className="size-4" /> Pause
          </button>
        ) : (
          <button type="button" className="btn-primary" disabled={!queue.length || !left} onClick={run}>
            <Send className="size-4" /> Send {Math.min(queue.length, left)} {kind === "first" ? "emails" : "follow-ups"}
          </button>
        )}
        {running ? (
          <span className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" /> {countdown ? `next email in ${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, "0")}` : "sending…"} · keep this tab open
          </span>
        ) : sent ? (
          <span className="text-sm text-emerald-700">✓ {sent} sent — see them in Gmail → Sent and in the Email Tracker</span>
        ) : null}
      </div>
      {banner ? <p className="rounded-xl bg-red-50 p-3 text-sm text-danger">{banner}</p> : null}
      {!left ? <p className="text-sm text-danger">Today&apos;s limit is used up — send the rest tomorrow.</p> : null}

      <ul className="space-y-2">
        {items.map((d) => {
          const st = rows[d.id];
          return (
            <li key={d.id} className={`rounded-xl border p-3 ${st?.status === "sent" ? "border-emerald-200 bg-emerald-50/50" : st?.status === "error" ? "border-red-200" : "border-line"}`}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  aria-label={`Include ${d.name}`}
                  checked={picked.has(d.id)}
                  disabled={running || st?.status === "sent"}
                  onChange={(e) =>
                    setPicked((p) => {
                      const n = new Set(p);
                      if (e.target.checked) n.add(d.id);
                      else n.delete(d.id);
                      return n;
                    })
                  }
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                      <Link href={`/admin/lead-engine/leads/${d.id}`} target="_blank" className="hover:text-brand">{d.name}</Link>{" "}
                      <span className="text-xs font-normal text-muted">· {d.email} · {d.sub}</span>
                    </p>
                    <span className="text-xs">
                      {st?.status === "sending" ? "sending…" : st?.status === "sent" ? "✓ sent" : st?.status === "error" ? <span className="text-danger">✗ {st.message}</span> : st?.status === "skipped" ? <span className="text-muted">{st.message}</span> : null}
                    </span>
                  </div>
                  {d.note ? <p className="text-xs text-muted">{d.note}</p> : null}
                  {kind === "first" ? (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-sm text-ink/80">
                        <span className="font-medium">{d.subject}</span> — {d.body.split("\n").find((l) => l.length > 30)?.slice(0, 110)}…
                      </summary>
                      <div className="mt-2 space-y-2">
                        <input value={d.subject} onChange={(e) => edit(d.id, { subject: e.target.value })} disabled={running} className="input py-1.5 text-sm" aria-label="Subject" />
                        <textarea value={d.body} onChange={(e) => edit(d.id, { body: e.target.value })} disabled={running} rows={10} className="input font-mono text-[13px]" aria-label="Email" />
                      </div>
                    </details>
                  ) : (
                    <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-ink/80">{d.body}</p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
