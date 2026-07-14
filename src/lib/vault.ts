import type { MembershipTier, VaultItem } from "./types";

/**
 * Curated featured sets (labels / marketing cards).
 * Real files come from Media Manager → media/{companion}/library|videos
 * and are shown on the main Vault page.
 */
export const vaultItems: VaultItem[] = [
  {
    id: "set-01",
    title: "Morning light",
    description: "Soft bedroom stills — natural light set.",
    type: "photo",
    tierRequired: "plus",
    category: "Photo sets",
    gradient: "from-rose-400/50 to-amber-700/40",
    lockedPreview: "Exclusive photo set",
    companionId: "koharu",
    mediaKind: "library",
  },
  {
    id: "set-02",
    title: "After dark",
    description: "Low-light intimate portraits.",
    type: "photo",
    tierRequired: "plus",
    category: "Photo sets",
    gradient: "from-violet-500/50 to-slate-900/60",
    lockedPreview: "Exclusive photo set",
    companionId: "koharu",
    mediaKind: "library",
  },
  {
    id: "vid-01",
    title: "Closer",
    description: "Short vertical clip — teasing POV.",
    type: "video",
    tierRequired: "vip",
    category: "Videos",
    duration: "2:14",
    gradient: "from-fuchsia-500/45 to-rose-900/50",
    lockedPreview: "VIP video",
    companionId: "koharu",
    mediaKind: "videos",
  },
  {
    id: "vid-02",
    title: "Unfiltered",
    description: "Raw behind-the-scenes + full scene.",
    type: "video",
    tierRequired: "vip",
    category: "Videos",
    duration: "8:42",
    gradient: "from-pink-400/40 to-purple-900/55",
    lockedPreview: "VIP video",
    companionId: "koharu",
    mediaKind: "videos",
  },
  {
    id: "set-03",
    title: "Hotel window",
    description: "Travel set — free teaser stills.",
    type: "photo",
    tierRequired: "free",
    category: "Free previews",
    gradient: "from-sky-400/35 to-indigo-900/50",
    lockedPreview: "Free preview",
    companionId: "koharu",
    mediaKind: "library",
  },
  {
    id: "vid-03",
    title: "Voice note night",
    description: "Audio-led video companion clip.",
    type: "video",
    tierRequired: "plus",
    category: "Videos",
    duration: "4:05",
    gradient: "from-amber-300/35 to-rose-800/50",
    lockedPreview: "Members video",
    companionId: "koharu",
    mediaKind: "videos",
  },
];

const tierRank: Record<MembershipTier, number> = {
  free: 0,
  plus: 1,
  vip: 2,
};

export function canAccess(
  userTier: MembershipTier,
  required: MembershipTier,
): boolean {
  return tierRank[userTier] >= tierRank[required];
}

/** Photos (library) need Plus+; videos need VIP; free-tier files stay free. */
export function mediaTierRequired(
  kind: "library" | "generated" | "videos",
): MembershipTier {
  if (kind === "videos") return "vip";
  if (kind === "generated") return "plus";
  return "plus";
}

export function canViewMedia(
  userTier: MembershipTier,
  kind: "library" | "generated" | "videos",
): boolean {
  return canAccess(userTier, mediaTierRequired(kind));
}

export function getVaultItem(id: string): VaultItem | undefined {
  return vaultItems.find((i) => i.id === id);
}

export const tierLabels: Record<MembershipTier, string> = {
  free: "Free",
  plus: "Plus",
  vip: "VIP",
};

export const tierBlurb: Record<MembershipTier, string> = {
  free: "Teasers & chat",
  plus: "All IRL photo sets",
  vip: "Photos + exclusive videos",
};
