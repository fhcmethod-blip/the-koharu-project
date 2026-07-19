import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import {
  getUserVerifications,
  getUserActiveFanslyTier,
} from "@/lib/fansly-store";

export const runtime = "nodejs";

/**
 * GET /api/fansly/status
 * Returns user's Fansly verifications (active + pending).
 */
export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Not logged in." }, { status: 401 });
    }

    const [verifications, activeTier] = await Promise.all([
      getUserVerifications(session.sub),
      getUserActiveFanslyTier(session.sub),
    ]);

    return NextResponse.json({
      ok: true,
      activeTier,
      verifications: verifications.map((v) => ({
        id: v.id,
        fanslyUsername: v.fanslyUsername,
        code: v.code,
        status: v.status,
        requestedTier: v.requestedTier,
        createdAt: v.createdAt,
        expiresAt: v.expiresAt,
        approvedAt: v.approvedAt,
      })),
    });
  } catch (e) {
    console.error("fansly/status", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: "Could not load Fansly status." },
      { status: 500 },
    );
  }
}
