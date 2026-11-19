import { ExternalLink } from "lucide-react";
import { siteUrl } from "@/lib/brand";

/** "Their site ↗ · New site ↗" — the before/after pair for a lead. */
export function SiteLinks({
  website,
  token,
  className = "",
  size = "sm",
}: {
  website: string | null;
  token: string;
  className?: string;
  size?: "sm" | "lg";
}) {
  const current = website ? (/^https?:\/\//i.test(website) ? website : `https://${website}`) : null;
  const next = `${siteUrl()}/p/${token}`;
  const short = (url: string) => url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");

  if (size === "lg") {
    return (
      <div className={`grid gap-3 sm:grid-cols-2 ${className}`}>
        <a
          href={current ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={`card block p-4 ${current ? "hover:border-brand/50" : "pointer-events-none opacity-60"}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Before · their current site</p>
          <p className="mt-1 flex items-center gap-1.5 truncate font-medium">
            {current ? short(current) : "No website"} {current ? <ExternalLink className="size-3.5 shrink-0" /> : null}
          </p>
        </a>
        <a href={`/p/${token}`} target="_blank" rel="noopener noreferrer" className="card block border-brand/40 bg-brand-soft p-4 hover:border-brand">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">After · the site we built</p>
          <p className="mt-1 flex items-center gap-1.5 truncate font-medium">
            {short(next)} <ExternalLink className="size-3.5 shrink-0" />
          </p>
        </a>
      </div>
    );
  }

  return (
    <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${className}`}>
      {current ? (
        <a href={current} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted hover:text-ink">
          Before: {short(current)} <ExternalLink className="size-3" />
        </a>
      ) : (
        <span className="text-muted">Before: no website</span>
      )}
      <a href={`/p/${token}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-brand hover:underline">
        After: new site <ExternalLink className="size-3" />
      </a>
    </p>
  );
}
