import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { getSetting, month } from "@/lib/leadengine/db";
import { ActionButton, ActionForm, SubmitButton } from "@/components/admin/ui";
import { PageSkeleton } from "@/components/admin/skeleton";
import { LeHeader } from "@/components/admin/lead-engine/tabs";
import { leRescoreAll, leSaveSettings } from "../../../lead-engine-actions";

export default function LeSettingsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LeSettings />
    </Suspense>
  );
}

async function LeSettings() {
  await requireAdmin();
  const [cap, lookups, searches, app] = await Promise.all([
    getSetting("googleLookupCap", "0"),
    getSetting(`google:lookups:${month()}`, "0"),
    getSetting(`google:searches:${month()}`, "0"),
    getSettings(),
  ]);
  const keys = [
    { k: "Google key (Places + YouTube)", ok: Boolean(process.env.GOOGLE_PLACES_API_KEY), hint: "For YouTube, also enable “YouTube Data API v3” on the same Google Cloud project (free)." },
    { k: "SEC contact", ok: Boolean(process.env.SEC_USER_AGENT?.trim()), hint: "SEC_USER_AGENT, e.g. “Alderwell Creative you@example.com” — add it in .env.local and in Vercel → Environment Variables." },
    { k: "Sender name & business address (for email drafts)", ok: Boolean(app.senderName && app.businessAddress), hint: "Taken from the main Settings page." },
  ];

  return (
    <div className="space-y-6">
      <LeHeader active="/admin/lead-engine/settings" title="Settings" intro="Budget and keys for the Lead Engine. Your name and address for emails come from the main Settings page." />

      <section className="card space-y-4 p-6">
        <h2 className="font-semibold">Google Places budget</h2>
        <p className="text-sm text-muted">
          Google charges after its free monthly calls (roughly $15–20 per 1,000 businesses with website + phone). Off by default — Overture Maps and OpenStreetMap are free.
          Lead Engine this month: {Number(lookups).toLocaleString("en-US")} paid lookups, {Number(searches).toLocaleString("en-US")} searches. (The Lead Database module counts its own usage separately; both use the same Google account.)
        </p>
        <ActionForm action={leSaveSettings} className="max-w-xs space-y-3">
          <div>
            <label className="label" htmlFor="googleLookupCap">Monthly paid-lookup limit</label>
            <select id="googleLookupCap" name="googleLookupCap" defaultValue={cap} className="input">
              {["0", "250", "500", "1000", "2000", "5000"].map((v) => <option key={v} value={v}>{v === "0" ? "Off" : `${Number(v).toLocaleString("en-US")} a month`}</option>)}
            </select>
          </div>
          <SubmitButton>Save</SubmitButton>
        </ActionForm>
      </section>

      <section className="card space-y-3 p-6">
        <h2 className="font-semibold">Keys & details</h2>
        {keys.map((e) => (
          <div key={e.k} className="text-sm">
            <p>{e.ok ? "✅" : "⚪"} {e.k}</p>
            <p className="text-xs text-muted">{e.hint}</p>
          </div>
        ))}
        <Link href="/admin/settings" className="text-sm text-brand hover:underline">Open main Settings →</Link>
      </section>

      <section className="card space-y-3 p-6">
        <h2 className="font-semibold">Re-score every lead</h2>
        <p className="text-sm text-muted">Checks every website again and recalculates “can pay” and “pain”.</p>
        <ActionButton action={leRescoreAll} className="btn-ghost" pendingText="Queuing…">Re-score all</ActionButton>
      </section>
    </div>
  );
}
