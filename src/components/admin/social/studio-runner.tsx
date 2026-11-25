"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { StepResult } from "@/lib/social/studio";

/**
 * Keeps the Studio moving while this tab is open: starts queued pieces one by one and checks
 * running videos every ~10 s. (A webhook and the daily cron also move things along.)
 */
export function StudioRunner({ pending, queued, step }: { pending: number; queued: number; step: () => Promise<StepResult> }) {
  const router = useRouter();
  const [busy, setBusy] = useState(pending + queued > 0);
  const [counts, setCounts] = useState({ pending, queued });
  const [log, setLog] = useState<string[]>([]);
  const running = useRef(false);

  if (!busy && pending + queued > 0) setBusy(true);

  useEffect(() => {
    if (!busy || running.current) return;
    running.current = true;
    let cancelled = false;
    (async () => {
      let failures = 0;
      while (!cancelled) {
        try {
          const r = await step();
          failures = 0;
          setCounts({ pending: r.pending, queued: r.queued });
          if (r.log.length) {
            const t = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
            setLog((prev) => [...r.log.map((l) => `${t}  ${l}`), ...prev].slice(0, 30));
            router.refresh();
          }
          if (!r.pending && !r.queued) break;
          // Something new is waiting to start → go again quickly; otherwise wait for ModelsLab.
          await new Promise((res) => setTimeout(res, r.startable ? 1500 : 15_000));
        } catch {
          if (++failures >= 5) break;
          await new Promise((res) => setTimeout(res, 8000));
        }
      }
      running.current = false;
      if (!cancelled) {
        setBusy(false);
        router.refresh();
      }
    })();
    return () => {
      cancelled = true;
      running.current = false;
    };
  }, [busy, step, router]);

  if (!busy && !log.length) return null;
  return (
    <div className="card space-y-2 p-4 text-sm">
      <p className="flex items-center gap-2 font-medium">
        {busy ? <Loader2 className="size-4 animate-spin text-brand" /> : "✅"}
        {busy ? `Making posts — ${counts.queued} waiting, ${counts.pending} being made (a reel takes about 3–8 minutes). You can close this tab: it also carries on by itself.` : "All done for now."}
      </p>
      {log.length ? (
        <div className="max-h-40 overflow-y-auto rounded-lg bg-paper p-2 font-mono text-[11px] leading-5 text-muted">
          {log.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
