import Image from "next/image";
import Link from "next/link";
import type { Character } from "@/lib/types";

export function CompanionCard({
  character,
  featured = false,
}: {
  character: Character;
  featured?: boolean;
}) {
  const avatar = character.avatarUrl || `/companions/${character.id}.jpg`;
  const isRemoteAvatar = /^https?:\/\//i.test(avatar);

  return (
    <article
      className={`group overflow-hidden rounded-2xl border border-card-border bg-card/80 transition hover:border-accent/40 ${
        featured ? "sm:col-span-2" : ""
      }`}
    >
      <div
        className={`grid ${featured ? "sm:grid-cols-[280px_1fr]" : "grid-cols-1"}`}
      >
        {/* Profile image */}
        <div
          className={`relative overflow-hidden bg-gradient-to-br ${character.gradient} ${
            featured ? "min-h-[280px] sm:min-h-full" : "aspect-[4/5] sm:aspect-[3/4]"
          }`}
        >
          {isRemoteAvatar ? (
            // Cloud / bridge URLs — skip Next optimizer domain allowlist
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt={character.name}
              className="absolute inset-0 h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <Image
              src={avatar}
              alt={character.name}
              fill
              className="object-cover object-top transition duration-500 group-hover:scale-[1.03]"
              sizes={
                featured
                  ? "(max-width: 640px) 100vw, 280px"
                  : "(max-width: 640px) 100vw, 50vw"
              }
              priority={!!character.isFeatured}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:hidden">
            <h2 className="text-xl font-semibold text-white">{character.name}</h2>
            <p className="text-sm text-white/85">{character.tagline}</p>
          </div>
          <div className="absolute right-3 top-3 flex flex-wrap gap-1.5">
            {character.isFeatured && (
              <span className="badge bg-accent/90 text-white">Star</span>
            )}
            <span className="badge bg-black/55 text-white/90">
              {character.gender === "male" ? "Man" : "Woman"}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className={`bg-gradient-to-br ${character.gradient} p-5 sm:p-6`}>
          <div className="hidden sm:block">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold sm:text-2xl">{character.name}</h2>
              <span className="badge bg-black/30 text-foreground/80">
                {character.age}
              </span>
            </div>
            <p className="mt-1 text-sm font-medium text-foreground/95">
              {character.tagline}
            </p>
          </div>
          <div className="mt-1 flex flex-wrap gap-2 sm:mt-0 sm:hidden">
            <span className="badge bg-black/30 text-foreground/80">{character.age}</span>
          </div>

          <p className="prose-muted mt-3 text-sm leading-relaxed">
            {character.summary}
          </p>
          <p className="mt-2 line-clamp-3 text-sm text-foreground/85">
            {character.bio}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {character.tags.slice(0, 5).map((t) => (
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
              <p className="text-[11px] uppercase tracking-wide text-muted">
                Looks
              </p>
              <p className="mt-1 line-clamp-2 text-sm">{character.appearance}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
            <Link
              href={`/app/chat/${character.id}`}
              className="btn-primary w-full !py-3 text-center text-sm sm:w-auto sm:!py-2.5"
            >
              Chat with {character.name}
            </Link>
            <Link
              href={
                character.id.startsWith("custom-")
                  ? "/app/create"
                  : `/app/companions/${character.id}`
              }
              className="btn-secondary w-full !py-3 text-center text-sm sm:w-auto sm:!py-2.5"
            >
              {character.id.startsWith("custom-") ? "Edit look" : "Full profile"}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
