import { ExternalLink } from "lucide-react";
import { siteUrl } from "@/lib/brand";

const short = (url: string) => url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
const full = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

/** Weakness badge: red = weak site (good prospect), green = already decent. */
export function WeaknessBadge({ score, checked }: { score: number | null; checked: boolean }) {
  if (!checked) return <span className="rounded-full bg-line/60 px-2 py-0.5 text-[11px] font-medium text-muted">Not checked</span>;
  if (score === null) return <span className="rounded-full bg-line/60 px-2 py-0.5 text-[11px] font-medium text-muted">Didn&apos;t load</span>;
  const weak = score >= 35;
  return (
    <span
      title="Website weakness score — higher means a weaker site and a better redesign prospect"
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        weak ? "bg-danger/12 text-danger" : "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
      }`}
    >
      {weak ? "Weak" : "Decent"} · {score}
    </span>
  );
}

export function CurrentSiteCell({
  website,
  score,
  checked,
  issues,
}: {
  website: string | null;
  score: number | null;
  checked: boolean;
  issues: string[] | null;
}) {
  if (!website) return <span className="text-xs text-muted">No website</span>;
  return (
    <div className="min-w-0 space-y-1">
      <a href={full(website)} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-[220px] items-center gap-1 truncate text-sm hover:text-brand">
        <span className="truncate">{short(website)}</span> <ExternalLink className="size-3 shrink-0" />
      </a>
      <div className="flex items-center gap-2">
        <WeaknessBadge score={score} checked={checked} />
        {issues?.[0] ? <span className="truncate text-[11px] text-muted" title={issues.join("\n")}>{issues[0]}</span> : null}
      </div>
    </div>
  );
}

export function NewSiteCell({ token, built }: { token: string; built: boolean }) {
  if (!built) return <span className="text-xs text-muted">Not built yet</span>;
  return (
    <a href={`/p/${token}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
      {short(siteUrl())}/p/{token.slice(0, 6)}… <ExternalLink className="size-3" />
    </a>
  );
}
