"use client";

import { useEffect, useRef, useState } from "react";
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

/**
 * One button. While this tab is open it keeps going: next city → every business type →
 * check websites → score → next city. Custom searches (if any) run first.
 */
export function LeRunner({ initial, step, autoStart = false }: { initial: Stats; step: () => Promise<EngineStatus>; autoStart?: boolean }) {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>(initial);
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setStats(initial);
  }
  const [running, setRunning] = useState(false);
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
      try {
        const r = await step();
        failures = 0;
        setStats(r);
        if (r.log.length) {
          const time = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
          setLog((prev) => [...r.log.map((l) => `${time}  ${l}`), ...prev].slice(0, 40));
        }
        if (r.idle) {
          setLog((prev) => ["All cities are done.", ...prev]);
          break;
        }
        if (++n % 3 === 0) router.refresh();
      } catch {
        if (++failures >= 4) {
          setError("Lost connection to the server a few times in a row. Press Start to continue.");
          break;
        }
        await new Promise((r) => setTimeout(r, 4000));
      }
    }
    setRunning(false);
    router.refresh();
  };

  // Arriving from a custom search (?run=1): start right away, once.
  const auto = useRef(false);
  useEffect(() => {
    if (!autoStart || auto.current) return;
    auto.current = true;
    router.replace("/admin/lead-engine", { scroll: false });
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  const a = stats.auto;
  const pct = a.cityTotal ? Math.round((a.citiesDone / a.cityTotal) * 100) : 0;

  return (
    <section className="card space-y-5 p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">{running ? "Running — keep this tab open" : stats.total ? "Paused" : "Ready"}</p>
          <p className="mt-1 truncate font-display text-2xl font-semibold">
            {running && a.current ? a.current : a.next ? `Next: ${a.next}` : a.current ?? "All cities done"}
          </p>
          <p className="mt-1 text-sm text-muted">
            City {Math.max(a.cityIndex, a.citiesDone)} of {a.cityTotal} · every business type in each city, high-value ones first · then the next city by itself
          </p>
        </div>
        {running ? (
          <button type="button" className="btn-ghost px-6 py-3 text-base" onClick={() => (stop.current = true)}>
            <Pause className="size-5" /> Pause
          </button>
        ) : (
          <button type="button" className="btn-primary px-8 py-3 text-base" onClick={start}>
            <Play className="size-5" /> Start
          </button>
        )}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-line/60">
        <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${Math.max(pct, running ? 2 : 0)}%` }} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Leads found" value={stats.total} />
        <Stat label="With email" value={stats.email} />
        <Stat label="🔥 Hot leads" value={stats.hot} accent="text-brand" />
        <Stat label="Websites left to check" value={stats.pending} />
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {log.length || running ? (
        <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl bg-paper p-3 text-xs">
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
