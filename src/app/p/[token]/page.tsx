import type { CSSProperties } from "react";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { SiteTemplate, THEMES, type ThemeKey } from "@/components/site-template";
import { getLeadByToken } from "@/lib/data";
import { templateSample } from "@/lib/templates";
import { TRADE_FALLBACK } from "@/lib/photos";
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
          <p className="font-display text-2xl font-semibold">You&apos;re all set.</p>
          <p className="mt-2 text-muted">We won&apos;t contact you again. Thanks for your time.</p>
        </div>
      </main>
    );
  }

  const sample = lead.sample ?? templateSample(lead);
  // Until real photos are uploaded, show a fitting sample photo so the preview never looks empty.
  const images = lead.images.length ? lead.images : [TRADE_FALLBACK[lead.trade]];
  const theme = lead.theme && lead.theme in THEMES ? (lead.theme as ThemeKey) : undefined;
  // Only real websites count as a "current site" to compare against (not social profiles).
  const currentSite =
    lead.website && !/facebook.com|instagram.com|yelp.com/i.test(lead.website)
      ? lead.website.startsWith("http") ? lead.website : `https://${lead.website}`
      : null;

  return (
    <div style={{ "--site-top": "2.75rem" } as CSSProperties} className="pb-28">
      <PreviewChrome
        token={lead.token}
        businessName={lead.businessName}
        claimed={lead.status === "interested" || lead.status === "won"}
        prices={BRAND.suggestedPrices}
        currentSite={currentSite}
      />
      <SiteTemplate data={{ ...lead, sample, images, theme }} />
    </div>
  );
}
