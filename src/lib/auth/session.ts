import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { isOwnerEmail } from "@/lib/access";
import type { MembershipTier } from "@/lib/types";
import type { PublicUser, SessionPayload, StoredUser } from "./types";
import { toPublicUser } from "./types";

export const SESSION_COOKIE = "kohar_session";
const TIER_COOKIE = "kohar_tier";
const EMAIL_COOKIE = "kohar_email";

const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

function secretKey() {
  const raw =
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.FOOOCUS_BRIDGE_SECRET ||
    "";
  if (!raw || raw.length < 16) {
    // Dev fallback — production must set AUTH_SECRET
    return new TextEncoder().encode(
      "kohar-dev-auth-secret-change-me-32b!!",
    );
  }
  return new TextEncoder().encode(raw);
}

export function applyOwnerTier(
  email: string,
  tier: MembershipTier,
): MembershipTier {
  return isOwnerEmail(email) ? "vip" : tier;
}

export async function createSessionToken(
  user: StoredUser | PublicUser,
): Promise<string> {
  const tier = applyOwnerTier(user.email, user.tier);
  const payload: SessionPayload = {
    sub: user.id,
    email: user.email,
    displayName: user.displayName,
    tier,
    ageVerified: user.ageVerified,
  };
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const email = String(payload.email || "").toLowerCase();
    if (!payload.sub || !email) return null;
    const tier = applyOwnerTier(
      email,
      (payload.tier as MembershipTier) || "free",
    );
    return {
      sub: String(payload.sub),
      email,
      displayName: String(payload.displayName || email.split("@")[0] || "Member"),
      tier,
      ageVerified: Boolean(payload.ageVerified ?? true),
    };
  } catch {
    return null;
  }
}

export function sessionToPublic(s: SessionPayload): PublicUser {
  return {
    id: s.sub,
    email: s.email,
    displayName: s.displayName,
    tier: s.tier,
    ageVerified: s.ageVerified,
    createdAt: "",
  };
}

function cookieBase() {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true as const,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SEC,
  };
}

/** Attach session + vault-helper cookies to a response. */
export function setSessionCookies(
  res: NextResponse,
  token: string,
  user: { email: string; tier: MembershipTier },
) {
  const base = cookieBase();
  const tier = applyOwnerTier(user.email, user.tier);
  res.cookies.set(SESSION_COOKIE, token, base);
  // Readable by browser for media <img> tags / vault (not httpOnly)
  res.cookies.set(TIER_COOKIE, tier, {
    ...base,
    httpOnly: false,
  });
  res.cookies.set(EMAIL_COOKIE, encodeURIComponent(user.email), {
    ...base,
    httpOnly: false,
  });
}

export function clearSessionCookies(res: NextResponse) {
  const base = { path: "/", maxAge: 0 };
  res.cookies.set(SESSION_COOKIE, "", { ...base, httpOnly: true });
  res.cookies.set(TIER_COOKIE, "", base);
  res.cookies.set(EMAIL_COOKIE, "", base);
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

export async function getSessionFromRequest(
  req: NextRequest | Request,
): Promise<SessionPayload | null> {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(
    new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`),
  );
  const token = match?.[1] ? decodeURIComponent(match[1]) : null;
  return verifySessionToken(token);
}

export function publicFromStored(u: StoredUser): PublicUser {
  const p = toPublicUser(u);
  return { ...p, tier: applyOwnerTier(p.email, p.tier) };
}
