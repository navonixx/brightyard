"use client";

import { useState } from "react";

const CUSTOM = "__custom__";

/**
 * Pick from suggestions or type your own. The chosen value is submitted under `name`.
 */
export function ComboField({
  name,
  label,
  options,
  defaultValue,
  inputType = "text",
  placeholder,
  hint,
  required,
}: {
  name: string;
  label: string;
  options: { value: string; label?: string }[];
  defaultValue?: string;
  inputType?: "text" | "email" | "date" | "number";
  placeholder?: string;
  hint?: string;
  required?: boolean;
}) {
  const saved = defaultValue ?? "";
  const savedIsPreset = options.some((o) => o.value === saved);
  // A saved preset (including an empty "not set" option) stays selected; any other saved text opens the custom box.
  const initialMode = savedIsPreset ? saved : saved ? CUSTOM : (options[0]?.value ?? CUSTOM);
  const [mode, setMode] = useState<string>(initialMode);
  const [custom, setCustom] = useState(savedIsPreset ? "" : saved);
  const value = mode === CUSTOM ? custom : mode;

  return (
    <div>
      <label className="label" htmlFor={`${name}-pick`}>
        {label}
      </label>
      <select id={`${name}-pick`} value={mode} onChange={(e) => setMode(e.target.value)} className="input">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label ?? o.value}
          </option>
        ))}
        <option value={CUSTOM}>Type my own…</option>
      </select>
      {mode === CUSTOM ? (
        <input
          type={inputType}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="input mt-2"
          aria-label={`${label} (custom)`}
        />
      ) : null}
      <input type="hidden" name={name} value={value} />
      {hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
