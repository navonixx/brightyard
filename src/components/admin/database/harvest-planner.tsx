"use client";

import { useEffect, useState } from "react";
import { Check, Plus } from "lucide-react";
import { SubmitButton } from "@/components/admin/ui";
import { ComboField } from "@/components/admin/combo-field";

type Option = { value: string; label: string; badge?: string };

function Chip({ name, option, checked, onToggle }: { name: string; option: Option; checked: boolean; onToggle: () => void }) {
  return (
    <label
      className={`inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
        checked ? "border-brand bg-brand text-white shadow-sm" : "border-line bg-card text-ink hover:border-brand/60"
      }`}
    >
      <input type="checkbox" name={name} value={option.value} checked={checked} onChange={onToggle} className="sr-only" />
      {checked ? <Check className="size-3.5" strokeWidth={3} /> : null}
      {option.label}
      {option.badge && !checked ? <span className="text-[10px] font-semibold uppercase tracking-wide text-brand">{option.badge}</span> : null}
    </label>
  );
}

function ChipGroup({
  step,
  title,
  name,
  options: initial,
  defaults,
  addPlaceholder,
  addPattern,
  addHint,
  normalize,
  onCount,
}: {
  step: number;
  title: string;
  name: string;
  options: Option[];
  defaults: string[];
  addPlaceholder: string;
  addPattern?: RegExp;
  addHint: string;
  normalize: (raw: string) => string;
  onCount: (n: number) => void;
}) {
  const [options, setOptions] = useState(initial);
  const [picked, setPicked] = useState<Set<string>>(new Set(defaults));
  const [draft, setDraft] = useState("");
  const [bad, setBad] = useState(false);
  useEffect(() => onCount(picked.size), [picked, onCount]);

  const toggle = (value: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });

  const add = () => {
    const value = normalize(draft);
    if (!value || (addPattern && !addPattern.test(value))) {
      setBad(true);
      return;
    }
    if (!options.some((o) => o.value === value)) setOptions((prev) => [...prev, { value, label: value }]);
    setPicked((prev) => new Set(prev).add(value));
    setDraft("");
    setBad(false);
  };

  return (
    <div className="rounded-2xl border border-line bg-paper/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">
          <span className="mr-2 inline-grid size-6 place-items-center rounded-full bg-ink text-xs text-paper">{step}</span>
          {title} <span className="ml-1 text-sm font-normal text-muted">· {picked.size} selected</span>
        </h3>
        <div className="flex gap-3 text-xs font-medium">
          <button type="button" className="text-brand hover:underline" onClick={() => setPicked(new Set(options.map((o) => o.value)))}>
            Select all
          </button>
          <button type="button" className="text-muted hover:text-ink" onClick={() => setPicked(new Set())}>
            Clear
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => (
          <Chip key={o.value} name={name} option={o} checked={picked.has(o.value)} onToggle={() => toggle(o.value)} />
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setBad(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={addPlaceholder}
          className={`input max-w-xs ${bad ? "border-danger" : ""}`}
          aria-label={addPlaceholder}
        />
        <button type="button" onClick={add} className="btn-ghost shrink-0">
          <Plus className="size-4" /> Add
        </button>
      </div>
      <p className={`mt-1.5 text-xs ${bad ? "text-danger" : "text-muted"}`}>{addHint}</p>
    </div>
  );
}

export function HarvestPlanner({
  niches,
  markets,
  defaultMarkets,
  cap,
}: {
  niches: Option[];
  markets: Option[];
  defaultMarkets: string[];
  cap: number;
}) {
  const [target, setTarget] = useState(100);
  const [nicheCount, setNicheCount] = useState(niches.length);
  const [marketCount, setMarketCount] = useState(defaultMarkets.length);
  const searches = nicheCount * marketCount;
  const requests = searches * Math.min(9, Math.ceil((target / 20) * 1.4));

  return (
    <div className="space-y-4">
      <ChipGroup
        step={1}
        title="Niches"
        name="niche"
        options={niches}
        defaults={niches.map((n) => n.value)}
        addPlaceholder="Add a niche, e.g. window cleaning"
        addHint="Type any business type in plain words — it becomes its own Google search."
        onCount={setNicheCount}
        normalize={(raw) => raw.trim().toLowerCase().replace(/\s+/g, " ")}
      />
      <ChipGroup
        step={2}
        title="Cities"
        name="market"
        options={markets}
        defaults={defaultMarkets}
        addPlaceholder="City, ST — e.g. Tucson, AZ"
        addPattern={/^[^,]{2,40},\s*[A-Za-z]{2}$/}
        addHint="Write it as City, two-letter state. Each niche is searched in every city you pick, one niche at a time."
        onCount={setMarketCount}
        normalize={(raw) => {
          const [city = "", st = ""] = raw.split(",").map((s) => s.trim());
          return st ? `${city.replace(/\b\w/g, (c) => c.toUpperCase())}, ${st.toUpperCase()}` : raw.trim();
        }}
      />

      <div className="grid gap-4 rounded-2xl border border-line bg-paper/60 p-4 sm:grid-cols-2 sm:p-5">
        <div>
          <h3 className="font-semibold">
            <span className="mr-2 inline-grid size-6 place-items-center rounded-full bg-ink text-xs text-paper">3</span>
            Businesses per city, per niche
          </h3>
          <div className="mt-3 inline-flex rounded-xl border border-line bg-card p-1">
            {[50, 100, 150, 200].map((n) => (
              <label
                key={n}
                className={`cursor-pointer rounded-lg px-4 py-1.5 text-sm font-medium transition ${target === n ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
              >
                <input type="radio" name="target" value={n} checked={target === n} onChange={() => setTarget(n)} className="sr-only" />
                {n}
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted">Google lists up to ~180 per niche per city; small towns may have fewer.</p>
        </div>
        <ComboField
          name="cap"
          label="Monthly Google search limit"
          defaultValue={String(cap)}
          inputType="number"
          options={[
            { value: "900", label: "900 — stays inside Google's free monthly amount" },
            { value: "2000", label: "2,000 — about $40 extra per month" },
            { value: "5000", label: "5,000 — about $150 extra per month" },
          ]}
          hint="The harvester pauses itself at this number of searches each month, so there are no surprise bills."
        />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-ink p-4 text-paper sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="text-lg font-semibold">
            ≈ {(searches * target).toLocaleString()} businesses
            <span className="ml-2 text-sm font-normal opacity-70">
              {nicheCount} niche{nicheCount === 1 ? "" : "s"} × {marketCount} cit{marketCount === 1 ? "y" : "ies"} × {target}
            </span>
          </p>
          <p className="text-sm opacity-70">
            About {requests.toLocaleString()} Google searches. Every website is then opened to score it and look for an email — that part is free.
          </p>
        </div>
        <SubmitButton pendingText="Queuing…" className="btn-primary shrink-0">
          Add to queue
        </SubmitButton>
      </div>
    </div>
  );
}
