import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { sq, type Post } from "@/lib/social/db";
import { LIBRARY, libraryBySrc } from "@/lib/social/library";
import { dateToEastern, easternToDate } from "@/lib/social/plan";
import { PageSkeleton } from "@/components/admin/skeleton";
import { SoHeader } from "@/components/admin/social/header";
import { SoComposer } from "@/components/admin/social/composer";

// “Write caption with AI” runs in this page's server action.
export const maxDuration = 60;

type SP = Promise<Record<string, string | string[] | undefined>>;

export default function ComposePage({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Compose searchParams={searchParams} />
    </Suspense>
  );
}

async function Compose({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const id = Number((await searchParams).id) || null;
  const post = id ? (await sq<Post>("SELECT * FROM so_posts WHERE id = $1", [id]))[0] : undefined;
  const tomorrow = dateToEastern(new Date(Date.now() + 86_400_000)).slice(0, 10);
  const initial = {
    id: post?.id ?? null,
    idea: post?.idea ?? "",
    caption: post?.caption ?? "",
    hashtags: post?.hashtags ?? "",
    assets: (post?.assets ?? []).map((a) => libraryBySrc.get(a.src)?.id).filter(Boolean) as string[],
    platforms: post?.platforms ?? ["instagram", "facebook"],
    when: post?.scheduled_for ? dateToEastern(post.scheduled_for) : dateToEastern(easternToDate(`${tomorrow}T10:00`)),
  };
  return (
    <div className="space-y-6">
      <SoHeader active="/admin/social/compose" title={post ? "Edit post" : "New post"} intro="Choose photos or a reel from your portfolio, let the AI write the caption, then pick where and when." />
      <SoComposer library={LIBRARY} initial={initial} />
    </div>
  );
}
