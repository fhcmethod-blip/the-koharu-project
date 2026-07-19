import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/user-store";
import { appBaseUrl, getStripe, stripeEnabled } from "@/lib/stripe";

export const runtime = "nodejs";

/** Stripe Customer Portal — cancel / update payment method. */
export async function POST(req: NextRequest) {
  try {
    if (!stripeEnabled()) {
      return NextResponse.json(
        { error: "Payments are not configured yet." },
        { status: 503 },
      );
    }

    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Log in first." }, { status: 401 });
    }

    const user = await findUserById(session.sub);
    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing account yet. Subscribe first." },
        { status: 400 },
      );
    }

    const stripe = getStripe();
    const base = appBaseUrl(req);
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${base}/app/account`,
    });

    return NextResponse.json({ ok: true, url: portal.url });
  } catch (e) {
    console.error("stripe portal", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: "Could not open billing portal." },
      { status: 500 },
    );
  }
}
