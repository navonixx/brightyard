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
      <div className="sticky top-0 z-30 flex h-10 items-center justify-between gap-3 bg-void px-4 t-fine text-white/85">
        <span>Example preview · fictional business</span>
        <Link href="/#start" className="rounded-full bg-action px-3.5 py-1 text-[13px] text-white transition-transform active:scale-95">
          Get yours free
        </Link>
      </div>
      <SiteTemplate data={{ ...demo, images: [] }} />
    </div>
  );
}
