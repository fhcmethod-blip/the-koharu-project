"use client";

import { useMemo, useState } from "react";
import { CompanionCard } from "@/components/CompanionCard";
import { companionTags, listCharacters } from "@/lib/characters";

export default function CharactersPage() {
  const [tag, setTag] = useState<string>("all");
  const all = listCharacters();

  const filtered = useMemo(() => {
    if (tag === "all") return all;
    return all.filter((c) => c.tags.includes(tag));
  }, [all, tag]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Companions</h1>
      <p className="prose-muted mt-2 max-w-2xl text-sm">
        <strong className="text-foreground">Koharu</strong> is the star of The Koharu
        Project. Everyone else is a different flavor of the same 18+ playground —
        pick a vibe and start chatting.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTag("all")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            tag === "all"
              ? "bg-accent text-white"
              : "border border-card-border text-muted hover:text-foreground"
          }`}
        >
          All ({all.length})
        </button>
        {companionTags.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTag(t)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              tag === t
                ? "bg-accent text-white"
                : "border border-card-border text-muted hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {filtered.map((c) => (
          <CompanionCard key={c.id} character={c} featured={!!c.isFeatured} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="prose-muted mt-10 text-center text-sm">
          No companions with that tag.
        </p>
      )}
    </div>
  );
}
