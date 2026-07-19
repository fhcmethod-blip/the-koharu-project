"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export function AgeGate() {
  const { ready, ageVerified, verifyAge } = useAuth();
  const [agreed, setAgreed] = useState(false);

  if (!ready || ageVerified) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md sm:p-6">
      <div className="glass w-full max-w-md rounded-3xl p-6 text-center shadow-2xl sm:p-8">
        <p className="badge mx-auto mb-4 bg-accent/20 text-accent-soft">
          18+ only
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Enter The Koharu Project
        </h1>
        <p className="prose-muted mt-3 text-sm leading-relaxed">
          This is an <strong className="text-foreground">18+ adult-only</strong>{" "}
          platform with explicit AI chat, NSFW images, and a private vault of
          real photos &amp; videos. All characters are adults (18–20).
        </p>

        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-card-border bg-black/30 px-4 py-3 text-left">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <span className="text-xs leading-relaxed text-muted">
            I confirm I am{" "}
            <strong className="text-foreground">18 or older</strong> (or the
            age of majority where I live), and I agree to the{" "}
            <Link
              href="/terms"
              className="text-accent-soft underline-offset-2 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Terms
            </Link>
            ,{" "}
            <Link
              href="/privacy"
              className="text-accent-soft underline-offset-2 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Privacy Policy
            </Link>
            , and{" "}
            <Link
              href="/content-policy"
              className="text-accent-soft underline-offset-2 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Content Policy
            </Link>
            .
          </span>
        </label>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            className="btn-primary w-full"
            disabled={!agreed}
            onClick={verifyAge}
          >
            I am 18 or older — Enter
          </button>
          <a href="https://www.google.com" className="btn-secondary w-full">
            Leave
          </a>
        </div>
        <p className="prose-muted mt-5 text-[11px] leading-snug">
          By entering you accept our adult content rules. Underage use is
          prohibited.
        </p>
      </div>
    </div>
  );
}
