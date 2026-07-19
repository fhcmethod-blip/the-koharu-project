/**
 * Loads every companion from companions/json/{id}.json
 * Edit those files to change profile OR image-gen parameters.
 */
import type { Character } from "./types";
import type { CompanionFile, CompanionGeneration } from "./companion-types";
import { toCharacter } from "./companion-types";

import koharu from "../../companions/json/koharu.json";
import alina from "../../companions/json/alina.json";
import mira from "../../companions/json/mira.json";
import nova from "../../companions/json/nova.json";
import elena from "../../companions/json/elena.json";
import raven from "../../companions/json/raven.json";
import yuki from "../../companions/json/yuki.json";
import kai from "../../companions/json/kai.json";
import cassian from "../../companions/json/cassian.json";
import jax from "../../companions/json/jax.json";
import theo from "../../companions/json/theo.json";
import damon from "../../companions/json/damon.json";
import ren from "../../companions/json/ren.json";
import rob from "../../companions/json/rob.json";

const FILES: CompanionFile[] = [
  koharu as CompanionFile,
  alina as CompanionFile,
  mira as CompanionFile,
  nova as CompanionFile,
  elena as CompanionFile,
  raven as CompanionFile,
  yuki as CompanionFile,
  kai as CompanionFile,
  cassian as CompanionFile,
  jax as CompanionFile,
  theo as CompanionFile,
  damon as CompanionFile,
  ren as CompanionFile,
  rob as CompanionFile,
];

const byId = new Map<string, CompanionFile>(FILES.map((c) => [c.id, c]));

export function listCompanionFiles(): CompanionFile[] {
  return [...FILES].sort((a, b) => {
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    return a.order - b.order;
  });
}

export function getCompanionFile(id: string): CompanionFile | undefined {
  return byId.get(id);
}

export function getCompanionGeneration(
  id: string,
): CompanionGeneration | undefined {
  return byId.get(id)?.generation;
}

export function listCharactersFromJson(): Character[] {
  return listCompanionFiles().map(toCharacter);
}

export function getCharacterFromJson(id: string): Character | undefined {
  const f = byId.get(id);
  return f ? toCharacter(f) : undefined;
}

export const companionIds = FILES.map((c) => c.id);
