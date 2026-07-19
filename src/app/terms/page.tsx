import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter } from "@/components/MarketingFooter";
import { MarketingNav } from "@/components/MarketingNav";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <div className="bg-mesh flex min-h-screen flex-col">
      <MarketingNav />
      <main className="mx-auto max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-xs uppercase tracking-wide text-muted">Legal</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Terms of Service
        </h1>
        <p className="prose-muted mt-2 text-sm">
          Last updated: July 16, 2026 · The Koharu Project (
          thekoharuproject.com)
        </p>

        <div className="prose-muted mt-8 space-y-6 text-sm leading-relaxed text-foreground/85">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              1. Agreement
            </h2>
            <p>
              By accessing or using The Koharu Project (“Service”, “we”, “us”),
              you agree to these Terms of Service and our{" "}
              <Link href="/privacy" className="text-accent-soft hover:underline">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link
                href="/content-policy"
                className="text-accent-soft hover:underline"
              >
                Content Policy
              </Link>
              . If you do not agree, do not use the Service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              2. Adult-only access (18+)
            </h2>
            <p>
              The Service is intended solely for adults who are{" "}
              <strong className="text-foreground">18 years of age or older</strong>{" "}
              (or the age of majority in your jurisdiction, if higher). By
              entering, you represent that you meet this requirement. We may
              refuse or terminate access if we believe you are underage.
            </p>
            <p>
              All AI characters and fictional depictions on the Service are
              adults (18–20). We do not permit underage content of any kind.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              3. What the Service provides
            </h2>
            <p>
              The Service offers adult AI companion chat, optional image
              features, a Companion Creator, and a members-only media vault for
              entitled accounts. Features, companions, and availability may
              change. Some features require a paid membership tier.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              4. Accounts
            </h2>
            <p>
              You are responsible for activity under your account and for
              keeping login details secure. Provide accurate information. You
              may not share, sell, or transfer your account. We may suspend or
              terminate accounts that violate these Terms or our Content Policy.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              5. Memberships &amp; payments
            </h2>
            <p>
              Free, Plus, and VIP tiers may unlock different features (for
              example vault photos or videos). Prices and benefits are shown on
              the Pricing page and may change. Paid plans, when enabled, are
              billed through our payment processor. Refunds, if any, follow the
              processor’s rules and any policy we publish at purchase time.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              6. Acceptable use
            </h2>
            <p>You agree not to:</p>
            <ul className="list-inside list-disc space-y-1 pl-1">
              <li>
                Request, create, or share any sexual content involving minors
                (anyone under 18), including fictional depictions
              </li>
              <li>
                Use the Service for harassment, illegal activity, or to violate
                others’ rights
              </li>
              <li>
                Attempt to reverse engineer, overload, scrape, or bypass
                security or paywalls
              </li>
              <li>
                Impersonate others or misrepresent that AI content is a real
                person without disclosure
              </li>
              <li>
                Upload media you do not have rights to distribute
              </li>
            </ul>
            <p>
              Full rules are in our{" "}
              <Link
                href="/content-policy"
                className="text-accent-soft hover:underline"
              >
                Content Policy
              </Link>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              7. AI content &amp; disclaimers
            </h2>
            <p>
              Chat replies and generated images are produced by automated
              systems. They may be inaccurate, inconsistent, or inappropriate.
              Companions are fictional. Generated media is for personal
              entertainment only. Do not rely on the Service for advice,
              professional guidance, or real-world relationships.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              8. Intellectual property
            </h2>
            <p>
              The Service, branding, site design, and roster companions are
              owned by us or our licensors. You retain rights to content you
              lawfully create, subject to a license for us to host and display
              it as needed to run the Service. You may not copy, resell, or
              redistribute the Service or its media without permission.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              9. Privacy
            </h2>
            <p>
              How we handle information is described in our{" "}
              <Link href="/privacy" className="text-accent-soft hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              10. Disclaimers &amp; limitation of liability
            </h2>
            <p>
              THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT
              WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. TO THE MAXIMUM EXTENT
              PERMITTED BY LAW, WE ARE NOT LIABLE FOR INDIRECT, INCIDENTAL,
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR LOSS OF DATA,
              PROFITS, OR GOODWILL ARISING FROM YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              11. Termination
            </h2>
            <p>
              You may stop using the Service at any time. We may suspend or
              terminate access for violations, abuse, legal risk, or operational
              reasons. Provisions that should survive (including IP, disclaimers,
              and liability limits) will survive termination.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              12. Changes
            </h2>
            <p>
              We may update these Terms. Continued use after changes means you
              accept the updated Terms. Material changes may be noted by updating
              the “Last updated” date above.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              13. Contact
            </h2>
            <p>
              Questions about these Terms:{" "}
              <a
                href="mailto:legal@thekoharuproject.com"
                className="text-accent-soft hover:underline"
              >
                legal@thekoharuproject.com
              </a>
              . For content concerns or takedown requests, see our Content
              Policy.
            </p>
          </section>

          <p className="text-xs text-muted">
            These Terms are a practical starting point for an adult online
            service. They are not a substitute for advice from a lawyer licensed
            in your jurisdiction.
          </p>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
