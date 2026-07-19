"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { tierLabels } from "@/lib/vault";

const sideNav = [
  { href: "/app", label: "Home", exact: true },
  { href: "/app/characters", label: "Companions" },
  { href: "/app/create", label: "Create" },
  { href: "/app/vault", label: "IRL Vault" },
  { href: "/app/media", label: "Media" },
  { href: "/app/account", label: "Account" },
];

/** Primary mobile tabs — app-like bottom bar */
const tabs = [
  {
    href: "/app",
    label: "Home",
    exact: true,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z"
      />
    ),
  },
  {
    href: "/app/characters",
    label: "Chat",
    exact: false,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    ),
  },
  {
    href: "/app/create",
    label: "Create",
    exact: false,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 5v14M5 12h14"
      />
    ),
  },
  {
    href: "/app/vault",
    label: "Vault",
    exact: false,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4h8z"
      />
    ),
  },
  {
    href: "/app/account",
    label: "You",
    exact: false,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z"
      />
    ),
  },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  if (href === "/app/characters") {
    return (
      pathname.startsWith("/app/characters") ||
      pathname.startsWith("/app/chat") ||
      pathname.startsWith("/app/companions")
    );
  }
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppShell({ children }: { children: ReactNode }) {
  const { ready, user, logout, isOwner } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const isChat = pathname.startsWith("/app/chat/");

  useEffect(() => {
    if (ready && !user) router.replace("/login?next=/app");
  }, [ready, user, router]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-mesh">
        <p className="text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex h-dvh max-h-dvh overflow-hidden bg-mesh">
      {/* Desktop sidebar */}
      <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-card-border bg-card/50 p-4 md:flex">
        <Link
          href="/"
          className="mb-8 flex items-center gap-2 px-2 font-semibold"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-deep text-sm text-white">
            K
          </span>
          <span className="leading-tight">
            The Koharu
            <span className="block text-xs font-normal text-muted">
              Project
            </span>
          </span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {sideNav.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
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
            <span className="badge bg-gold/15 text-gold">
              {tierLabels[user.tier]}
            </span>
            {isOwner && (
              <span className="badge bg-accent/20 text-accent-soft">Owner</span>
            )}
          </p>
          <button
            type="button"
            onClick={() => {
              void logout().then(() => router.push("/"));
            }}
            className="mt-3 min-h-11 w-full text-left text-xs text-muted hover:text-foreground"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="safe-top z-40 flex shrink-0 items-center justify-between border-b border-card-border bg-background/90 px-3 py-2.5 backdrop-blur-xl md:hidden">
          <Link href="/app" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-deep text-xs text-white">
              K
            </span>
            <span className="text-sm">Koharu</span>
          </Link>
          <button
            type="button"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-card-border text-sm text-muted"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </header>

        {/* Mobile overflow menu */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/60"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            />
            <div className="safe-top absolute right-0 top-0 flex h-full w-[min(100%,18rem)] flex-col border-l border-card-border bg-card p-4 shadow-2xl">
              <p className="text-sm font-medium">{user.displayName}</p>
              <p className="prose-muted text-xs">{tierLabels[user.tier]}</p>
              <nav className="mt-6 flex flex-col gap-1">
                {sideNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="min-h-12 rounded-xl px-3 py-3 text-sm text-foreground hover:bg-white/5"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <button
                type="button"
                className="mt-auto min-h-12 rounded-xl border border-card-border text-sm text-muted"
                onClick={() => {
                  void logout().then(() => router.push("/"));
                }}
              >
                Log out
              </button>
            </div>
          </div>
        )}

        <main
          className={`min-h-0 flex-1 ${
            isChat
              ? "flex flex-col overflow-hidden pb-0"
              : "overflow-auto pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0"
          }`}
        >
          {children}
        </main>

        {/* Mobile bottom tabs — hide on chat for max keyboard space */}
        {!isChat && (
          <nav
            className="safe-bottom fixed bottom-0 left-0 right-0 z-40 border-t border-card-border bg-background/95 backdrop-blur-xl md:hidden"
            aria-label="Primary"
          >
            <div className="mx-auto flex max-w-lg items-stretch justify-between px-1 pt-1">
              {tabs.map((tab) => {
                const active = isActive(pathname, tab.href, tab.exact);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 text-[10px] font-medium transition ${
                      active ? "text-accent-soft" : "text-muted"
                    }`}
                  >
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.75}
                      aria-hidden
                    >
                      {tab.icon}
                    </svg>
                    <span className="truncate">{tab.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
