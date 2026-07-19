import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import {
  findUserById,
  updateUserBilling,
} from "@/lib/auth/user-store";
import {
  appBaseUrl,
  getStripe,
  priceIdForPlan,
  stripeEnabled,
  type PaidPlan,
} from "@/lib/stripe";

export const runtime = "nodejs";

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
      return NextResponse.json(
        { error: "Log in first to upgrade." },
        { status: 401 },
      );
    }

    const body = (await req.json()) as { plan?: string };
    const plan = (body.plan || "").toLowerCase() as PaidPlan;
    if (plan !== "plus" && plan !== "vip") {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }

    const priceId = priceIdForPlan(plan);
    if (!priceId) {
      return NextResponse.json(
        { error: `Price not configured for ${plan}.` },
        { status: 503 },
      );
    }

    const user = await findUserById(session.sub);
    if (!user) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const stripe = getStripe();
    let customerId = user.stripeCustomerId || undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.displayName,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await updateUserBilling(user.id, { stripeCustomerId: customerId });
    }

    const base = appBaseUrl(req);
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/app/account?upgraded=1`,
      cancel_url: `${base}/pricing?canceled=1`,
      allow_promotion_codes: true,
      metadata: {
        userId: user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          plan,
        },
      },
    });

    if (!checkout.url) {
      return NextResponse.json(
        { error: "Could not start checkout." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, url: checkout.url });
  } catch (e) {
    console.error("stripe checkout", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: "Checkout failed. Please try again." },
      { status: 500 },
    );
  }
}
