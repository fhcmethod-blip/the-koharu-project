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
import { createUser, findUserByEmail, findUserById } from "@/lib/auth/user-store";
import { normalizeGrantCode, redeemGrantCode } from "@/lib/fansly-store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      email?: string;
      password?: string;
      displayName?: string;
      ageConfirmed?: boolean;
      /** Admin-issued Fansly grant code e.g. KH-XXXX-XXXX */
      grantCode?: string;
    };

    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const displayName = (body.displayName || "").trim();
    const grantCode = normalizeGrantCode(body.grantCode || "");

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

    let grantError: string | null = null;
    if (grantCode) {
      const redeemed = await redeemGrantCode({
        code: grantCode,
        userId: user.id,
      });
      if (!redeemed.ok) {
        grantError = redeemed.error;
      }
    }

    // Reload user so tier cookie matches grant
    const fresh = (await findUserById(user.id)) ?? user;
    const token = await createSessionToken(fresh);
    const publicUser = publicFromStored(fresh);
    const res = NextResponse.json({
      ok: true,
      user: publicUser,
      ...(grantError
        ? {
            grantWarning: `Account created, but code failed: ${grantError}. Log in → Account to redeem a new code.`,
          }
        : {}),
    });
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
