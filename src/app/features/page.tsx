import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter } from "@/components/MarketingFooter";
import { MarketingNav } from "@/components/MarketingNav";

export const metadata: Metadata = { title: "Features" };

const features = [
  {
    title: "Koharu-first chat",
    body: "Your main companion is always one tap away — warm, teasing, and built for adult conversation.",
  },
  {
    title: "Multiple personas",
    body: "Switch between Koharu, Mira, Nova, Elena and more — each with a different vibe and greeting.",
  },
  {
    title: "Image moments in chat",
    body: "Ask for a pic during chat. Mock images work now; connect image generation when you plug in your API.",
  },
  {
    title: "IRL vault (locked)",
    body: "A private library for real photos and videos. Free previews, Plus photo sets, VIP video access.",
  },
  {
    title: "Membership tiers",
    body: "Free to explore chat. Upgrade for the vault — designed for subscription billing later.",
  },
  {
    title: "Your domain, your brand",
    body: "Built to deploy on Cloudflare Pages with your custom domain — DNS already in Cloudflare.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="bg-mesh flex min-h-screen flex-col">
      <MarketingNav />
      <main className="mx-auto max-w-6xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="text-4xl font-semibold tracking-tight">Features</h1>
        <p className="prose-muted mt-3 max-w-2xl">
          Everything you need for an NSFW companion product: chat, characters, and a
          members-only media vault for IRL content you own the rights to.
        </p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-card-border bg-card/70 p-6">
              <h2 className="text-lg font-semibold">{f.title}</h2>
              <p className="prose-muted mt-2 text-sm leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-12">
          <Link href="/signup" className="btn-primary">
            Get started
          </Link>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
