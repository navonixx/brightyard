"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pause, Play } from "lucide-react";
import type { EngineStatus } from "@/lib/leadengine/engine";

type Stats = Omit<EngineStatus, "idle" | "did" | "log">;

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl border border-line bg-card px-4 py-3">
      <p className={`font-display text-2xl font-semibold tabular-nums ${accent ?? ""}`}>{value.toLocaleString("en-US")}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

/** Runs the Lead Engine step by step while this tab is open (searches first, then website checks + scoring). */
export function LeRunner({ initial, step }: { initial: Stats; step: () => Promise<EngineStatus> }) {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>(initial);
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setStats(initial);
  }
  const [running, setRunning] = useState(false);
  const [now, setNow] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const stop = useRef(false);

  const start = async () => {
    stop.current = false;
    setRunning(true);
    setError(null);
    let failures = 0;
    let n = 0;
    while (!stop.current) {
      setNow(stats.queued ? "Running the next search…" : "Checking websites and scoring…");
      try {
        const r = await step();
        failures = 0;
        setStats(r);
        if (r.log.length) {
          const time = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          setLog((prev) => [...r.log.map((l) => `${time}  ${l}`), ...prev].slice(0, 50));
        }
        if (r.idle) {
          setLog((prev) => ["Finished — nothing left to search or check.", ...prev]);
          break;
        }
        if (++n % 3 === 0) router.refresh();
      } catch {
        if (++failures >= 4) {
          setError("Lost connection to the server several times in a row. Press Start to continue.");
          break;
        }
        await new Promise((r) => setTimeout(r, 4000));
      }
    }
    setRunning(false);
    setNow(null);
    router.refresh();
  };

  return (
    <section className="card space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Engine</h2>
          <p className="text-sm text-muted">
            {running ? now : stats.queued || stats.pending ? `${stats.queued} searches and ${stats.pending.toLocaleString("en-US")} leads waiting. Keep this tab open while it runs.` : "Nothing waiting. Queue searches on “Find leads”."}
          </p>
        </div>
        {running ? (
          <button type="button" className="btn-ghost" onClick={() => (stop.current = true)}>
            <Pause className="size-4" /> Pause
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={start}>
            <Play className="size-4" /> Start
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Leads" value={stats.total} />
        <Stat label="With email" value={stats.email} />
        <Stat label="Hot (pay + pain + email)" value={stats.hot} accent="text-brand" />
        <Stat label="Scored" value={stats.scored} />
        <Stat label="Waiting to check" value={stats.pending} />
        <Stat label="Searches waiting" value={stats.queued} />
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {log.length ? (
        <ul className="max-h-56 space-y-1 overflow-y-auto rounded-xl bg-paper p-3 font-mono text-xs">
          {running ? (
            <li className="flex items-center gap-2 text-muted">
              <Loader2 className="size-3 animate-spin" /> working…
            </li>
          ) : null}
          {log.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
