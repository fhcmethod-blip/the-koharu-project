import type { MembershipTier } from "@/lib/types";

/** Stored account (never send passwordHash to the client). */
export type StoredUser = {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  tier: MembershipTier;
  ageVerified: boolean;
  createdAt: string;
  updatedAt: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
};

/** Public user shape (matches app User type fields). */
export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  tier: MembershipTier;
  ageVerified: boolean;
  createdAt: string;
  hasStripe?: boolean;
};

export type SessionPayload = {
  sub: string;
  email: string;
  displayName: string;
  tier: MembershipTier;
  ageVerified: boolean;
};

export function toPublicUser(u: StoredUser): PublicUser {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    tier: u.tier,
    ageVerified: u.ageVerified,
    createdAt: u.createdAt,
    hasStripe: Boolean(u.stripeCustomerId),
  };
}
