import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter } from "@/components/MarketingFooter";
import { MarketingNav } from "@/components/MarketingNav";

export const metadata: Metadata = { title: "Pricing" };

const plans = [
  {
    name: "Free",
    price: "$0",
    blurb: "Explore companions",
    features: ["Unlimited mock chat", "All personas", "Free vault previews", "Image placeholders in chat"],
    cta: "Start free",
    href: "/signup",
    highlight: false,
  },
  {
    name: "Plus",
    price: "$12",
    blurb: "Photo sets unlocked",
    features: ["Everything in Free", "IRL photo sets", "Priority companion access*", "Members badge"],
    cta: "Get Plus",
    href: "/signup",
    highlight: true,
  },
  {
    name: "VIP",
    price: "$29",
    blurb: "Full video vault",
    features: ["Everything in Plus", "All IRL videos", "Early drops", "Highest vault access"],
    cta: "Go VIP",
    href: "/signup",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="bg-mesh flex min-h-screen flex-col">
      <MarketingNav />
      <main className="mx-auto max-w-6xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="text-4xl font-semibold tracking-tight">Pricing</h1>
        <p className="prose-muted mt-3 max-w-2xl">
          Chat free. Unlock the IRL vault when you&apos;re ready. Prices are placeholders —
          wire Stripe or Cloudflare-friendly billing later. Demo tiers can be switched in Account.
        </p>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-3xl border p-7 ${
                plan.highlight
                  ? "border-accent/50 bg-accent/10 shadow-lg shadow-accent/10"
                  : "border-card-border bg-card/70"
              }`}
            >
              <p className="text-sm font-medium text-accent-soft">{plan.name}</p>
              <p className="mt-2 text-4xl font-semibold">
                {plan.price}
                <span className="text-base font-normal text-muted">/mo</span>
              </p>
              <p className="prose-muted mt-1 text-sm">{plan.blurb}</p>
              <ul className="mt-6 space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-success">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={`mt-8 w-full ${plan.highlight ? "btn-primary" : "btn-secondary"}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="prose-muted mt-8 text-xs">
          *Priority features activate when live AI is connected. Payments not processed in this MVP.
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
