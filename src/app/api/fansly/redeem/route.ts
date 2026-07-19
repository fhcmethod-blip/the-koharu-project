import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies, publicFromStored, setSessionCookies, createSessionToken } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/user-store";
import { redeemGrantCode } from "@/lib/fansly-store";

export const runtime = "nodejs";

/**
 * POST /api/fansly/redeem
 * Redeem an admin-issued grant code (from Fansly DM).
 * Body: { code: string }
 * Requires logged-in session.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session?.sub) {
      return NextResponse.json(
        { error: "Log in or sign up first, then redeem your code." },
        { status: 401 },
      );
    }

    const body = (await req.json()) as { code?: string };
    const result = await redeemGrantCode({
      code: body.code || "",
      userId: session.sub,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const user = await findUserById(session.sub);
    if (!user) {
      return NextResponse.json({ ok: true, tier: result.tier });
    }

    const publicUser = publicFromStored(user);
    const token = await createSessionToken(user);
    const res = NextResponse.json({
      ok: true,
      tier: result.tier,
      verification: result.verification,
      user: publicUser,
    });
    setSessionCookies(res, token, publicUser);
    return res;
  } catch (e) {
    console.error("fansly/redeem", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not redeem code." }, { status: 500 });
  }
}
