import type { MembershipTier, User } from "./types";

/**
 * Owner / full-access accounts for The Koharu Project.
 * These always get VIP (vault + all features unlocked).
 * Add more emails as needed (lowercase).
 */
export const OWNER_EMAILS = [
  "fhcmethod@gmail.com",
  // common owner aliases — add yours if different:
  "rob@thekoharuproject.com",
  "admin@thekoharuproject.com",
  "owner@thekoharuproject.com",
].map((e) => e.toLowerCase());

export function isOwnerEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return OWNER_EMAILS.includes(email.trim().toLowerCase());
}

export function isFullAccessUser(user: User | null | undefined): boolean {
  if (!user) return false;
  return isOwnerEmail(user.email) || user.tier === "vip";
}

/** Apply owner privileges (VIP + age verified). */
export function withOwnerAccess(user: User): User {
  if (!isOwnerEmail(user.email)) return user;
  return {
    ...user,
    tier: "vip" as MembershipTier,
    ageVerified: true,
  };
}
