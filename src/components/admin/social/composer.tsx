"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { soCaption, soSavePost } from "@/app/admin/social-actions";
import type { ActionState } from "@/app/admin/actions";
import type { LibraryItem } from "@/lib/social/library";

type Initial = { id: number | null; idea: string; caption: string; hashtags: string; assets: string[]; platforms: string[]; when: string };

/** Pick media from the portfolio, get an AI caption, choose platforms and a time, save or approve. */
export function SoComposer({ library, initial }: { library: LibraryItem[]; initial: Initial }) {
  const [picked, setPicked] = useState<string[]>(initial.assets);
  const [idea, setIdea] = useState(initial.idea);
  const [caption, setCaption] = useState(initial.caption);
  const [hashtags, setHashtags] = useState(initial.hashtags);
  const [filter, setFilter] = useState("all");
  const [writing, startWriting] = useTransition();
  const [state, action, pending] = useActionState<ActionState, FormData>(soSavePost.bind(null, initial.id), null);

  const campaigns = useMemo(() => [...new Set(library.map((l) => l.campaign))], [library]);
  const shown = library.filter((l) => filter === "all" || l.campaign === filter || (filter === "videos" && l.kind === "video"));
  const hasVideo = picked.some((id) => library.find((l) => l.id === id)?.kind === "video");
  const toggle = (id: string) =>
    setPicked((p) => {
      const item = library.find((l) => l.id === id)!;
      if (p.includes(id)) return p.filter((x) => x !== id);
      if (item.kind === "video") return [id]; // a reel is posted on its own
      return [...p.filter((x) => library.find((l) => l.id === x)?.kind !== "video"), id].slice(0, 10);
    });

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">1. Pick media <span className="text-sm font-normal text-muted">({picked.length} picked · up to 10 photos for a carousel, or 1 video)</span></h2>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input w-auto py-1.5 text-sm" aria-label="Filter">
            <option value="all">All media</option>
            <option value="videos">Videos only</option>
            {campaigns.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="mt-4 grid max-h-[560px] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
          {shown.map((l) => {
            const n = picked.indexOf(l.id);
            return (
              <button type="button" key={l.id} onClick={() => toggle(l.id)} className={`relative overflow-hidden rounded-xl border-2 text-left ${n >= 0 ? "border-brand" : "border-transparent"}`} title={l.label}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.kind === "video" ? l.poster : l.src} alt={l.label} loading="lazy" className="aspect-square w-full object-cover" />
                {l.kind === "video" ? <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 text-[10px] text-white">VIDEO</span> : null}
                {n >= 0 ? <span className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-brand text-xs font-bold text-white">{n + 1}</span> : null}
                <span className="block truncate px-1 py-1 text-[11px] text-muted">{l.label}</span>
              </button>
            );
          })}
        </div>
        {picked.map((id) => <input key={id} type="hidden" name="asset" value={id} />)}
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-semibold">2. Caption</h2>
        <div>
          <label className="label" htmlFor="idea">Idea (optional)</label>
          <input id="idea" name="idea" value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="e.g. Tip: why product photos decide sales" className="input" />
        </div>
        <button
          type="button"
          className="btn-ghost"
          disabled={writing || (!picked.length && !idea)}
          onClick={() =>
            startWriting(async () => {
              const r = await soCaption(picked[0] ?? "", idea);
              setCaption(r.caption);
              setHashtags(r.hashtags);
            })
          }
        >
          {writing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} {writing ? "Writing…" : "Write caption with AI"}
        </button>
        <div>
          <label className="label" htmlFor="caption">Caption</label>
          <textarea id="caption" name="caption" rows={7} value={caption} onChange={(e) => setCaption(e.target.value)} className="input" />
          <p className="mt-1 text-xs text-muted">{caption.length + hashtags.length + 2} / 2,200 characters</p>
        </div>
        <div>
          <label className="label" htmlFor="hashtags">Hashtags</label>
          <textarea id="hashtags" name="hashtags" rows={2} value={hashtags} onChange={(e) => setHashtags(e.target.value)} className="input" />
        </div>

        <h2 className="pt-2 font-semibold">3. Where & when</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { k: "instagram", l: "Instagram" },
            { k: "facebook", l: "Facebook" },
            { k: "youtube", l: "YouTube Shorts", needsVideo: true },
          ].map((p) => (
            <label key={p.k} className="cursor-pointer">
              <input type="checkbox" name="platform" value={p.k} defaultChecked={initial.platforms.includes(p.k)} disabled={p.needsVideo && !hasVideo} className="peer sr-only" />
              <span className="inline-flex rounded-full border border-line px-3.5 py-1.5 text-[13px] text-muted peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand-strong peer-disabled:opacity-40">{p.l}</span>
            </label>
          ))}
        </div>
        <div>
          <label className="label" htmlFor="when">Date & time (US Eastern)</label>
          <input id="when" name="when" type="datetime-local" defaultValue={initial.when} className="input" />
        </div>
        {state?.message ? <p className="text-sm text-danger">{state.message}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" disabled={pending}>Save draft</button>
          <button name="approve" value="1" className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save & approve"}</button>
        </div>
      </section>
    </form>
  );
}
