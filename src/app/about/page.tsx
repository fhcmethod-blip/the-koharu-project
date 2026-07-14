import type { Metadata } from "next";
import { MarketingFooter } from "@/components/MarketingFooter";
import { MarketingNav } from "@/components/MarketingNav";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="bg-mesh flex min-h-screen flex-col">
      <MarketingNav />
      <main className="mx-auto max-w-3xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="text-4xl font-semibold tracking-tight">About The Koharu Project</h1>
        <div className="prose-muted mt-6 space-y-4 text-base leading-relaxed text-foreground/85">
          <p>
            The Koharu Project is an adult companion platform: AI chat with characters like{" "}
            <strong className="text-foreground">Koharu</strong>, plus a private vault for
            real photos and video reserved for members.
          </p>
          <p>
            The chat layer is designed so you can plug in your own AI API later. The vault
            is built for content you own and have the right to distribute — consented adult
            media only.
          </p>
          <p>
            This site is 18+. Age verification is required before entry. Host it on your
            Cloudflare domain when you&apos;re ready to go live.
          </p>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
