"use client";

import { useState, useTransition } from "react";
import { Copy, Send } from "lucide-react";
import { leMarkContacted } from "@/app/admin/lead-engine-actions";

/** Editable first email; opens a ready Gmail compose window and marks the lead contacted. */
export function LeEmailDraft({ id, to, subject, body }: { id: number; to: string | null; subject: string; body: string }) {
  const [su, setSu] = useState(subject);
  const [text, setText] = useState(body);
  const [copied, setCopied] = useState(false);
  const [, start] = useTransition();
  const gmail = to ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(su)}&body=${encodeURIComponent(text)}` : null;
  return (
    <div className="space-y-3">
      <div>
        <label className="label" htmlFor="le-su">Subject</label>
        <input id="le-su" value={su} onChange={(e) => setSu(e.target.value)} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="le-body">Email</label>
        <textarea id="le-body" value={text} onChange={(e) => setText(e.target.value)} rows={16} className="input font-mono text-[13px] leading-relaxed" />
      </div>
      <div className="flex flex-wrap gap-2">
        {gmail ? (
          <a href={gmail} target="_blank" rel="noopener noreferrer" onClick={() => start(() => leMarkContacted(id))} className="btn-primary">
            <Send className="size-4" /> Open in Gmail
          </a>
        ) : (
          <span className="text-sm text-muted">No email found — call, message on Facebook, or use their contact form.</span>
        )}
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(`${su}\n\n${text}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="btn-ghost"
        >
          <Copy className="size-4" /> {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
