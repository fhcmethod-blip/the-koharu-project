import { NextRequest, NextResponse } from "next/server";
import { isOwnerEmail } from "@/lib/access";
import { getSessionFromCookies } from "@/lib/auth/session";
import { approveCode, listPending, revokeCode } from "@/lib/fansly-store";

export const runtime = "nodejs";

/**
 * GET /api/fansly/admin
 * List pending Fansly codes waiting for approval (owner only).
 */
export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session || !isOwnerEmail(session.email)) {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }

    const pending = await listPending();
    return NextResponse.json({ ok: true, pending });
  } catch (e) {
    console.error("fansly/admin/list", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not load." }, { status: 500 });
  }
}

/**
 * POST /api/fansly/admin
 * Approve or revoke a code.
 * Body: { action: "approve" | "revoke", code: string }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session || !isOwnerEmail(session.email)) {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }

    const body = (await req.json()) as { action?: string; code?: string };
    const code = (body.code || "").trim().toUpperCase();
    const action = (body.action || "").toLowerCase();

    if (!code) {
      return NextResponse.json({ error: "Missing code." }, { status: 400 });
    }

    if (action === "approve") {
      const result = await approveCode({
        code,
        adminUserId: session.sub,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true, verification: result.verification });
    }

    if (action === "revoke") {
      const result = await revokeCode({ code });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'approve' or 'revoke'." },
      { status: 400 },
    );
  } catch (e) {
    console.error("fansly/admin", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
