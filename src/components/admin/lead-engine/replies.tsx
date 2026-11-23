"use client";

import { useState, useTransition } from "react";
import { Copy, Send } from "lucide-react";
import { leFollowUpSent } from "@/app/admin/lead-engine-actions";
import type { Reply } from "@/lib/leadengine/replies";

function CopyText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost px-3 py-1 text-xs"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      <Copy className="size-3.5" /> {copied ? "Copied" : "Copy"}
    </button>
  );
}

const gmail = (to: string, subject: string, body: string) =>
  `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

/** Ready answers for the usual replies — open one, copy it into the reply in Gmail. */
export function LeReplies({ replies }: { replies: Reply[] }) {
  return (
    <div className="space-y-2">
      {replies.map((r) => (
        <details key={r.when} className="rounded-xl border border-line p-3">
          <summary className="cursor-pointer text-sm font-medium">They said: {r.when}</summary>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-ink/80">{r.text}</pre>
          <div className="mt-2">
            <CopyText text={r.text} />
          </div>
        </details>
      ))}
    </div>
  );
}

export type FollowUpItem = { id: number; name: string; email: string; step: 1 | 2; subject: string; body: string; sentAgo: string };

/** Follow-ups due today: open in Gmail (marks it sent) or copy. */
export function LeFollowUps({ items }: { items: FollowUpItem[] }) {
  const [done, setDone] = useState<Set<number>>(new Set());
  const [, start] = useTransition();
  if (!items.length) return <p className="py-6 text-center text-sm text-muted">No follow-ups due. Leads you email show up here after 3 days if they haven&apos;t replied.</p>;
  return (
    <ul className="divide-y divide-line">
      {items.map((f) => (
        <li key={f.id} className={`py-3 ${done.has(f.id) ? "opacity-40" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{f.name}</p>
              <p className="text-xs text-muted">
                {f.step === 1 ? "1st follow-up" : "Last follow-up"} · first email {f.sentAgo} · {f.email}
              </p>
            </div>
            <div className="flex gap-2">
              <a
                href={gmail(f.email, f.subject, f.body)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary px-3 py-1 text-xs"
                onClick={() => {
                  setDone((d) => new Set(d).add(f.id));
                  start(() => leFollowUpSent(f.id));
                }}
              >
                <Send className="size-3.5" /> Open in Gmail
              </a>
              <CopyText text={`${f.subject}\n\n${f.body}`} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
