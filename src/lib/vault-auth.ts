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

/** Resolve membership from request headers + cookie (img tags use cookie). */
export function identityFromRequest(req: {
  headers: { get(name: string): string | null };
}): VaultIdentity {
  const email = (req.headers.get("x-user-email") || "").trim().toLowerCase();
  const headerTier = parseTier(req.headers.get("x-user-tier"));

  const cookie = req.headers.get("cookie") || "";
  const cookieTier = parseTier(
    cookie.match(/(?:^|;\s*)kohar_tier=([^;]+)/)?.[1] || null,
  );
  const cookieEmail = (
    cookie.match(/(?:^|;\s*)kohar_email=([^;]+)/)?.[1] || ""
  )
    .trim()
    .toLowerCase();

  const resolvedEmail = email || decodeURIComponent(cookieEmail || "");
  const owner = isOwnerEmail(resolvedEmail);
  // Prefer higher of header vs cookie so Account tier switch works immediately
  const rank = { free: 0, plus: 1, vip: 2 } as const;
  const best =
    rank[headerTier] >= rank[cookieTier] ? headerTier : cookieTier;
  const tier: MembershipTier = owner ? "vip" : best;

  return { email: resolvedEmail, tier, isOwner: owner };
}

export function canListKind(
  id: VaultIdentity,
  kind: "library" | "generated" | "videos",
): boolean {
  if (id.isOwner) return true;
  return canViewMedia(id.tier, kind);
}
