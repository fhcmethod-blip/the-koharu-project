import { NextRequest, NextResponse } from "next/server";
import { isOwnerEmail } from "@/lib/access";
import {
  createSessionToken,
  getSessionFromCookies,
  publicFromStored,
  setSessionCookies,
} from "@/lib/auth/session";
import { updateUserTier } from "@/lib/auth/user-store";
import type { MembershipTier } from "@/lib/types";

export const runtime = "nodejs";

/** Owner-only: update membership tier for testing before Stripe. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Not logged in." }, { status: 401 });
    }
    if (!isOwnerEmail(session.email)) {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }

    const body = (await req.json()) as { tier?: string };
    const tier = (body.tier || "").toLowerCase() as MembershipTier;
    if (tier !== "free" && tier !== "plus" && tier !== "vip") {
      return NextResponse.json({ error: "Invalid tier." }, { status: 400 });
    }

    const updated = await updateUserTier(session.sub, tier);
    if (!updated) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const user = publicFromStored(updated);
    const token = await createSessionToken(updated);
    const res = NextResponse.json({ ok: true, user });
    setSessionCookies(res, token, user);
    return res;
  } catch (e) {
    console.error("auth/tier", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not update tier." }, { status: 500 });
  }
}
