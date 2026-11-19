import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenCheck, Columns2, Database, LayoutDashboard, LogOut, Send, Settings, Users } from "lucide-react";
import { Logo } from "@/components/logo";
import { logout } from "../actions";

export const metadata: Metadata = {
  title: "Alderwell Creative Admin",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/guide", label: "Guide", icon: BookOpenCheck },
  { href: "/admin/database", label: "Lead Database", icon: Database },
  { href: "/admin/leads", label: "Leads", icon: Users },
  { href: "/admin/sites", label: "Before & After", icon: Columns2 },
  { href: "/admin/outreach", label: "Outreach", icon: Send },
  { href: "/admin/settings", label: "Settings", icon: Settings },
] as const;

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="border-b border-line bg-card md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-4 md:px-5 md:py-6">
          <Link href="/admin">
            <Logo />
          </Link>
          <form action={logout} className="md:hidden">
            <button className="text-muted" aria-label="Sign out">
              <LogOut className="size-5" />
            </button>
          </form>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-brand-soft hover:text-ink"
            >
              <item.icon className="size-4" /> {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden px-3 md:absolute md:bottom-4 md:block md:w-60">
          <a href="/" target="_blank" className="block rounded-lg px-3 py-2 text-sm text-muted hover:text-ink">
            View public site ↗
          </a>
          <form action={logout}>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:text-ink">
              <LogOut className="size-4" /> Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}
