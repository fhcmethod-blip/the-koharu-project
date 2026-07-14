"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { featuredCharacter, listCharacters } from "@/lib/characters";
import { tierLabels } from "@/lib/vault";

export default function AppHomePage() {
  const { user } = useAuth();
  const others = listCharacters().filter((c) => c.id !== featuredCharacter.id).slice(0, 4);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-sm text-muted">
        Welcome back{user ? `, ${user.displayName}` : ""}
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">
        Your companions await
      </h1>

      <div
        className={`mt-8 overflow-hidden rounded-3xl border border-card-border bg-gradient-to-br ${featuredCharacter.gradient} p-6 sm:p-8`}
      >
        <p className="badge bg-black/30 text-accent-soft">Star companion</p>
        <h2 className="mt-3 text-2xl font-semibold">
          {featuredCharacter.name}{" "}
          <span className="text-base font-normal text-foreground/70">
            · {featuredCharacter.age}
          </span>
        </h2>
        <p className="mt-1 text-foreground/90">{featuredCharacter.tagline}</p>
        <p className="prose-muted mt-4 max-w-lg text-sm">{featuredCharacter.bio}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {featuredCharacter.tags.map((t) => (
            <span key={t} className="badge bg-black/25 text-foreground/85">
              {t}
            </span>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/app/chat/${featuredCharacter.id}`} className="btn-primary">
            Chat with {featuredCharacter.name}
          </Link>
          <Link
            href={`/app/companions/${featuredCharacter.id}`}
            className="btn-secondary"
          >
            Full profile
          </Link>
        </div>
      </div>

      <div className="mt-10">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-lg font-semibold">More companions</h2>
          <Link href="/app/characters" className="text-sm text-accent-soft hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {others.map((c) => (
            <Link
              key={c.id}
              href={`/app/chat/${c.id}`}
              className={`rounded-2xl border border-card-border bg-gradient-to-br ${c.gradient} p-4 transition hover:border-accent/40`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">
                  {c.name}{" "}
                  <span className="text-xs font-normal text-foreground/70">{c.age}</span>
                </p>
                <span className="text-xs text-muted">{c.tags[0]}</span>
              </div>
              <p className="mt-1 text-sm text-foreground/90">{c.tagline}</p>
              <p className="prose-muted mt-1 line-clamp-2 text-xs">{c.summary}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/app/characters"
          className="rounded-2xl border border-card-border bg-card/70 p-5 transition hover:border-accent/40"
        >
          <h3 className="font-semibold">Browse roster</h3>
          <p className="prose-muted mt-1 text-sm">
            Filter by vibe — girlfriend, domme, brat, romance, and more.
          </p>
        </Link>
        <Link
          href="/app/vault"
          className="rounded-2xl border border-card-border bg-card/70 p-5 transition hover:border-accent/40"
        >
          <h3 className="font-semibold">IRL Vault</h3>
          <p className="prose-muted mt-1 text-sm">
            Photos &amp; video · plan: {user ? tierLabels[user.tier] : "Free"}
          </p>
        </Link>
      </div>
    </div>
  );
}
