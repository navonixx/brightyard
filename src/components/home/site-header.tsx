"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";

const LINKS = [
  { href: "#websites", label: "Websites" },
  { href: "#photography", label: "Photography" },
  { href: "#video", label: "Video" },
  { href: "#process", label: "Process" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

/** The one header: transparent over the hero, frosted glass once the page scrolls. */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${
        scrolled || open ? "border-b border-white/10 bg-void/75 backdrop-blur-xl backdrop-saturate-150" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="Alderwell Creative home" onClick={() => setOpen(false)}>
          <Logo size="sm" />
        </Link>
        <nav className="hidden items-center gap-7 text-[14px] text-white/70 lg:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="transition hover:text-white">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a href="#start" className="btn-glow hidden sm:inline-flex">
            Start a project
          </a>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full text-white/80 hover:text-white lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open ? (
        <nav className="border-t border-white/10 px-4 pb-6 pt-2 lg:hidden">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block border-b border-white/5 py-3.5 text-[17px] text-white/85">
              {l.label}
            </a>
          ))}
          <a href="#start" onClick={() => setOpen(false)} className="btn-glow mt-5 w-full">
            Start a project
          </a>
        </nav>
      ) : null}
    </header>
  );
}
