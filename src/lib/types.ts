export type MembershipTier = "free" | "plus" | "vip";

export type User = {
  id: string;
  email: string;
  displayName: string;
  tier: MembershipTier;
  ageVerified: boolean;
  createdAt: string;
};

export type CompanionGender = "female" | "male";

/** Full companion profile used by UI + AI system prompts */
export type Character = {
  id: string;
  name: string;
  /** Display age — always 18+ adults */
  age: number;
  /** For filters + image-gen gender tags */
  gender: CompanionGender;
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
  /** How they speak */
  voice: string;
  /** Relationship framing toward the user */
  relationship: string;
  /** Things they love in chat / RP */
  likes: string[];
  /** Hard limits for this persona (still under global rules) */
  limits: string[];
  /** Example openers / scene seeds shown in UI */
  scenarioHooks: string[];
  /** Extra AI instructions unique to this character */
  aiNotes: string;
  /** Public profile portrait path e.g. /companions/koharu.jpg */
  avatarUrl?: string;
  /** Optional wide cover image */
  coverUrl?: string;
  /** Fooocus look tags (custom companions / creator) */
  look?: string;
  /** Preferred image mode for custom companions */
  imageMode?: "lust" | "pony" | "realistic";
  /** Profile portrait prompt for image gen */
  profilePrompt?: string;
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
