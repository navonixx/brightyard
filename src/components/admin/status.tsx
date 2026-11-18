import type { LeadStatus } from "@/lib/db/schema";

export const STATUS_META: Record<LeadStatus, { label: string; className: string }> = {
  new: { label: "New", className: "bg-line/60 text-muted" },
  sample_ready: { label: "Preview ready", className: "bg-sun-soft text-ink" },
  emailed: { label: "Emailed", className: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  viewed: { label: "Viewed", className: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  interested: { label: "Interested", className: "bg-sun text-ink" },
  won: { label: "Won", className: "bg-brand text-white" },
  lost: { label: "Lost", className: "bg-line text-muted" },
  opted_out: { label: "Opted out", className: "bg-danger/15 text-danger" },
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.new;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  );
}

export function timeAgo(date: Date | null | undefined, now: number): string {
  if (!date) return "—";
  const s = Math.round((now - date.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
