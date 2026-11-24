import { timingSafeEqual } from "node:crypto";
import { studioStep, webhookToken } from "@/lib/social/studio";

/**
 * ModelsLab calls this when a clip is finished. We don't trust the payload: it only wakes the
 * pipeline, which asks ModelsLab for the real status itself.
 */
export const maxDuration = 60;

export async function POST(request: Request) {
  const t = new URL(request.url).searchParams.get("t") ?? "";
  const expected = webhookToken();
  if (!process.env.CRON_SECRET || t.length !== expected.length || !timingSafeEqual(Buffer.from(t), Buffer.from(expected))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const r = await studioStep({ produceOne: false });
  return Response.json({ ok: true, log: r.log });
}
