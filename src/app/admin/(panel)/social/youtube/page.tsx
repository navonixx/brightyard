import { Suspense } from "react";
import Link from "next/link";
import { Download, ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { sq } from "@/lib/social/db";
import { downloadLink } from "@/lib/social/storage";
import type { Video } from "@/lib/social/studio";
import { ActionButton, ActionForm, CopyButton, SubmitButton } from "@/components/admin/ui";
import { PageSkeleton } from "@/components/admin/skeleton";
import { SoHeader } from "@/components/admin/social/header";
import { stYoutubeDone, stYoutubeUndo } from "../../../studio-actions";

export default function YoutubePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Youtube />
    </Suspense>
  );
}

async function Youtube() {
  await requireAdmin();
  const rows = await sq<Video>(
    "SELECT * FROM so_videos WHERE format IN ('story_reel','reel','photo_ad') AND status IN ('ready','scheduled') AND coalesce(final_url, video_url) IS NOT NULL ORDER BY (youtube_url IS NOT NULL), id DESC LIMIT 60",
  );
  const todo = rows.filter((r) => !r.youtube_url);
  const done = rows.filter((r) => r.youtube_url);
  return (
    <div className="space-y-6">
      <SoHeader
        active="/admin/social/youtube"
        title="YouTube Shorts"
        intro="Every finished Studio video, packed for YouTube: the video, a thumbnail, title, description and tags. Download, upload in YouTube Studio or the YouTube app, paste the link back here."
      />
      <ol className="card list-decimal space-y-1 p-5 pl-10 text-sm text-ink/80">
        <li><strong>Download video</strong> (and the thumbnail).</li>
        <li>Open <a href="https://studio.youtube.com" target="_blank" rel="noopener noreferrer" className="text-brand underline">YouTube Studio</a> → Create → Upload videos (or the YouTube app → + → Short).</li>
        <li>Copy the <strong>title</strong>, <strong>description</strong> and <strong>tags</strong> with the buttons below. Under “Altered or synthetic content” choose <strong>Yes</strong> — these are AI videos.</li>
        <li>Publish, then paste the Short&apos;s link here → <strong>Mark uploaded</strong>.</li>
      </ol>

      <section className="space-y-3">
        <h2 className="font-semibold">To upload ({todo.length})</h2>
        {todo.length ? todo.map((v) => <Card key={v.id} v={v} />) : (
          <p className="card p-8 text-center text-sm text-muted">
            Nothing waiting. Make videos in the <Link href="/admin/social/studio" className="text-brand underline">Studio</Link>.
          </p>
        )}
      </section>

      {done.length ? (
        <section className="space-y-3">
          <h2 className="font-semibold">Uploaded ({done.length})</h2>
          {done.map((v) => <Card key={v.id} v={v} />)}
        </section>
      ) : null}
    </div>
  );
}

function Card({ v }: { v: Video }) {
  const video = v.final_url ?? v.video_url ?? "";
  const tags = v.yt_tags;
  return (
    <article className="card flex flex-col gap-4 p-4 sm:flex-row">
      <video src={video} poster={v.cover_url ?? undefined} controls playsInline className="aspect-[9/16] w-40 shrink-0 rounded-lg bg-black object-cover" />
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap gap-2">
          <a href={downloadLink(video)} className="btn-primary px-3 py-1.5 text-xs"><Download className="size-3.5" /> Download video</a>
          {v.thumb_url ? <a href={downloadLink(v.thumb_url)} className="btn-ghost px-3 py-1.5 text-xs"><Download className="size-3.5" /> Thumbnail 16:9</a> : null}
          {v.cover_url ? <a href={downloadLink(v.cover_url)} className="btn-ghost px-3 py-1.5 text-xs"><Download className="size-3.5" /> Cover 9:16</a> : null}
          <a href="https://studio.youtube.com" target="_blank" rel="noopener noreferrer" className="btn-ghost px-3 py-1.5 text-xs"><ExternalLink className="size-3.5" /> YouTube Studio</a>
        </div>
        <Block label="Title" text={v.yt_title} />
        <Block label="Description" text={v.yt_description} />
        <Block label="Tags" text={tags} />
        {v.thumb_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.thumb_url} alt="Thumbnail" className="w-56 rounded-lg border border-line" />
        ) : null}
        {v.youtube_url ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-emerald-700">✅ Uploaded</span>
            {v.youtube_url.startsWith("http") ? <a href={v.youtube_url} target="_blank" rel="noopener noreferrer" className="text-brand underline">{v.youtube_url}</a> : null}
            <ActionButton action={stYoutubeUndo.bind(null, v.id)} className="text-xs text-muted hover:text-ink">Undo</ActionButton>
          </div>
        ) : (
          <ActionForm action={stYoutubeDone.bind(null, v.id)} className="flex flex-wrap items-end gap-2">
            <div className="min-w-60 flex-1">
              <label className="label text-xs" htmlFor={`yt-${v.id}`}>YouTube link (optional)</label>
              <input id={`yt-${v.id}`} name="url" className="input py-1.5 text-sm" placeholder="https://youtube.com/shorts/…" />
            </div>
            <SubmitButton pendingText="Saving…">Mark uploaded</SubmitButton>
          </ActionForm>
        )}
      </div>
    </article>
  );
}

function Block({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl bg-paper p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        <CopyButton text={text} />
      </div>
      <p className="mt-1 line-clamp-4 whitespace-pre-line text-sm">{text}</p>
    </div>
  );
}
