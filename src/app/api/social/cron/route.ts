import { publishDue } from "@/lib/social/publish";

// Vercel Cron calls this once a day (see vercel.json) and sends `Authorization: Bearer $CRON_SECRET`.
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const lines = await publishDue();
  return Response.json({ ok: true, published: lines });
}
