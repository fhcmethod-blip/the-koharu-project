import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter } from "@/components/MarketingFooter";
import { MarketingNav } from "@/components/MarketingNav";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="bg-mesh flex min-h-screen flex-col">
      <MarketingNav />
      <main className="mx-auto max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-xs uppercase tracking-wide text-muted">Legal</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="prose-muted mt-2 text-sm">
          Last updated: July 16, 2026 · The Koharu Project (
          thekoharuproject.com)
        </p>

        <div className="prose-muted mt-8 space-y-6 text-sm leading-relaxed text-foreground/85">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              1. Overview
            </h2>
            <p>
              This Privacy Policy explains how The Koharu Project (“we”, “us”)
              collects, uses, and shares information when you use our website
              and related services (the “Service”). The Service is{" "}
              <strong className="text-foreground">18+ only</strong>.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              2. Information we collect
            </h2>
            <ul className="list-inside list-disc space-y-1 pl-1">
              <li>
                <strong className="text-foreground/90">Account info</strong> —
                email, display name, and membership tier when you sign up or
                log in
              </li>
              <li>
                <strong className="text-foreground/90">Age confirmation</strong>{" "}
                — that you confirmed you are 18+ to enter the Service
              </li>
              <li>
                <strong className="text-foreground/90">Usage data</strong> —
                pages visited, features used, approximate device/browser info,
                and diagnostic logs needed to run chat and media features
              </li>
              <li>
                <strong className="text-foreground/90">Chat &amp; creator content</strong>{" "}
                — messages and custom companion settings you create so the
                Service can respond and remember your session (storage may be
                on-device and/or on our servers as features evolve)
              </li>
              <li>
                <strong className="text-foreground/90">Payments</strong> — when
                billing is enabled, our payment processor handles card details;
                we typically receive limited billing metadata (e.g. status,
                plan), not full card numbers
              </li>
              <li>
                <strong className="text-foreground/90">Communications</strong> —
                emails or messages you send to support or legal contacts
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              3. How we use information
            </h2>
            <ul className="list-inside list-disc space-y-1 pl-1">
              <li>Provide chat, images, vault, and account features</li>
              <li>Enforce 18+ access and our Content Policy</li>
              <li>Process memberships and prevent fraud or abuse</li>
              <li>Improve reliability, safety, and user experience</li>
              <li>Comply with law and respond to lawful requests</li>
              <li>Communicate about the Service (e.g. important notices)</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              4. AI processing
            </h2>
            <p>
              Chat messages and related prompts may be sent to third-party AI
              providers so companions can reply and generate images. Do not
              share information in chat that you are not comfortable processing
              for that purpose. Providers process data under their own terms
              and our contractual arrangements with them.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              5. Cookies &amp; local storage
            </h2>
            <p>
              We use cookies, local storage, and similar technologies for age
              confirmation, session preferences, membership flags, and chat
              history on your device. You can clear browser storage; doing so
              may log you out or reset local-only data.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              6. Sharing
            </h2>
            <p>We may share information with:</p>
            <ul className="list-inside list-disc space-y-1 pl-1">
              <li>
                Service providers (hosting, AI APIs, payments, analytics,
                security) who process data for us
              </li>
              <li>
                Authorities when required by law or to protect rights, safety,
                or the Service
              </li>
              <li>
                A buyer or successor if we are involved in a merger, sale, or
                similar transaction
              </li>
            </ul>
            <p>We do not sell your personal information as a product list.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              7. Retention
            </h2>
            <p>
              We keep information as long as needed to provide the Service,
              comply with law, resolve disputes, and enforce agreements. You may
              request deletion of account data where applicable; some records
              may be retained for legal or security reasons.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              8. Security
            </h2>
            <p>
              We use reasonable technical and organizational measures to protect
              information. No method of transmission or storage is 100% secure.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              9. Children
            </h2>
            <p>
              The Service is not directed to anyone under 18. We do not
              knowingly collect personal information from minors. If you believe
              a minor has used the Service, contact us and we will take
              appropriate steps.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              10. Your choices
            </h2>
            <p>
              Depending on your location, you may have rights to access,
              correct, delete, or export personal data, or to object to certain
              processing. Contact us to make a request. You can also stop using
              the Service and clear browser data.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              11. International users
            </h2>
            <p>
              The Service may be hosted or processed in the United States or
              other countries. By using it, you understand your information may
              be transferred to those locations.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              12. Changes
            </h2>
            <p>
              We may update this Privacy Policy. Continued use after changes
              means you accept the updated policy. Check the “Last updated”
              date.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              13. Contact
            </h2>
            <p>
              Privacy questions:{" "}
              <a
                href="mailto:privacy@thekoharuproject.com"
                className="text-accent-soft hover:underline"
              >
                privacy@thekoharuproject.com
              </a>
              . Also see our{" "}
              <Link href="/terms" className="text-accent-soft hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/content-policy"
                className="text-accent-soft hover:underline"
              >
                Content Policy
              </Link>
              .
            </p>
          </section>

          <p className="text-xs text-muted">
            This policy is a practical template for an adult online service. It
            is not legal advice. Consult counsel for your jurisdiction and
            business model.
          </p>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
