import type { CSSProperties } from "react";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { SiteTemplate } from "@/components/site-template";
import { getLeadByToken } from "@/lib/data";
import { templateSample } from "@/lib/templates";
import { BRAND } from "@/lib/brand";
import { PreviewChrome } from "./preview-chrome";

export default function PreviewPage({ params }: PageProps<"/p/[token]">) {
  return (
    <Suspense fallback={<div className="grid min-h-dvh place-items-center text-muted">Loading your preview…</div>}>
      <Preview params={params} />
    </Suspense>
  );
}

async function Preview({ params }: { params: PageProps<"/p/[token]">["params"] }) {
  const { token } = await params;
  await connection();
  const lead = await getLeadByToken(token);
  if (!lead) notFound();

  if (lead.status === "opted_out") {
    return (
      <main className="grid min-h-dvh place-items-center px-4 text-center">
        <div>
          <p className="font-display text-2xl font-bold">You&apos;re all set.</p>
          <p className="mt-2 text-muted">We won&apos;t contact you again. Thanks for your time.</p>
        </div>
      </main>
    );
  }

  const sample = lead.sample ?? templateSample(lead);

  return (
    <div style={{ "--site-top": "2.75rem" } as CSSProperties} className="pb-28">
      <PreviewChrome
        token={lead.token}
        businessName={lead.businessName}
        claimed={lead.status === "interested" || lead.status === "won"}
        prices={BRAND.suggestedPrices}
      />
      <SiteTemplate data={{ ...lead, sample }} />
    </div>
  );
}
