"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { tierLabels } from "@/lib/vault";

const nav = [
  { href: "/app", label: "Home", exact: true },
  { href: "/app/characters", label: "Companions" },
  { href: "/app/companions/koharu", label: "Koharu profile" },
  { href: "/app/chat/koharu", label: "Chat · Koharu" },
  { href: "/app/vault", label: "IRL Vault" },
  { href: "/app/media", label: "Media Manager" },
  { href: "/app/account", label: "Account" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { ready, user, logout, isOwner } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace("/login?next=/app");
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh">
        <p className="text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-mesh">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-card-border bg-card/50 p-4 md:flex">
        <Link href="/" className="mb-8 flex items-center gap-2 px-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-deep text-sm text-white">
            K
          </span>
          <span className="leading-tight">
            The Koharu
            <span className="block text-xs font-normal text-muted">Project</span>
          </span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-accent/15 text-accent-soft"
                    : "text-muted hover:bg-white/5 hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-2xl border border-card-border bg-black/20 p-3">
          <p className="truncate text-sm font-medium">{user.displayName}</p>
          <p className="prose-muted truncate text-xs">{user.email}</p>
          <p className="mt-2 flex flex-wrap gap-1">
            <span className="badge bg-gold/15 text-gold">{tierLabels[user.tier]}</span>
            {isOwner && (
              <span className="badge bg-accent/20 text-accent-soft">Owner</span>
            )}
          </p>
          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="mt-3 w-full text-left text-xs text-muted hover:text-foreground"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-card-border px-4 py-3 md:hidden">
          <Link href="/app" className="font-semibold">
            Koharu
          </Link>
          <div className="flex gap-3 text-xs text-muted">
            <Link href="/app/characters">Chat</Link>
            <Link href="/app/vault">Vault</Link>
            <Link href="/app/account">Account</Link>
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
