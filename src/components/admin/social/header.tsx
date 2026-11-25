import Link from "next/link";

const TABS = [
  { href: "/admin/social", label: "Autopilot" },
  { href: "/admin/social/calendar", label: "Calendar" },
  { href: "/admin/social/studio", label: "Create" },
  { href: "/admin/social/insights", label: "Insights" },
  { href: "/admin/social/youtube", label: "YouTube" },
  { href: "/admin/social/setup", label: "Setup" },
];

export function SoHeader({ active, title, intro }: { active: string; title: string; intro: string }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">Social</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">{intro}</p>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium ${active === t.href ? "border-brand text-ink" : "border-transparent text-muted hover:text-ink"}`}>
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
