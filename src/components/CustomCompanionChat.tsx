"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChatWindow } from "@/components/ChatWindow";
import {
  customToCharacter,
  getCustomCompanion,
} from "@/lib/companion-creator";
import type { Character } from "@/lib/types";

/**
 * Loads a custom-* companion from localStorage and opens ChatWindow.
 * Server roster does not have these IDs.
 */
export function CustomCompanionChat({ id }: { id: string }) {
  const [character, setCharacter] = useState<Character | null | undefined>(
    undefined,
  );

  useEffect(() => {
    const saved = getCustomCompanion(id);
    setCharacter(saved ? customToCharacter(saved) : null);
  }, [id]);

  if (character === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted">
        Loading your companion…
      </div>
    );
  }

  if (!character) {
    return (
      <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-xl font-semibold">Companion not found</h1>
        <p className="prose-muted text-sm">
          This custom companion is saved on the device where you created them.
          Create a new one anytime in Creator.
        </p>
        <Link href="/app/create" className="btn-primary">
          Create companion
        </Link>
        <Link href="/app/characters" className="btn-secondary text-sm">
          Browse companions
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-3 border-b border-card-border px-3 py-1.5 text-xs text-muted">
        <Link
          href="/app/create"
          className="inline-flex min-h-10 items-center font-medium text-accent-soft"
        >
          ← Creator
        </Link>
        <span className="min-h-10 content-center truncate text-muted">
          {character.name}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ChatWindow character={character} />
      </div>
    </div>
  );
}
