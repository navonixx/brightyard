import { Suspense } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { sq, type Post } from "@/lib/social/db";
import { metaConnected } from "@/lib/social/publish";
import { ActionButton, CopyButton } from "@/components/admin/ui";
import { PageSkeleton } from "@/components/admin/skeleton";
import { SoHeader } from "@/components/admin/social/header";
import { soDelete, soMarkPosted, soPlanWeek, soPublishDue, soPublishNow, soSetStatus } from "../../social-actions";

// Planning a week writes 7 captions with AI, and publishing waits for Instagram to process videos.
export const maxDuration = 60;

export default function SocialPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Social />
    </Suspense>
  );
}

const when = (v: Post["scheduled_for"]) =>
  v ? new Date(v).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + " ET" : "No date";

const STATUS: Record<Post["status"], string> = {
  draft: "bg-paper text-muted",
  approved: "bg-sky-100 text-sky-700",
  posted: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
};

async function Social() {
  await requireAdmin();
  const [upcoming, posted] = await Promise.all([
    sq<Post>("SELECT * FROM so_posts WHERE status <> 'posted' ORDER BY scheduled_for NULLS LAST, id"),
    sq<Post>("SELECT * FROM so_posts WHERE status = 'posted' ORDER BY updated_at DESC LIMIT 12"),
  ]);
  const connected = metaConnected();

  return (
    <div className="space-y-6">
      <SoHeader
        active="/admin/social"
        title="Posts"
        intro="Plan a week in one click: the AI picks media from your portfolio and writes captions. Read each post and approve it. Until the accounts are connected, post by hand: download, copy the caption, then “Mark posted”."
      />

      <div className="flex flex-wrap items-center gap-3">
        <ActionButton action={soPlanWeek} pendingText="Planning 7 posts… (about 30 s)">Plan next 7 days</ActionButton>
        <Link href="/admin/social/compose" className="btn-ghost">New post</Link>
        {connected ? (
          <ActionButton action={soPublishDue} className="btn-ghost" pendingText="Publishing…">Publish due posts</ActionButton>
        ) : (
          <Link href="/admin/social/setup" className="text-sm text-brand hover:underline">Instagram/Facebook not connected — set up →</Link>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Upcoming ({upcoming.length})</h2>
        {upcoming.length ? upcoming.map((p) => <PostCard key={p.id} post={p} connected={connected} />) : <p className="card p-8 text-center text-sm text-muted">Nothing planned yet. Press “Plan next 7 days”.</p>}
      </section>

      {posted.length ? (
        <section className="space-y-3">
          <h2 className="font-semibold">Posted</h2>
          {posted.map((p) => <PostCard key={p.id} post={p} connected={connected} />)}
        </section>
      ) : null}
    </div>
  );
}

function PostCard({ post, connected }: { post: Post; connected: boolean }) {
  const text = [post.caption, post.hashtags].filter(Boolean).join("\n\n");
  const id = post.id;
  return (
    <article className="card flex flex-col gap-4 p-4 sm:flex-row">
      <div className="flex shrink-0 gap-1.5 sm:w-56 sm:flex-wrap">
        {post.assets.slice(0, 4).map((a, i) => (
          <div key={i} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.kind === "video" ? a.poster : a.src} alt={a.label} className={`rounded-lg object-cover ${post.assets.length > 1 ? "size-[104px]" : "h-[200px] w-[160px]"}`} />
            {a.kind === "video" ? <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 text-[10px] text-white">REEL</span> : null}
          </div>
        ))}
        {post.assets.length > 4 ? <span className="self-center text-xs text-muted">+{post.assets.length - 4}</span> : null}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-full px-2.5 py-0.5 font-medium ${STATUS[post.status]}`}>{post.status}</span>
          <span className="font-medium">{when(post.scheduled_for)}</span>
          {post.platforms.map((pl) => (
            <span key={pl} className="rounded-full border border-line px-2 py-0.5 capitalize">
              {pl}
              {post.results?.[pl]?.url ? (
                <a href={post.results[pl].url} target="_blank" rel="noopener noreferrer" className="ml-1 text-brand">↗</a>
              ) : post.results?.[pl] ? " ✓" : ""}
            </span>
          ))}
        </div>
        {post.idea ? <p className="text-xs text-muted">Idea: {post.idea}</p> : null}
        <p className="line-clamp-4 whitespace-pre-line text-sm">{post.caption}</p>
        <p className="line-clamp-1 text-xs text-brand">{post.hashtags}</p>
        {post.error ? <p className="text-xs text-danger">{post.error}</p> : null}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {post.status !== "posted" ? (
            <>
              {post.status === "approved" ? (
                <ActionButton action={soSetStatus.bind(null, id, "draft")} className="btn-ghost px-3 py-1.5 text-xs">Unapprove</ActionButton>
              ) : (
                <ActionButton action={soSetStatus.bind(null, id, "approved")} className="btn-primary px-3 py-1.5 text-xs">Approve</ActionButton>
              )}
              <Link href={`/admin/social/compose?id=${id}`} className="btn-ghost px-3 py-1.5 text-xs">Edit</Link>
              {connected ? <ActionButton action={soPublishNow.bind(null, id)} className="btn-ghost px-3 py-1.5 text-xs" pendingText="Publishing…">Publish now</ActionButton> : null}
            </>
          ) : null}
          <CopyButton text={text} label="Copy caption" />
          {post.assets.map((a, i) => (
            <a key={i} href={a.src} download className="btn-ghost px-3 py-1.5 text-xs">
              <Download className="size-3.5" /> {post.assets.length > 1 ? i + 1 : a.kind === "video" ? "Video" : "Photo"}
            </a>
          ))}
          {post.status !== "posted" ? (
            <>
              <ActionButton action={soMarkPosted.bind(null, id)} className="btn-ghost px-3 py-1.5 text-xs">Mark posted</ActionButton>
              <ActionButton action={soDelete.bind(null, id)} className="px-3 py-1.5 text-xs text-muted hover:text-danger" confirm="Delete this post?">Delete</ActionButton>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}
