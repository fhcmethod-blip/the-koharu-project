import { NextRequest, NextResponse } from "next/server";
import {
  validateEmail,
  verifyPassword,
} from "@/lib/auth/passwords";
import {
  createSessionToken,
  publicFromStored,
  setSessionCookies,
} from "@/lib/auth/session";
import { findUserByEmail } from "@/lib/auth/user-store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      email?: string;
      password?: string;
    };

    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";

    const emailErr = validateEmail(email);
    if (emailErr) {
      return NextResponse.json({ error: emailErr }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json(
        { error: "Password is required." },
        { status: 400 },
      );
    }

    const user = await findUserByEmail(email);
    // Same message either way — don't leak whether email exists
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const token = await createSessionToken(user);
    const publicUser = publicFromStored(user);
    const res = NextResponse.json({ ok: true, user: publicUser });
    setSessionCookies(res, token, publicUser);
    return res;
  } catch (e) {
    console.error("login error", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: "Could not log in. Please try again." },
      { status: 500 },
    );
  }
}
