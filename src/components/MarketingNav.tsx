"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

const links = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

export function MarketingNav() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-card-border/80 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-deep text-sm text-white">
            K
          </span>
          <span className="hidden sm:inline">The Koharu Project</span>
          <span className="sm:hidden">Koharu</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="transition hover:text-foreground">
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
              <Link href="/login" className="btn-secondary !px-4 !py-2 text-sm">
                Log in
              </Link>
              <Link href="/signup" className="btn-primary !px-4 !py-2 text-sm">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
