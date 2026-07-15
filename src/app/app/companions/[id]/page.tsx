"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getCharacter } from "@/lib/characters";

export default function CompanionProfilePage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const c = getCharacter(id);

  if (!c) {
    return (
      <div className="p-10">
        <p>Companion not found.</p>
        <Link href="/app/characters" className="text-accent-soft">
          Back to companions
        </Link>
      </div>
    );
  }

  const avatar = c.avatarUrl || `/companions/${c.id}.jpg`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link
        href="/app/characters"
        className="text-sm text-muted hover:text-foreground"
      >
        ← Companions
      </Link>

      {/* Hero profile */}
      <div className="mt-4 overflow-hidden rounded-3xl border border-card-border bg-card/80">
        <div
          className={`relative h-40 bg-gradient-to-br ${c.gradient} sm:h-52`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.12),_transparent_60%)]" />
        </div>

        <div className="relative px-5 pb-6 sm:px-8">
          <div className="-mt-16 flex flex-col gap-4 sm:-mt-20 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
              <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-3xl border-4 border-card shadow-xl shadow-black/40 sm:h-40 sm:w-40">
                <Image
                  src={avatar}
                  alt={c.name}
                  fill
                  className="object-cover object-top"
                  sizes="160px"
                  priority
                />
              </div>
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-semibold tracking-tight">
                    {c.name}
                  </h1>
                  <span className="badge bg-white/10">{c.age}</span>
                  <span className="badge bg-white/10">
                    {c.gender === "male" ? "Man" : "Woman"}
                  </span>
                  {c.isFeatured && (
                    <span className="badge bg-accent/35 text-accent-soft">
                      Star
                    </span>
                  )}
                </div>
                <p className="mt-1 text-lg text-foreground/95">{c.tagline}</p>
                <p className="prose-muted mt-1 text-sm">{c.summary}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/app/chat/${c.id}`} className="btn-primary">
                Start chat
              </Link>
              <Link href="/app/characters" className="btn-secondary">
                All companions
              </Link>
            </div>
          </div>

          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-foreground/90">
            {c.bio}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {c.tags.map((t) => (
              <span key={t} className="badge bg-white/10 text-foreground/85">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Portrait + quick facts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="overflow-hidden rounded-3xl border border-card-border bg-card/70">
          <div className="relative aspect-[3/4] w-full">
            <Image
              src={avatar}
              alt={`${c.name} portrait`}
              fill
              className="object-cover object-top"
              sizes="(max-width: 1024px) 100vw, 40vw"
            />
          </div>
          <p className="prose-muted px-4 py-3 text-center text-xs">
            Profile portrait · {c.name}
          </p>
        </div>

        <div className="grid gap-4 content-start">
          <Section title="Appearance" body={c.appearance} />
          <Section title="Personality" body={c.personality.join(" · ")} />
          <Section title="Style" body={c.style} />
          <Section title="Voice" body={c.voice} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Section title="Relationship" body={c.relationship} />
        <Section title="Likes" body={c.likes.join(" · ")} />
      </div>

      <div className="mt-4 rounded-2xl border border-card-border bg-card/70 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Limits
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground/90">
          {c.limits.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4 rounded-2xl border border-card-border bg-card/70 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Scene hooks
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {c.scenarioHooks.map((h) => (
            <Link
              key={h}
              href={`/app/chat/${c.id}`}
              className="rounded-full border border-card-border px-3 py-1.5 text-xs text-muted hover:border-accent/40 hover:text-foreground"
            >
              {h}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-accent/25 bg-accent/10 p-5">
        <p className="text-xs uppercase tracking-wide text-muted">Greeting</p>
        <p className="mt-2 text-sm leading-relaxed text-foreground/95">
          “{c.greeting}”
        </p>
        <Link href={`/app/chat/${c.id}`} className="btn-primary mt-4">
          Reply to {c.name}
        </Link>
      </div>
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-card-border bg-card/70 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-foreground/90">{body}</p>
    </div>
  );
}
