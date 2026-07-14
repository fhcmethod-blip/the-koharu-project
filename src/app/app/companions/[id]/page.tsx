"use client";

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/app/characters" className="text-sm text-muted hover:text-foreground">
        ← Companions
      </Link>

      <div
        className={`mt-4 overflow-hidden rounded-3xl border border-card-border bg-gradient-to-br ${c.gradient} p-8`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{c.name}</h1>
          <span className="badge bg-black/30">{c.age}</span>
          {c.isFeatured && (
            <span className="badge bg-accent/35 text-accent-soft">Star</span>
          )}
        </div>
        <p className="mt-2 text-lg text-foreground/95">{c.tagline}</p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-foreground/90">
          {c.bio}
        </p>
        <Link href={`/app/chat/${c.id}`} className="btn-primary mt-6">
          Start chat
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Section title="Personality" body={c.personality.join(" · ")} />
        <Section title="Style" body={c.style} />
        <Section title="Appearance" body={c.appearance} />
        <Section title="Voice" body={c.voice} />
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

      <p className="prose-muted mt-6 text-xs">
        Greeting: “{c.greeting}”
      </p>
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
