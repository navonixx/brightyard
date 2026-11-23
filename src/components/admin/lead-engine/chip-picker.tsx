"use client";

import { useMemo, useState } from "react";

export type Chip = { value: string; label: string; group: string };

/** Grouped multi-select chips with a search box and all/none per group. */
export function LeChipPicker({ name, items, initial = [], placeholder }: { name: string; items: Chip[]; initial?: string[]; placeholder: string }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initial));
  const [find, setFind] = useState("");
  const groups = useMemo(() => [...new Set(items.map((i) => i.group))], [items]);
  const match = (i: Chip) => !find || `${i.label} ${i.group}`.toLowerCase().includes(find.toLowerCase());
  const toggle = (values: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const v of values) (on ? next.add(v) : next.delete(v));
      return next;
    });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input value={find} onChange={(e) => setFind(e.target.value)} placeholder={placeholder} className="input max-w-xs py-2" />
        <span className="text-sm text-muted">{selected.size} selected</span>
        {selected.size ? (
          <button type="button" onClick={() => setSelected(new Set())} className="text-sm text-brand hover:underline">
            Clear
          </button>
        ) : null}
      </div>
      <div className="relative mt-3 max-h-[320px] space-y-3 overflow-y-auto pr-1">
        {groups.map((g) => {
          const list = items.filter((i) => i.group === g);
          const visible = list.filter(match);
          if (!visible.length) return null;
          return (
            <div key={g}>
              <div className="mb-1.5 flex items-center gap-3 text-xs">
                <span className="font-semibold uppercase tracking-wide text-muted">{g}</span>
                <button type="button" onClick={() => toggle(visible.map((i) => i.value), true)} className="text-brand hover:underline">all</button>
                <button type="button" onClick={() => toggle(visible.map((i) => i.value), false)} className="text-muted hover:underline">none</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {list.map((i) => (
                  <label key={i.value} className={`relative cursor-pointer ${match(i) ? "" : "hidden"}`}>
                    <input type="checkbox" name={name} value={i.value} checked={selected.has(i.value)} onChange={(e) => toggle([i.value], e.target.checked)} className="peer sr-only" />
                    <span className="inline-flex rounded-full border border-line px-3 py-1 text-[13px] text-ink/80 transition peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand-strong">
                      {i.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
