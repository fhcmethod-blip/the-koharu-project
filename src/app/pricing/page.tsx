import type { Metadata } from "next";
import { MarketingFooter } from "@/components/MarketingFooter";
import { MarketingNav } from "@/components/MarketingNav";
import { PricingCards } from "@/components/PricingCards";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <div className="bg-mesh flex min-h-screen flex-col">
      <MarketingNav />
      <main className="mx-auto max-w-6xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="text-4xl font-semibold tracking-tight">Pricing</h1>
        <p className="prose-muted mt-3 max-w-2xl">
          Chat free. Unlock the IRL vault when you&apos;re ready. Choose the
          plan that fits how deep you want to go.
        </p>
        <div className="mt-12">
          <PricingCards />
        </div>
        <p className="prose-muted mt-8 text-xs">
          Subscriptions renew monthly. Manage or cancel anytime from Account →
          Manage billing. Secure checkout powered by Stripe.
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
