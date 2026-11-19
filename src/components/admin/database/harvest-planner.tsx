"use client";

import { useEffect, useState } from "react";
import { Check, Plus } from "lucide-react";
import { SubmitButton } from "@/components/admin/ui";
import { ComboField } from "@/components/admin/combo-field";

type Option = { value: string; label: string; badge?: string; group?: string };

function Chip({
  name,
  option,
  checked,
  onToggle,
  hidden,
}: {
  name: string;
  option: Option;
  checked: boolean;
  onToggle: () => void;
  hidden?: boolean;
}) {
  return (
    <label
      // Filtered-out chips stay in the form (just hidden) so their ticks are still submitted.
      hidden={hidden}
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
  const [find, setFind] = useState("");
  useEffect(() => onCount(picked.size), [picked, onCount]);

  const groups = new Map<string, Option[]>();
  for (const o of options) {
    const g = o.group ?? "Added by you";
    groups.set(g, [...(groups.get(g) ?? []), o]);
  }
  const matches = (o: Option) => !find || o.label.toLowerCase().includes(find.toLowerCase());
  const setMany = (values: string[], on: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev);
      for (const v of values) {
        if (on) next.add(v);
        else next.delete(v);
      }
      return next;
    });

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
      {options.length > 30 && picked.size > 0 && picked.size < options.length ? (
        <p className="mt-2 text-xs text-muted">
          <span className="font-medium text-ink">Selected:</span>{" "}
          {options
            .filter((o) => picked.has(o.value))
            .slice(0, 14)
            .map((o) => o.value)
            .join(" · ")}
          {picked.size > 14 ? ` +${picked.size - 14} more` : ""}
        </p>
      ) : null}
      {options.length > 30 ? (
        <input
          value={find}
          onChange={(e) => setFind(e.target.value)}
          placeholder={`Find in ${options.length} ${title.toLowerCase()}…`}
          className="input mt-3 max-w-xs py-1.5 text-sm"
          aria-label={`Find ${title.toLowerCase()}`}
        />
      ) : null}
      <div className="mt-3 max-h-[24rem] space-y-3 overflow-y-auto pr-1">
        {[...groups.entries()].map(([group, items]) => {
          const visible = items.filter(matches);
          const on = items.filter((o) => picked.has(o.value)).length;
          const all = on === items.length;
          return (
            <div key={group} hidden={visible.length === 0}>
              {groups.size > 1 ? (
                <div className="mb-1.5 flex items-center gap-2 text-xs">
                  <span className="font-semibold uppercase tracking-wide text-muted">{group}</span>
                  <span className="text-muted">
                    {on}/{items.length}
                  </span>
                  <button
                    type="button"
                    className="font-medium text-brand hover:underline"
                    onClick={() => setMany(items.map((o) => o.value), !all)}
                  >
                    {all ? "none" : "all"}
                  </button>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {items.map((o) => (
                  <Chip key={o.value} name={name} option={o} hidden={!matches(o)} checked={picked.has(o.value)} onToggle={() => toggle(o.value)} />
                ))}
              </div>
            </div>
          );
        })}
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
  lookupCap,
  searchCap,
}: {
  niches: Option[];
  markets: Option[];
  defaultMarkets: string[];
  lookupCap: number;
  searchCap: number;
}) {
  const [order, setOrder] = useState("niche");
  const [nicheCount, setNicheCount] = useState(niches.length);
  const [marketCount, setMarketCount] = useState(defaultMarkets.length);
  const searches = nicheCount * marketCount;
  // A mid-size city usually has 100–300 businesses per niche once the suburbs are searched too.
  const low = searches * 100;
  const high = searches * 300;
  const months = (n: number) => Math.max(1, Math.round(n / Math.max(lookupCap, 1)));

  return (
    <div className="space-y-4">
      <ChipGroup
        step={1}
        title="Niches"
        name="niche"
        options={niches}
        defaults={niches.map((n) => n.value)}
        addPlaceholder="Add a niche, e.g. awning installer"
        addHint="Type any business type in plain words — it becomes its own Google search."
        onCount={setNicheCount}
        normalize={(raw) => raw.trim().toLowerCase().replace(/s+/g, " ")}
      />
      <ChipGroup
        step={2}
        title="Cities"
        name="market"
        options={markets}
        defaults={defaultMarkets}
        addPlaceholder="City, ST — e.g. Ocala, FL"
        addPattern={/^[^,]{2,40},s*[A-Za-z]{2}$/}
        addHint="Write it as City, two-letter state. Each niche is searched in the city and its suburbs, one niche at a time."
        onCount={setMarketCount}
        normalize={(raw) => {
          const [city = "", st = ""] = raw.split(",").map((s) => s.trim());
          return st ? `${city.replace(/w/g, (c) => c.toUpperCase())}, ${st.toUpperCase()}` : raw.trim();
        }}
      />

      <div className="rounded-2xl border border-line bg-paper/60 p-4 sm:p-5">
        <h3 className="font-semibold">
          <span className="mr-2 inline-grid size-6 place-items-center rounded-full bg-ink text-xs text-paper">3</span>
          Monthly limits <span className="text-sm font-normal text-muted">· no fixed number per city — it takes everything Google has, until these limits</span>
        </h3>
        <div className="mt-3">
          <p className="label">Order</p>
          <div className="inline-flex flex-wrap rounded-xl border border-line bg-card p-1">
            {[
              { value: "niche", label: "Niche by niche — every city for niche 1, then niche 2" },
              { value: "city", label: "City by city — every niche in city 1, then city 2" },
            ].map((o) => (
              <label
                key={o.value}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition ${order === o.value ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
              >
                <input type="radio" name="order" value={o.value} checked={order === o.value} onChange={() => setOrder(o.value)} className="sr-only" />
                {o.label}
              </label>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ComboField
            name="lookupCap"
            label="New leads per month"
            defaultValue={String(lookupCap)}
            inputType="number"
            options={[
              { value: "1000", label: "1,000 — free" },
              { value: "5000", label: "5,000 — roughly $12–30 a month" },
              { value: "10000", label: "10,000 — roughly $110–150 a month" },
            ]}
            hint="Each new business costs one Google lookup (that's how we get its website and phone). Businesses already in the database are never looked up again."
          />
          <ComboField
            name="searchCap"
            label="Google searches per month"
            defaultValue={String(searchCap)}
            inputType="number"
            options={[
              { value: "4500", label: "4,500 — inside Google's free amount" },
              { value: "10000", label: "10,000 — roughly $200 extra a month" },
            ]}
            hint="One search = one page of 20 results. When either limit is reached the harvester pauses and continues on the 1st of next month."
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-ink p-4 text-paper sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="text-lg font-semibold">
            {searches.toLocaleString()} niche × city searches
            <span className="ml-2 text-sm font-normal opacity-70">
              {nicheCount} niche{nicheCount === 1 ? "" : "s"} × {marketCount} cit{marketCount === 1 ? "y" : "ies"}
            </span>
          </p>
          <p className="text-sm opacity-70">
            Usually {low.toLocaleString()}–{high.toLocaleString()} businesses in total · at {lookupCap.toLocaleString()} a month that&apos;s about{" "}
            {months(low) === months(high) ? months(low) : `${months(low)}–${months(high)}`} month{months(high) === 1 ? "" : "s"}. Opening their websites and finding emails is free.
          </p>
        </div>
        <SubmitButton pendingText="Saving…" className="btn-primary shrink-0">
          Add to queue
        </SubmitButton>
      </div>
    </div>
  );
}
