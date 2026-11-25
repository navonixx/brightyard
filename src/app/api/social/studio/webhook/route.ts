import { timingSafeEqual } from "node:crypto";
import { studioStep, webhookToken } from "@/lib/social/studio";

/**
 * ModelsLab calls this when a clip is finished. We don't trust the payload: it only wakes the
 * pipeline, which asks ModelsLab for the real status itself (and may join a finished reel).
 */
export const maxDuration = 300;

export async function POST(request: Request) {
  const t = new URL(request.url).searchParams.get("t") ?? "";
  const expected = webhookToken();
  if (!process.env.CRON_SECRET || t.length !== expected.length || !timingSafeEqual(Buffer.from(t), Buffer.from(expected))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const r = await studioStep({ budgetMs: 240_000 });
  return Response.json({ ok: true, log: r.log });
}
