import type { MembershipTier } from "./types";
import { isOwnerEmail } from "./access";
import { canViewMedia } from "./vault";

export type VaultIdentity = {
  email: string;
  tier: MembershipTier;
  isOwner: boolean;
};

export function parseTier(raw: string | null | undefined): MembershipTier {
  const t = (raw || "free").toLowerCase();
  if (t === "vip" || t === "plus" || t === "free") return t;
  return "free";
}

/**
 * Resolve membership from cookies set at login.
 * Prefers signed-session helper cookies (kohar_email / kohar_tier).
 * Optional x-user-* headers are only used if they match the session email
 * (prevents free users spoofing VIP).
 */
export function identityFromRequest(req: {
  headers: { get(name: string): string | null };
}): VaultIdentity {
  const cookie = req.headers.get("cookie") || "";
  const cookieTier = parseTier(
    cookie.match(/(?:^|;\s*)kohar_tier=([^;]+)/)?.[1] || null,
  );
  const cookieEmail = decodeURIComponent(
    (
      cookie.match(/(?:^|;\s*)kohar_email=([^;]+)/)?.[1] || ""
    ).trim(),
  ).toLowerCase();

  const headerEmail = (req.headers.get("x-user-email") || "")
    .trim()
    .toLowerCase();
  const headerTier = parseTier(req.headers.get("x-user-tier"));

  // Only trust header tier if email matches the session cookie email
  let tier = cookieTier;
  if (
    headerEmail &&
    cookieEmail &&
    headerEmail === cookieEmail &&
    headerEmail
  ) {
    const rank = { free: 0, plus: 1, vip: 2 } as const;
    tier = rank[headerTier] >= rank[cookieTier] ? headerTier : cookieTier;
  }

  const resolvedEmail = cookieEmail || headerEmail;
  const owner = isOwnerEmail(resolvedEmail);
  if (owner) tier = "vip";

  return { email: resolvedEmail, tier, isOwner: owner };
}

export function canListKind(
  id: VaultIdentity,
  kind: "library" | "generated" | "videos",
): boolean {
  if (id.isOwner) return true;
  return canViewMedia(id.tier, kind);
}
