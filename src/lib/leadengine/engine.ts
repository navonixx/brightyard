import "server-only";
import { log, one, q } from "./db";
import { enrichBatch } from "./enrich";
import { saveLeads } from "./leads";
import { RUNNERS, type SourceKey } from "./sources";
import { autoProgress, queueNextAuto } from "./autopilot";

/**
 * One small unit of work, called again and again by the runner on the Lead Engine page
 * (the app runs on Vercel, where nothing can loop in the background).
 * Each step runs one queued source search, or checks/scores a batch of new leads.
 */
const TRANSIENT = /fetch failed|timeout|timed out|aborted|busy|429|ECONN|ENOTFOUND|socket|network|5\d\d\)/i;

export type EngineStatus = {
  queued: number;
  failed: number;
  done: number;
  pending: number;
  scored: number;
  total: number;
  email: number;
  hot: number;
  idle: boolean;
  did: string | null;
  auto: Awaited<ReturnType<typeof autoProgress>>;
  log: string[];
};

export async function engineStatus(): Promise<Omit<EngineStatus, "idle" | "did" | "log">> {
  const auto = await autoProgress();
  const j = await q<{ status: string; n: number }>("SELECT status, count(*)::int n FROM le_jobs GROUP BY status");
  const c = Object.fromEntries(j.map((x) => [x.status, Number(x.n)])) as Record<string, number>;
  const l = await one<{ total: number; pending: number; scored: number; email: number; hot: number }>(
    `SELECT count(*)::int total,
       count(*) FILTER (WHERE enrich_status IN ('pending','working'))::int pending,
       count(*) FILTER (WHERE enrich_status IN ('done','no_site','failed'))::int scored,
       count(email)::int email,
       count(*) FILTER (WHERE pay_score >= 30 AND pain_score >= 30 AND email IS NOT NULL AND status = 'new')::int hot
     FROM le_leads`,
  );
  return {
    queued: (c.queued ?? 0) + (c.running ?? 0),
    failed: c.failed ?? 0,
    done: c.done ?? 0,
    total: Number(l?.total ?? 0),
    pending: Number(l?.pending ?? 0),
    scored: Number(l?.scored ?? 0),
    email: Number(l?.email ?? 0),
    hot: Number(l?.hot ?? 0),
    auto,
  };
}

export async function engineStep(budgetMs = 30_000): Promise<EngineStatus> {
  const started = Date.now();
  const lines: string[] = [];
  let did: string | null = null;

  // A search that was cut off (server time limit) goes back in the queue.
  await q("UPDATE le_jobs SET status = 'queued' WHERE status = 'running' AND started_at < now() - interval '3 minutes' AND attempts < 3");
  await q("UPDATE le_jobs SET status = 'failed', error = 'Took too long three times' WHERE status = 'running' AND started_at < now() - interval '3 minutes'");

  // Autopilot: nothing queued and the website checks have caught up → queue the next city / business group.
  let autoDone = false;
  const waiting = await one<{ queued: number; pending: number }>(
    "SELECT (SELECT count(*)::int FROM le_jobs WHERE status = 'queued') queued, (SELECT count(*)::int FROM le_leads WHERE enrich_status = 'pending') pending",
  );
  if (!Number(waiting?.queued) && Number(waiting?.pending ?? 0) < 150) autoDone = !(await queueNextAuto());

  const job = await one<{ id: number; source: SourceKey; label: string; params: Record<string, unknown>; attempts: number }>(
    `UPDATE le_jobs SET status = 'running', attempts = attempts + 1, started_at = now()
     WHERE id = (SELECT id FROM le_jobs WHERE status = 'queued' ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED)
     RETURNING id, source, label, params, attempts`,
  );
  if (job) {
    did = job.label;
    try {
      const runner = RUNNERS[job.source];
      if (!runner) throw new Error(`Unknown source ${job.source}`);
      const params = typeof job.params === "string" ? JSON.parse(job.params) : job.params;
      const { leads, note } = await runner(params);
      const { added, merged } = await saveLeads(leads);
      await q("UPDATE le_jobs SET status = 'done', found = $2, added = $3, merged = $4, error = NULL, finished_at = now() WHERE id = $1", [job.id, leads.length, added, merged]);
      lines.push(`✓ ${job.label} — ${note}. +${added} new, ${merged} merged`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const retry = TRANSIENT.test(msg) && job.attempts < 3;
      await q("UPDATE le_jobs SET status = $2, error = $3, finished_at = now() WHERE id = $1", [job.id, retry ? "queued" : "failed", msg.slice(0, 400)]);
      lines.push(`${retry ? "↻ Will retry" : "✗ Failed"}: ${job.label} — ${msg}`);
    }
  }

  // Use the rest of the time to check websites and score.
  let checked = 0;
  // Start a new batch only while there is time for it to finish inside the 60 s server limit.
  while (Date.now() - started < budgetMs) {
    try {
      const n = await enrichBatch(36, 36);
      checked += n;
      if (!n) break;
    } catch (e) {
      lines.push(e instanceof Error ? e.message : String(e));
      break;
    }
  }
  if (checked) lines.push(`Checked and scored ${checked} leads`);
  for (const line of lines) await log(line);

  const status = await engineStatus();
  return { ...status, idle: autoDone && !job && !checked && status.queued === 0, did, log: lines };
}
