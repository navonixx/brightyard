import { Suspense } from "react";
import { Building2, Landmark, MonitorPlay } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { CITIES, STATES } from "@/lib/leadengine/cities";
import { getSetting } from "@/lib/leadengine/db";
import { NICHES } from "@/lib/leadengine/niches";
import { SOURCES } from "@/lib/leadengine/sources/meta";
import { ActionForm, SubmitButton } from "@/components/admin/ui";
import { PageSkeleton } from "@/components/admin/skeleton";
import { LeHeader } from "@/components/admin/lead-engine/tabs";
import { LeChipPicker } from "@/components/admin/lead-engine/chip-picker";
import { leQueueLocal, leQueueSec, leQueueYouTube } from "../../../lead-engine-actions";

export default function FindPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Find />
    </Suspense>
  );
}

async function Find() {
  await requireAdmin();
  const googleOn = Number(await getSetting("googleLookupCap", "0")) > 0;
  const niches = NICHES.map((n) => ({ value: n.key, label: `${n.ticket === "high" ? "★ " : ""}${n.label}`, group: n.group }));
  const cities = CITIES.map(([city, state]) => ({ value: `${city}|${state}`, label: city, group: state }));
  const secOn = Boolean(process.env.SEC_USER_AGENT?.trim());

  return (
    <div className="space-y-6">
      <LeHeader active="/admin/lead-engine/find" title="Find leads" intro="Queue searches on any source, then press Start on the dashboard. The same business found on two sources becomes one lead." />

      <section className="card p-6">
        <div className="mb-5 flex items-start gap-3">
          <Building2 className="mt-0.5 size-5 text-brand" />
          <div>
            <h2 className="text-lg font-semibold">Local businesses</h2>
            <p className="text-sm text-muted">{SOURCES.overture.about} One search per city covers every type you pick (about 20–50 seconds each).</p>
          </div>
        </div>
        <ActionForm action={leQueueLocal} className="space-y-6">
          <div>
            <p className="label">Sources</p>
            <div className="flex flex-wrap gap-2">
              {[
                { v: "overture", l: "Overture Maps — free, biggest", on: true, disabled: false },
                { v: "osm", l: "OpenStreetMap — free", on: true, disabled: false },
                { v: "google", l: googleOn ? "Google Places — paid after free tier" : "Google Places (off — set a limit in Settings)", on: false, disabled: !googleOn },
              ].map((s) => (
                <label key={s.v} className="cursor-pointer">
                  <input type="checkbox" name="source" value={s.v} defaultChecked={s.on} disabled={s.disabled} className="peer sr-only" />
                  <span className="inline-flex rounded-full border border-line px-3.5 py-1.5 text-[13px] text-muted peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand-strong peer-disabled:opacity-50">
                    {s.l}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="label">Business types (★ = high-value customers, easiest to pay)</p>
            <LeChipPicker name="niche" items={niches} placeholder="Find a business type…" initial={NICHES.filter((n) => n.ticket === "high").map((n) => n.key)} />
          </div>
          <div>
            <p className="label">Cities</p>
            <LeChipPicker name="city" items={cities} placeholder="Find a city or state…" />
          </div>
          <SubmitButton pendingText="Queuing…">Queue searches</SubmitButton>
        </ActionForm>
      </section>

      <section className="card p-6">
        <div className="mb-5 flex items-start gap-3">
          <MonitorPlay className="mt-0.5 size-5 text-red-500" />
          <div>
            <h2 className="text-lg font-semibold">YouTube channels</h2>
            <p className="text-sm text-muted">{SOURCES.youtube.about} Uses the same Google key — “YouTube Data API v3” must be enabled (free) in Google Cloud.</p>
          </div>
        </div>
        <ActionForm action={leQueueYouTube} className="space-y-4">
          <div>
            <label className="label" htmlFor="topics">Topics — one per line</label>
            <textarea id="topics" name="topics" rows={5} className="input" defaultValue={"real estate agent\nfitness coach\nhome remodeling\nskincare brand\nsmall business tips"} />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="label" htmlFor="pages">Results per topic</label>
              <select id="pages" name="pages" className="input" defaultValue="2">
                <option value="1">50 channels (100 units)</option>
                <option value="2">100 channels (200 units)</option>
                <option value="4">200 channels (400 units)</option>
              </select>
            </div>
            <SubmitButton pendingText="Queuing…">Queue YouTube searches</SubmitButton>
          </div>
        </ActionForm>
      </section>

      <section className="card p-6">
        <div className="mb-5 flex items-start gap-3">
          <Landmark className="mt-0.5 size-5 text-purple-500" />
          <div>
            <h2 className="text-lg font-semibold">Funded companies (SEC Form D)</h2>
            <p className="text-sm text-muted">
              {SOURCES.sec.about} {secOn ? "" : "Needs SEC_USER_AGENT (your company name + email) in the environment — SEC requires tools to identify themselves."}
            </p>
          </div>
        </div>
        <ActionForm action={leQueueSec} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="days">Filed in the last</label>
              <select id="days" name="days" className="input" defaultValue="7">
                {[3, 7, 14, 30].map((d) => <option key={d} value={d}>{d} days</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="minAmount">Raised at least</label>
              <select id="minAmount" name="minAmount" className="input" defaultValue="100000">
                {[25000, 100000, 250000, 1000000].map((a) => <option key={a} value={a}>${a.toLocaleString("en-US")}</option>)}
              </select>
            </div>
          </div>
          <div>
            <p className="label">States (none = all)</p>
            <LeChipPicker name="state" items={STATES.map((s) => ({ value: s, label: s, group: "States" }))} placeholder="Find a state…" />
          </div>
          <SubmitButton pendingText="Queuing…">Queue SEC search</SubmitButton>
        </ActionForm>
      </section>
    </div>
  );
}
