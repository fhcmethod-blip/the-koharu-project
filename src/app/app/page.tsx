"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { featuredCharacter, listCharacters } from "@/lib/characters";
import { tierLabels } from "@/lib/vault";

export default function AppHomePage() {
  const { user } = useAuth();
  const others = listCharacters()
    .filter((c) => c.id !== featuredCharacter.id)
    .slice(0, 6);
  const starAvatar =
    featuredCharacter.avatarUrl || `/companions/${featuredCharacter.id}.jpg`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-sm text-muted">
        Welcome back{user ? `, ${user.displayName}` : ""}
        {user ? (
          <span className="ml-2 badge bg-gold/15 text-gold">
            {tierLabels[user.tier]}
          </span>
        ) : null}
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">
        Your companions await
      </h1>

      {/* Featured with portrait */}
      <div className="mt-8 overflow-hidden rounded-3xl border border-card-border bg-card/80">
        <div className="grid sm:grid-cols-[220px_1fr]">
          <div className="relative min-h-[240px] sm:min-h-full">
            <Image
              src={starAvatar}
              alt={featuredCharacter.name}
              fill
              className="object-cover object-top"
              sizes="220px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent sm:bg-gradient-to-r" />
          </div>
          <div
            className={`bg-gradient-to-br ${featuredCharacter.gradient} p-6 sm:p-8`}
          >
            <p className="badge bg-black/30 text-accent-soft">Star companion</p>
            <h2 className="mt-3 text-2xl font-semibold">
              {featuredCharacter.name}{" "}
              <span className="text-base font-normal text-foreground/70">
                · {featuredCharacter.age}
              </span>
            </h2>
            <p className="mt-1 text-foreground/90">{featuredCharacter.tagline}</p>
            <p className="prose-muted mt-4 max-w-lg text-sm">
              {featuredCharacter.bio}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {featuredCharacter.tags.map((t) => (
                <span key={t} className="badge bg-black/25 text-foreground/85">
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/app/chat/${featuredCharacter.id}`}
                className="btn-primary"
              >
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
        </div>
      </div>

      <div className="mt-10">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-lg font-semibold">More companions</h2>
          <Link
            href="/app/characters"
            className="text-sm text-accent-soft hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((c) => {
            const av = c.avatarUrl || `/companions/${c.id}.jpg`;
            return (
              <Link
                key={c.id}
                href={`/app/companions/${c.id}`}
                className="group overflow-hidden rounded-2xl border border-card-border bg-card/70 transition hover:border-accent/40"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={av}
                    alt={c.name}
                    fill
                    className="object-cover object-top transition group-hover:scale-[1.03]"
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="font-semibold text-white">
                      {c.name}{" "}
                      <span className="text-xs font-normal text-white/70">
                        {c.age}
                      </span>
                    </p>
                    <p className="text-xs text-white/85">{c.tagline}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/app/characters"
          className="rounded-2xl border border-card-border bg-card/70 p-5 transition hover:border-accent/40"
        >
          <h3 className="font-semibold">Browse roster</h3>
          <p className="prose-muted mt-1 text-sm">
            Women &amp; men — filter by vibe and open full profiles.
          </p>
        </Link>
        <Link
          href="/app/vault"
          className="rounded-2xl border border-card-border bg-card/70 p-5 transition hover:border-accent/40"
        >
          <h3 className="font-semibold">IRL Vault</h3>
          <p className="prose-muted mt-1 text-sm">
            Member photos &amp; videos (Plus / VIP).
          </p>
        </Link>
      </div>
    </div>
  );
}
