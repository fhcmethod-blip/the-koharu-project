"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

const plans = [
  {
    id: "free" as const,
    name: "Tease",
    price: "$0",
    blurb: "Just a taste",
    features: [
      "AI companion chat",
      "All personas",
      "Teaser previews",
      "Free vault previews",
    ],
    cta: "Start free",
    highlight: false,
  },
  {
    id: "plus" as const,
    name: "Touch",
    price: "$15",
    blurb: "Getting closer",
    features: [
      "Everything in Tease",
      "All IRL photos",
      "Unlimited AI chat",
    ],
    cta: "Get Touch",
    highlight: true,
  },
  {
    id: "vip" as const,
    name: "Claimed",
    price: "$35",
    blurb: "She's yours",
    features: [
      "Everything in Touch",
      "All IRL videos",
      "AI sends explicit images in chat",
      "Early drops + priority content",
      "Highest vault access",
    ],
    cta: "Get Claimed",
    highlight: false,
  },
];

export function PricingCards() {
  const { user, ready } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(plan: "plus" | "vip") {
    setError(null);
    if (!ready) return;
    if (!user) {
      window.location.href = `/login?next=${encodeURIComponent(`/pricing?plan=${plan}`)}`;
      return;
    }
    setBusy(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.url) {
        setError(data.error || "Checkout unavailable. Try again later.");
        setBusy(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error. Please try again.");
      setBusy(null);
    }
  }

  return (
    <div>
      {error && (
        <p className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
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
            {plan.id === "free" ? (
              <Link
                href={user ? "/app" : "/signup"}
                className={`mt-8 block w-full text-center ${
                  plan.highlight ? "btn-primary" : "btn-secondary"
                }`}
              >
                {user ? "Open app" : plan.cta}
              </Link>
            ) : (
              <button
                type="button"
                className={`mt-8 w-full ${
                  plan.highlight ? "btn-primary" : "btn-secondary"
                }`}
                disabled={busy === plan.id}
                onClick={() => void startCheckout(plan.id)}
              >
                {busy === plan.id
                  ? "Redirecting…"
                  : user
                    ? plan.cta
                    : `Log in to ${plan.name}`}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
