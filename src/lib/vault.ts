import type { MembershipTier, VaultItem } from "@/lib/types";
import path from "path";

/** Vault folder on AI drive, organized by tier */
const VAULT_ROOT = process.env.VAULT_ROOT || "D:/koharu-server/vault";

/**
 * Tier-based vault structure (VAULT_ROOT, default D:/koharu-server/vault):
 * vault/
 *   free/
 *     photos/  - Teaser content
 *     videos/  - Teaser videos
 *   plus/
 *     photos/  - Touch tier photos ($15/mo)
 *     videos/
 *   vip/
 *     photos/  - Claimed tier photos ($35/mo)
 *     videos/  - Claimed tier videos
 *   private/   - OWNER ONLY (never sold; not VIP)
 *     photos/
 *     videos/
 */

const tierRank: Record<MembershipTier, number> = {
  free: 0,
  plus: 1,
  vip: 2,
};

/** Map tier to folder name */
export function tierToFolder(tier: MembershipTier): string {
  return tier; // free, plus, vip match folder names
}

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

/** Catalog entries for vault grid (legacy cards; live media also from /api/vault). */
export const vaultItems: VaultItem[] = [];

export function getVaultItem(id: string): VaultItem | undefined {
  return vaultItems.find((i: VaultItem) => i.id === id);
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
