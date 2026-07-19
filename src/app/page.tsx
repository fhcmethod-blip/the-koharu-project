import Link from "next/link";
import { MarketingFooter } from "@/components/MarketingFooter";
import { MarketingNav } from "@/components/MarketingNav";
import { featuredCharacter } from "@/lib/characters";

export default function HomePage() {
  return (
    <div className="bg-mesh flex min-h-screen flex-col">
      <MarketingNav />
      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-24">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
            <div>
              <p className="badge bg-accent/15 text-accent-soft">18+ · Explicit AI · Real media vault</p>
              <h1 className="mt-4 text-[2rem] font-semibold leading-tight tracking-tight sm:mt-5 sm:text-5xl sm:leading-[1.1]">
                Meet <span className="text-accent-soft">Koharu</span>.
                <br />
                Chat filthy. Unlock the real thing.
              </h1>
              <p className="prose-muted mt-4 max-w-xl text-base leading-relaxed sm:mt-5 sm:text-lg">
                The Koharu Project is your private NSFW companion platform — seductive AI chat
                with multiple personas + a locked vault of exclusive IRL photos &amp; videos.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
                <Link href="/signup" className="btn-primary w-full sm:w-auto">
                  Create free account
                </Link>
                <Link href="/app/chat/koharu" className="btn-secondary w-full sm:w-auto">
                  Chat with Koharu now
                </Link>
              </div>
              <p className="prose-muted mt-4 text-xs">
                Free to explore. Plus &amp; VIP unlock the full IRL vault.
              </p>
            </div>
            <div
              className={`relative overflow-hidden rounded-[2rem] border border-card-border bg-gradient-to-br ${featuredCharacter.gradient} p-1 shadow-2xl shadow-accent/10`}
            >
              <div className="glass rounded-[1.8rem] p-8">
                <p className="text-sm text-accent-soft">Featured companion</p>
                <h2 className="mt-2 text-3xl font-semibold">{featuredCharacter.name}</h2>
                <p className="prose-muted mt-1">{featuredCharacter.tagline}</p>
                <p className="mt-6 text-sm leading-relaxed text-foreground/90">
                  “{featuredCharacter.greeting}”
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {featuredCharacter.personality.map((p) => (
                    <span key={p} className="badge bg-white/10 text-foreground/80">
                      {p}
                    </span>
                  ))}
                </div>
                <Link
                  href="/app/chat/koharu"
                  className="btn-primary mt-8 w-full sm:w-auto"
                >
                  Start chatting
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Pillars */}
        <section className="border-y border-card-border bg-black/20 py-16">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-3 sm:px-6">
            {[
              {
                title: "Multiple AI personas",
                body: "Soft, dominant, bratty, romantic — switch between companions anytime, or create your own.",
              },
              {
                title: "Private & intimate chat",
                body: "1:1 conversations that feel personal — with photos in chat that stay between you.",
              },
              {
                title: "Locked IRL vault",
                body: "Members-only photos and videos. Free previews, Plus sets, VIP full access.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-card-border bg-card/60 p-6"
              >
                <h3 className="text-lg font-semibold">{card.title}</h3>
                <p className="prose-muted mt-2 text-sm leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight">Ready when you are</h2>
          <p className="prose-muted mx-auto mt-3 max-w-lg">
            Sign up free, meet Koharu, then upgrade when you want the real vault.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="btn-primary">
              Sign up free
            </Link>
            <Link href="/pricing" className="btn-secondary">
              See pricing
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
