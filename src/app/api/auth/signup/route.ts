import { NextRequest, NextResponse } from "next/server";
import {
  hashPassword,
  validateEmail,
  validatePassword,
} from "@/lib/auth/passwords";
import {
  createSessionToken,
  publicFromStored,
  setSessionCookies,
} from "@/lib/auth/session";
import { createUser, findUserByEmail } from "@/lib/auth/user-store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      email?: string;
      password?: string;
      displayName?: string;
      ageConfirmed?: boolean;
    };

    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const displayName = (body.displayName || "").trim();

    const emailErr = validateEmail(email);
    if (emailErr) {
      return NextResponse.json({ error: emailErr }, { status: 400 });
    }
    const passErr = validatePassword(password);
    if (passErr) {
      return NextResponse.json({ error: passErr }, { status: 400 });
    }
    if (!body.ageConfirmed) {
      return NextResponse.json(
        { error: "You must confirm you are 18 or older." },
        { status: 400 },
      );
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: "An account with that email already exists. Log in instead." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser({
      email,
      displayName,
      passwordHash,
      ageVerified: true,
    });

    const token = await createSessionToken(user);
    const publicUser = publicFromStored(user);
    const res = NextResponse.json({ ok: true, user: publicUser });
    setSessionCookies(res, token, publicUser);
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Signup failed";
    if (msg === "EMAIL_TAKEN") {
      return NextResponse.json(
        { error: "An account with that email already exists. Log in instead." },
        { status: 409 },
      );
    }
    console.error("signup error", msg);
    return NextResponse.json(
      { error: "Could not create account. Please try again." },
      { status: 500 },
    );
  }
}
