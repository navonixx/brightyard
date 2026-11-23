"use client";

import { useState, useTransition } from "react";
import { Loader2, Stethoscope } from "lucide-react";
import type { SourceCheck } from "@/lib/leadengine/diagnose";

/** Runs a tiny read-only query on every source and shows what works on this server. */
export function LeSourceCheck({ check }: { check: () => Promise<SourceCheck[]> }) {
  const [results, setResults] = useState<SourceCheck[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <section className="card space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Test sources</h2>
          <p className="text-sm text-muted">Checks every source with one small search (Tulsa dentists). Nothing is saved.</p>
        </div>
        <button
          type="button"
          className="btn-ghost"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              try {
                setResults(await check());
              } catch (e) {
                setError(e instanceof Error ? e.message : "The check didn't finish (server time limit?)");
              }
            })
          }
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Stethoscope className="size-4" />} {pending ? "Testing… (up to a minute)" : "Test sources"}
        </button>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {results ? (
        <ul className="divide-y divide-line text-sm">
          {results.map((r) => (
            <li key={r.source} className="flex items-start justify-between gap-3 py-2">
              <span>
                {r.ok ? "✅" : "❌"} <strong>{r.source}</strong> — {r.detail}
              </span>
              <span className="shrink-0 text-xs text-muted">{(r.ms / 1000).toFixed(1)}s</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
