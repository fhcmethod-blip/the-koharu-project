import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter } from "@/components/MarketingFooter";
import { MarketingNav } from "@/components/MarketingNav";

export const metadata: Metadata = { title: "Content Policy" };

export default function ContentPolicyPage() {
  return (
    <div className="bg-mesh flex min-h-screen flex-col">
      <MarketingNav />
      <main className="mx-auto max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-xs uppercase tracking-wide text-muted">Legal</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Content &amp; Acceptable Use Policy
        </h1>
        <p className="prose-muted mt-2 text-sm">
          Last updated: July 16, 2026 · The Koharu Project (
          thekoharuproject.com)
        </p>

        <div className="prose-muted mt-8 space-y-6 text-sm leading-relaxed text-foreground/85">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              1. Purpose
            </h2>
            <p>
              The Koharu Project is an adult (18+) platform for fictional AI
              companions and, for members, a private media vault. This policy
              explains what is allowed and what will get content removed or
              accounts restricted.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              2. Hard bans (zero tolerance)
            </h2>
            <p>The following are strictly prohibited:</p>
            <ul className="list-inside list-disc space-y-1 pl-1">
              <li>
                <strong className="text-foreground">Any sexual content involving
                minors</strong>{" "}
                (under 18), including fictional, animated, AI-generated, or
                “aged-down” depictions
              </li>
              <li>
                Child sexual abuse material (CSAM) or attempts to obtain it
              </li>
              <li>
                Content that sexualizes anyone who is, or is portrayed as,
                under 18
              </li>
              <li>
                Real-world threats, terrorism, or instructions for violent crime
              </li>
              <li>
                Non-consensual intimate imagery of real people (including
                “deepnudes” of identifiable real persons without consent)
              </li>
              <li>
                Doxxing, stalking facilitation, or sharing others’ private
                data without consent
              </li>
            </ul>
            <p>
              We will remove such content, ban accounts, and report to
              authorities when required or appropriate.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              3. Allowed adult content
            </h2>
            <p>
              Consensual adult (18+) erotic roleplay, NSFW chat, and adult image
              features between the user and adult fictional companions are
              allowed within the product. All roster and creator characters are
              adults only.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              4. Companion Creator
            </h2>
            <p>
              Custom companions must be adults (18+). Designs that request
              underage, “teen”, schoolchild, or childlike sexualization will be
              blocked or removed. You are responsible for how you use the
              Creator.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              5. IRL vault media
            </h2>
            <p>
              Vault content is for members according to their tier. Uploaders
              (including operators) must only add media they have rights to
              distribute, featuring consenting adults only. Do not upload
              illegal, stolen, or non-consensual material.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              6. Other restricted uses
            </h2>
            <ul className="list-inside list-disc space-y-1 pl-1">
              <li>Spam, malware, or automated abuse of generation systems</li>
              <li>Circumventing paywalls or security controls</li>
              <li>
                Scraping, bulk downloading, or reselling Service content
              </li>
              <li>
                Impersonating real people in a deceptive or harmful way
              </li>
              <li>
                Using the Service to create content that violates applicable law
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              7. Enforcement
            </h2>
            <p>
              We may remove content, rate-limit features, suspend, or terminate
              accounts at our discretion when this policy or our{" "}
              <Link href="/terms" className="text-accent-soft hover:underline">
                Terms
              </Link>{" "}
              are violated. Severe or illegal activity may be reported to law
              enforcement.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              8. Reports &amp; takedowns
            </h2>
            <p>
              To report prohibited content or request removal of material you
              believe is unlawful or non-consensual, email{" "}
              <a
                href="mailto:abuse@thekoharuproject.com"
                className="text-accent-soft hover:underline"
              >
                abuse@thekoharuproject.com
              </a>{" "}
              with:
            </p>
            <ul className="list-inside list-disc space-y-1 pl-1">
              <li>URL or clear description of the content</li>
              <li>Why it violates this policy or the law</li>
              <li>Your contact email for follow-up</li>
            </ul>
            <p>
              For copyright claims, include the standard DMCA-style information
              (work claimed, location of material, your contact info, good-faith
              statement, and signature). Send to{" "}
              <a
                href="mailto:legal@thekoharuproject.com"
                className="text-accent-soft hover:underline"
              >
                legal@thekoharuproject.com
              </a>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              9. Changes
            </h2>
            <p>
              We may update this policy. Continued use of the Service means you
              accept the current version. See also{" "}
              <Link href="/privacy" className="text-accent-soft hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
