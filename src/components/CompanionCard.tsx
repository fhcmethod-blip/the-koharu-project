import Link from "next/link";
import type { Character } from "@/lib/types";

export function CompanionCard({
  character,
  featured = false,
}: {
  character: Character;
  featured?: boolean;
}) {
  return (
    <article
      className={`group overflow-hidden rounded-2xl border border-card-border bg-card/70 transition hover:border-accent/40 ${
        featured ? "sm:col-span-2" : ""
      }`}
    >
      <div className={`bg-gradient-to-br ${character.gradient} p-6 sm:p-8`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold sm:text-2xl">{character.name}</h2>
              <span className="badge bg-black/30 text-foreground/80">
                {character.age}
              </span>
              {character.isFeatured && (
                <span className="badge bg-accent/35 text-accent-soft">Star</span>
              )}
            </div>
            <p className="mt-1 text-sm font-medium text-foreground/95">
              {character.tagline}
            </p>
          </div>
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-2xl font-semibold"
            aria-hidden
          >
            {character.name[0]}
          </div>
        </div>

        <p className="prose-muted mt-3 max-w-2xl text-sm leading-relaxed">
          {character.summary}
        </p>
        <p className="mt-2 max-w-2xl text-sm text-foreground/85">{character.bio}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {character.tags.map((t) => (
            <span key={t} className="badge bg-black/30 text-foreground/85">
              {t}
            </span>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted">Vibe</p>
            <p className="mt-1 text-sm">{character.style}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted">Voice</p>
            <p className="mt-1 text-sm line-clamp-2">{character.voice}</p>
          </div>
        </div>

        {character.scenarioHooks.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] uppercase tracking-wide text-muted">
              Scene ideas
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {character.scenarioHooks.slice(0, 3).map((hook) => (
                <li
                  key={hook}
                  className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs text-foreground/85"
                >
                  {hook}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/app/chat/${character.id}`} className="btn-primary !py-2.5 text-sm">
            Chat with {character.name}
          </Link>
          <Link
            href={`/app/companions/${character.id}`}
            className="btn-secondary !py-2.5 text-sm"
          >
            Full profile
          </Link>
        </div>
      </div>
    </article>
  );
}
