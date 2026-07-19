import { NextResponse } from "next/server";
import { probeAuthStore } from "@/lib/auth/user-store";
import { stripeEnabled } from "@/lib/stripe";

export const runtime = "nodejs";

/** Public-ish health for auth store (no secrets). */
export async function GET() {
  const store = await probeAuthStore();
  return NextResponse.json({
    ok: store.ok,
    store: store.mode,
    storeError: store.error || null,
    authSecret: Boolean(
      process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim(),
    ),
    databaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
    stripe: stripeEnabled(),
    stripePrices: {
      plus: Boolean(process.env.STRIPE_PRICE_PLUS?.trim()),
      vip: Boolean(process.env.STRIPE_PRICE_VIP?.trim()),
    },
    hint:
      store.mode === "file"
        ? "Local file store. For Vercel production set DATABASE_URL (Neon)."
        : store.ok
          ? "Postgres connected."
          : "Postgres configured but not reachable — check DATABASE_URL.",
  });
}
