/**
 * Companion roster — loaded from companions/json/{id}.json
 * Edit those JSON files for profile text AND image-gen parameters.
 */
import type { Character } from "./types";
import {
  getCharacterFromJson,
  listCharactersFromJson,
} from "./companion-registry";

export const characters: Character[] = listCharactersFromJson();

export function getCharacter(id: string): Character | undefined {
  return getCharacterFromJson(id);
}

export function listCharacters(): Character[] {
  return listCharactersFromJson();
}

export function listByTag(tag: string): Character[] {
  return listCharacters().filter((c) => c.tags.includes(tag));
}

export function listByGender(gender: "female" | "male"): Character[] {
  return listCharacters().filter((c) => c.gender === gender);
}

export const featuredCharacter: Character =
  characters.find((c) => c.isFeatured) ?? characters[0];

export const companionTags: string[] = Array.from(
  new Set(characters.flatMap((c) => c.tags)),
).sort();
