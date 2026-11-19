"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/** A card that opens/closes, remembering its state across server refreshes. */
export function Disclosure({
  title,
  description,
  defaultOpen,
  children,
}: {
  title: string;
  description: string;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="card p-5 sm:p-6">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={open}>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-0.5 text-sm text-muted">{description}</p>
        </div>
        <ChevronDown className={`size-5 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={open ? "mt-5" : "hidden"}>{children}</div>
    </section>
  );
}
