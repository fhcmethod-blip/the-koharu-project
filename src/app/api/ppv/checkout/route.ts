import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getStripe } from "@/lib/stripe";
import { getPpvItem } from "@/lib/ppv-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ppvItemId } = await req.json();
    if (!ppvItemId) {
      return NextResponse.json({ error: "Missing ppvItemId" }, { status: 400 });
    }

    const item = await getPpvItem(ppvItemId);
    if (!item) {
      return NextResponse.json({ error: "PPV item not found" }, { status: 404 });
    }

    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://thekoharuproject.com";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: item.title,
              description: item.description || undefined,
            },
            unit_amount: item.priceCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "ppv",
        ppvItemId: item.id,
        userId: session.sub,
        userEmail: session.email,
      },
      success_url: `${baseUrl}/app/vault?ppvSuccess=${item.id}`,
      cancel_url: `${baseUrl}/app/vault?ppvCancel=${item.id}`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("PPV checkout error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
