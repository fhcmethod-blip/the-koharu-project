import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { updateUserTier } from "@/lib/auth/user-store";
import { recordPpvPurchase } from "@/lib/ppv-store";
import type { MembershipTier } from "@/lib/types";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-06-24.dahlia",
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err) {
    console.error("Webhook signature validation failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Handle one-time PPV payment
        if (session.mode === "payment" && session.metadata?.type === "ppv") {
          const ppvItemId = session.metadata.ppvItemId;
          const userId = session.metadata.userId;
          const paymentIntentId = session.payment_intent as string;

          if (ppvItemId && userId) {
            await recordPpvPurchase({
              userId,
              ppvItemId,
              stripePaymentId: paymentIntentId || session.id,
              amountCents: session.amount_total || 0
            });
            console.log("PPV purchase recorded", { ppvItemId, userId });
          } else {
            console.error("PPV checkout missing metadata", session.metadata);
          }
          break;
        }

        // Handle subscription checkout
        if (session.mode === "subscription" && session.customer) {
          const customerId =
            typeof session.customer === "string"
              ? session.customer
              : session.customer.id;

          const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: "active",
          });

          if (subscriptions.data.length > 0) {
            const sub = subscriptions.data[0];
            const priceId = sub.items.data[0]?.price.id;
            const userId = session.metadata?.userId;

            if (priceId && userId) {
              const plusPriceId = process.env.STRIPE_PRICE_PLUS || "";
              const vipPriceId = process.env.STRIPE_PRICE_VIP || "";
              
              let subscription_tier: MembershipTier = "free";
              if (priceId === plusPriceId) {
                subscription_tier = "plus";
              } else if (priceId === vipPriceId) {
                subscription_tier = "vip";
              }

              await updateUserTier(userId, subscription_tier);
              console.log("Subscription updated", { userId, subscription_tier });
            }
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.userId;

        if (userId) {
          const priceId = subscription.items?.data[0]?.price?.id;

          if (priceId) {
            const plusPriceId = process.env.STRIPE_PRICE_PLUS || "";
            const vipPriceId = process.env.STRIPE_PRICE_VIP || "";
            
            let subscription_tier: MembershipTier = "free";
            if (priceId === plusPriceId) {
              subscription_tier = "plus";
            } else if (priceId === vipPriceId) {
              subscription_tier = "vip";
            } else if (subscription.status === "canceled") {
              subscription_tier = "free";
            }

            await updateUserTier(userId, subscription_tier);
            console.log("Subscription updated", { userId, subscription_tier });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        if (subscription.metadata?.userId) {
          const userId = subscription.metadata.userId;
          await updateUserTier(userId, "free");
          console.log("Subscription deleted, downgraded to free", { userId });
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
