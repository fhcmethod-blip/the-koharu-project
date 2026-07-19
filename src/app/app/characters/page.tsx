"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CompanionCard } from "@/components/CompanionCard";
import { companionTags, listCharacters } from "@/lib/characters";
import {
  customToCharacter,
  loadCustomCompanions,
  type SavedCustomCompanion,
} from "@/lib/companion-creator";

type GenderFilter = "all" | "female" | "male";

export default function CharactersPage() {
  const [tag, setTag] = useState<string>("all");
  const [gender, setGender] = useState<GenderFilter>("all");
  const [customs, setCustoms] = useState<SavedCustomCompanion[]>([]);
  const all = listCharacters();

  useEffect(() => {
    setCustoms(loadCustomCompanions());
  }, []);

  const filtered = useMemo(() => {
    let list = all;
    if (gender !== "all") list = list.filter((c) => c.gender === gender);
    if (tag !== "all") list = list.filter((c) => c.tags.includes(tag));
    return list;
  }, [all, tag, gender]);

  const girls = all.filter((c) => c.gender === "female").length;
  const guys = all.filter((c) => c.gender === "male").length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Companions</h1>
          <p className="prose-muted mt-2 max-w-2xl text-sm">
            <strong className="text-foreground">{girls} women</strong> and{" "}
            <strong className="text-foreground">{guys} men</strong> — same 18+
            playground. Pick a vibe and start chatting.
          </p>
        </div>
        <a href="/app/create" className="btn-primary text-sm">
          + Create companion
        </a>
      </div>

      {/* Gender filters */}
      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            ["all", `All (${all.length})`],
            ["female", `Women (${girls})`],
            ["male", `Men (${guys})`],
          ] as [GenderFilter, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setGender(id)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              gender === id
                ? "bg-accent text-white"
                : "border border-card-border text-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tag filters */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTag("all")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            tag === "all"
              ? "bg-white/15 text-foreground"
              : "border border-card-border text-muted hover:text-foreground"
          }`}
        >
          All tags
        </button>
        {companionTags.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTag(t)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              tag === t
                ? "bg-white/15 text-foreground"
                : "border border-card-border text-muted hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {customs.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Your creations</h2>
            <Link href="/app/create" className="text-xs text-accent-soft">
              Create more
            </Link>
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {customs.map((c) => (
              <CompanionCard key={c.id} character={customToCharacter(c)} />
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {filtered.map((c) => (
          <CompanionCard key={c.id} character={c} featured={!!c.isFeatured} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="prose-muted mt-10 text-center text-sm">
          No companions match that filter.
        </p>
      )}
    </div>
  );
}
