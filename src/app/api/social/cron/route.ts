import { publishDue } from "@/lib/social/publish";
import { studioStep } from "@/lib/social/studio";

// Vercel Cron calls this once a day (see vercel.json) and sends `Authorization: Bearer $CRON_SECRET`.
// Fluid compute allows up to 300 s on Hobby: enough to wait for Instagram to process a few videos.
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const lines = await publishDue(200_000);
  // Also move AI videos forward (finished clips get their text and are scheduled).
  const studio = await studioStep({ produceOne: false }).catch((e) => ({ log: [String(e)], pending: 0, queued: 0, startable: 0 }));
  return Response.json({ ok: true, published: lines, studio: studio.log });
}
