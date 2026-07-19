import { NextResponse } from "next/server";
import {
  getSessionFromCookies,
  publicFromStored,
  sessionToPublic,
  createSessionToken,
  setSessionCookies,
} from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/user-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ user: null });
    }

    // Refresh tier from DB when possible (owner list / tier changes)
    const stored = await findUserById(session.sub);
    if (stored) {
      const user = publicFromStored(stored);
      const token = await createSessionToken(stored);
      const res = NextResponse.json({ user });
      setSessionCookies(res, token, user);
      return res;
    }

    // Session valid but user missing from store (e.g. file wiped) — still honor JWT
    return NextResponse.json({ user: sessionToPublic(session) });
  } catch (e) {
    console.error("auth/me", e instanceof Error ? e.message : e);
    return NextResponse.json({ user: null });
  }
}
