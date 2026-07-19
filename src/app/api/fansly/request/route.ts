import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { requestCode } from "@/lib/fansly-store";
import type { MembershipTier } from "@/lib/types";

export const runtime = "nodejs";

/**
 * POST /api/fansly/request
 * User requests a Fansly verification code.
 * Body: { fanslyUsername: string, tier: "plus" | "vip" }
 * Returns: { ok: true, code: string, expiresAt: string } | { ok: false, error }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Not logged in." },
        { status: 401 },
      );
    }

    const body = (await req.json()) as {
      fanslyUsername?: string;
      tier?: string;
    };
    const username = (body.fanslyUsername || "").trim().toLowerCase();
    const tier = (body.tier || "").toLowerCase() as MembershipTier;

    if (!username || username.length < 2 || username.length > 40) {
      return NextResponse.json(
        { ok: false, error: "Enter your Fansly username." },
        { status: 400 },
      );
    }
    if (tier !== "plus" && tier !== "vip") {
      return NextResponse.json(
        { ok: false, error: "Fansly tier must be Plus or VIP." },
        { status: 400 },
      );
    }

    const result = await requestCode({
      userId: session.sub,
      fanslyUsername: username,
      tier,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 409 });
    }

    return NextResponse.json({
      ok: true,
      code: result.verification.code,
      expiresAt: result.verification.expiresAt,
      requestedTier: result.verification.requestedTier,
    });
  } catch (e) {
    console.error("fansly/request", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { ok: false, error: "Could not generate code." },
      { status: 500 },
    );
  }
}
