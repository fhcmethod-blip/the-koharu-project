export type MembershipTier = "free" | "plus" | "vip";

export type User = {
  id: string;
  email: string;
  displayName: string;
  tier: MembershipTier;
  ageVerified: boolean;
  createdAt: string;
};

/** Full companion profile used by UI + AI system prompts */
export type Character = {
  id: string;
  name: string;
  /** Display age — always 18+ adults */
  age: number;
  tagline: string;
  bio: string;
  /** Short one-liner for cards */
  summary: string;
  personality: string[];
  style: string;
  accent: string;
  gradient: string;
  isFeatured?: boolean;
  /** Sort order (lower first). Featured still pins to top in UI. */
  order: number;
  tags: string[];
  greeting: string;
  /** Physical / vibe description for AI immersion */
  appearance: string;
  /** How she speaks */
  voice: string;
  /** Relationship framing toward the user */
  relationship: string;
  /** Things she loves in chat / RP */
  likes: string[];
  /** Hard limits for this persona (still under global rules) */
  limits: string[];
  /** Example openers / scene seeds shown in UI */
  scenarioHooks: string[];
  /** Extra AI instructions unique to this character */
  aiNotes: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  imageUrl?: string;
  createdAt: string;
};

export type VaultItem = {
  id: string;
  title: string;
  description: string;
  type: "photo" | "video";
  tierRequired: MembershipTier;
  category: string;
  duration?: string;
  gradient: string;
  lockedPreview: string;
  /** Companion folder for real files */
  companionId?: string;
  /** Which media bucket to pull from */
  mediaKind?: "library" | "videos" | "generated";
};
