import Stripe from "stripe";
import type { MembershipTier } from "@/lib/types";

export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(key, {
    typescript: true,
  });
}

export type PaidPlan = "plus" | "vip";

export function priceIdForPlan(plan: PaidPlan): string | null {
  if (plan === "plus") {
    return process.env.STRIPE_PRICE_PLUS?.trim() || null;
  }
  return process.env.STRIPE_PRICE_VIP?.trim() || null;
}

export function planFromPriceId(priceId: string | null | undefined): PaidPlan | null {
  if (!priceId) return null;
  const plus = process.env.STRIPE_PRICE_PLUS?.trim();
  const vip = process.env.STRIPE_PRICE_VIP?.trim();
  if (plus && priceId === plus) return "plus";
  if (vip && priceId === vip) return "vip";
  return null;
}

export function tierFromPlan(plan: PaidPlan | null): MembershipTier {
  if (plan === "vip") return "vip";
  if (plan === "plus") return "plus";
  return "free";
}

/** Map active Stripe subscription → membership tier */
export function tierFromSubscription(
  sub: Stripe.Subscription | null | undefined,
): MembershipTier {
  if (!sub || sub.status === "canceled" || sub.status === "unpaid") {
    return "free";
  }
  // active, trialing, past_due → keep paid tier while collecting
  const priceId = sub.items.data[0]?.price?.id;
  const plan = planFromPriceId(priceId);
  if (!plan) return "free";
  if (sub.status === "past_due" || sub.status === "active" || sub.status === "trialing") {
    return tierFromPlan(plan);
  }
  return "free";
}

export function appBaseUrl(req?: Request): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const site = process.env.OPENROUTER_SITE_URL?.trim();
  if (site) return site.replace(/\/$/, "");
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }
  if (req) {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "https";
    if (host) return `${proto}://${host}`;
  }
  return "http://localhost:3000";
}
