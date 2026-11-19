"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pause, Play } from "lucide-react";
import type { HarvestProgress } from "@/lib/harvest";

type Stats = Omit<HarvestProgress, "log" | "idle" | "error">;

function Bar({ label, value, total, tone = "bg-brand" }: { label: string; value: number; total: number; tone?: string }) {
  const pct = total ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-medium tabular-nums">
          {value.toLocaleString("en-US")} / {total.toLocaleString("en-US")}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-line/60">
        <div className={`h-full rounded-full ${tone} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl border border-line bg-card px-4 py-3">
      <p className={`font-display text-2xl font-semibold tabular-nums ${accent ?? ""}`}>{value.toLocaleString("en-US")}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

/** Runs the harvester in small steps while this tab stays open. */
export function HarvestRunner({
  initial,
  step,
}: {
  initial: Stats;
  step: (search?: boolean) => Promise<HarvestProgress>;
}) {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>(initial);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const stop = useRef(false);

  // Fresh numbers from the server (after queueing or a refresh) replace the local ones.
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setStats(initial);
  }

  const start = async () => {
    stop.current = false;
    setRunning(true);
    setError(null);
    let n = 0;
    let failures = 0;
    let search = true;
    while (!stop.current) {
      try {
        const result = await step(search);
        failures = 0;
        setStats(result);
        if (result.log.length) {
          const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          setLog((prev) => [...result.log.map((line) => `${time}  ${line}`), ...prev].slice(0, 40));
        }
        if (result.error) {
          setError(result.error);
          // Google searching is blocked, but the websites already found can still be checked.
          search = false;
          if (result.toCheck === 0) break;
          continue;
        }
        if (result.idle) {
          setLog((prev) => [search ? "Finished — nothing left in the queue." : "All found websites are checked. Google searches are paused (see the message above).", ...prev]);
          break;
        }
        if (++n % 4 === 0) router.refresh();
      } catch {
        // A network blip or a timed-out step: wait and try again, give up after a few in a row.
        if (++failures >= 4) {
          setError("Lost connection to the server several times in a row. Press Start to continue.");
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
    setRunning(false);
    router.refresh();
  };

  const queueLeft = stats.jobsTotal - stats.jobsDone - stats.jobsFailed;
  const nothingToDo = queueLeft === 0 && stats.toCheck === 0;

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">Harvester</h2>
          <p className="mt-0.5 text-sm text-muted">
            {running
              ? `Working${stats.current ? ` on ${stats.current}` : " through the websites"}… keep this tab open. You can pause any time and continue later.`
              : nothingToDo
                ? "Nothing waiting. Add niches and cities above, then press Start."
                : `${queueLeft} searches and ${stats.toCheck.toLocaleString("en-US")} website checks waiting. Press Start and leave this tab open.`}
          </p>
        </div>
        {running ? (
          <button type="button" className="btn-ghost" onClick={() => (stop.current = true)}>
            <Pause className="size-4" /> Pause
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={start} disabled={nothingToDo}>
            <Play className="size-4" /> {stats.jobsDone || stats.checked ? "Continue" : "Start"}
          </button>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Businesses found" value={stats.prospects} />
        <Stat label="With a website" value={stats.withWebsite} />
        <Stat label="Email found" value={stats.withEmail} accent="text-brand" />
        <Stat label="Weak website (redesign targets)" value={stats.weak} accent="text-danger" />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Bar label="Niche × city searches finished" value={stats.jobsDone + stats.jobsFailed} total={stats.jobsTotal} tone="bg-ink" />
        <Bar label="Websites opened & scored" value={stats.checked} total={stats.checked + stats.toCheck} />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Bar
          label="New leads looked up this month (limit)"
          value={stats.usage.lookups}
          total={stats.usage.lookupCap}
          tone={stats.usage.lookups / stats.usage.lookupCap > 0.9 ? "bg-danger" : "bg-emerald-500"}
        />
        <Bar
          label="Google searches this month (limit)"
          value={stats.usage.searches}
          total={stats.usage.searchCap}
          tone={stats.usage.searches / stats.usage.searchCap > 0.9 ? "bg-danger" : "bg-emerald-500"}
        />
      </div>

      {error ? <p className="mt-4 rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p> : null}

      {log.length ? (
        <div className="mt-4 max-h-44 overflow-y-auto rounded-xl bg-ink p-3 font-mono text-[11px] leading-relaxed text-paper/80">
          {running ? (
            <p className="flex items-center gap-2 text-paper">
              <Loader2 className="size-3 animate-spin" /> working…
            </p>
          ) : null}
          {log.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
