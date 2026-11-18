import { Suspense, type CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteTemplate } from "@/components/site-template";
import { DEMOS, getDemo } from "@/lib/demos";

export function generateStaticParams() {
  return DEMOS.map((demo) => ({ slug: demo.slug }));
}

export default function DemoPage({ params }: PageProps<"/demo/[slug]">) {
  return (
    <Suspense>
      <Demo params={params} />
    </Suspense>
  );
}

async function Demo({ params }: { params: PageProps<"/demo/[slug]">["params"] }) {
  const { slug } = await params;
  const demo = getDemo(slug);
  if (!demo) notFound();

  return (
    <div style={{ "--site-top": "2.5rem" } as CSSProperties}>
      <div className="sticky top-0 z-30 flex h-10 items-center justify-between gap-3 bg-ink px-4 text-xs text-paper sm:text-sm">
        <span>Example preview · fictional business</span>
        <Link href="/#start" className="rounded-full bg-sun px-3 py-1 font-semibold text-ink">
          Get yours free
        </Link>
      </div>
      <SiteTemplate data={{ ...demo, images: [] }} />
    </div>
  );
}
