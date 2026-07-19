"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

const links = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

export function MarketingNav() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="safe-top sticky top-0 z-50 border-b border-card-border/80 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-deep text-sm text-white">
            K
          </span>
          <span className="hidden sm:inline">The Koharu Project</span>
          <span className="sm:hidden">Koharu</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="transition hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Link href="/app" className="btn-primary !px-4 !py-2 text-sm">
              Open app
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="btn-secondary hidden !px-4 !py-2 text-sm xs:inline-flex sm:inline-flex"
              >
                Log in
              </Link>
              <Link href="/signup" className="btn-primary !px-4 !py-2 text-sm">
                Sign up
              </Link>
            </>
          )}
          <button
            type="button"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-card-border text-muted md:hidden"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-card-border bg-card/95 px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="min-h-12 content-center rounded-xl px-3 text-sm text-foreground hover:bg-white/5"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            {!user && (
              <Link
                href="/login"
                className="min-h-12 content-center rounded-xl px-3 text-sm text-muted"
                onClick={() => setOpen(false)}
              >
                Log in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
