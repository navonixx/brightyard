import { autopilotStep } from "@/lib/social/autopilot";
import { refreshInsights } from "@/lib/social/insights";
import { publishDue } from "@/lib/social/publish";

// Vercel Cron calls this twice a day (see vercel.json) with `Authorization: Bearer $CRON_SECRET`.
// Fluid compute allows up to 300 s on Hobby.
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const started = Date.now();
  // 1) Publish what's due (time-critical), 2) read insights, 3) plan + make the next posts.
  const published = await publishDue(110_000);
  const insights = await refreshInsights(Date.now() + 25_000).catch((e) => [`insights: ${e}`]);
  const auto = await autopilotStep(Math.max(40_000, 270_000 - (Date.now() - started))).catch((e) => ({ log: [`autopilot: ${e}`] }));
  return Response.json({ ok: true, published, insights, autopilot: auto.log });
}
