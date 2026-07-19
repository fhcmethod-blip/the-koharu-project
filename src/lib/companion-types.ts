import type { Character, CompanionGender } from "./types";

export type ImageMode = "lust" | "pony" | "realistic";

/** Per-companion Fooocus / image generation parameters */
export type CompanionGeneration = {
  mode: ImageMode;
  model: string;
  styles: string[];
  performance: string;
  cfg: number;
  sharpness: number;
  aspect: string;
  imageNumber?: number;
  seed?: number;
  /** Visual fingerprint tags for this companion */
  look: string;
  /** Extra prefix before look / scene */
  promptPrefix: string;
  /** Trailing quality tags */
  promptSuffix: string;
  negative: string;
  /** Dedicated portrait prompt for profile image gens */
  profilePrompt?: string;
  /** Default NSFW scene when user just says "show me" */
  defaultScene?: string;
};

/** Full companion JSON on disk (profile + generation) */
export type CompanionFile = {
  id: string;
  name: string;
  age: number;
  gender: CompanionGender;
  tagline: string;
  summary: string;
  bio: string;
  personality: string[];
  style: string;
  accent: string;
  gradient: string;
  isFeatured?: boolean;
  order: number;
  tags: string[];
  greeting: string;
  appearance: string;
  voice: string;
  relationship: string;
  likes: string[];
  limits: string[];
  scenarioHooks: string[];
  aiNotes: string;
  avatarUrl?: string;
  coverUrl?: string;
  generation: CompanionGeneration;
};

export function toCharacter(c: CompanionFile): Character {
  return {
    id: c.id,
    name: c.name,
    age: c.age,
    gender: c.gender,
    tagline: c.tagline,
    summary: c.summary,
    bio: c.bio,
    personality: c.personality,
    style: c.style,
    accent: c.accent,
    gradient: c.gradient,
    isFeatured: c.isFeatured,
    order: c.order,
    tags: c.tags,
    greeting: c.greeting,
    appearance: c.appearance,
    voice: c.voice,
    relationship: c.relationship,
    likes: c.likes,
    limits: c.limits,
    scenarioHooks: c.scenarioHooks,
    aiNotes: c.aiNotes,
    avatarUrl: c.avatarUrl || `/companions/${c.id}.jpg`,
    coverUrl: c.coverUrl || c.avatarUrl || `/companions/${c.id}.jpg`,
  };
}
