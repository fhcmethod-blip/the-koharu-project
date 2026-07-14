"use client";

import { useAuth } from "@/lib/auth";

export function AgeGate() {
  const { ready, ageVerified, verifyAge } = useAuth();

  if (!ready || ageVerified) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-6 backdrop-blur-md">
      <div className="glass w-full max-w-md rounded-3xl p-8 text-center shadow-2xl">
        <p className="badge mx-auto mb-4 bg-accent/20 text-accent-soft">18+ only</p>
        <h1 className="text-2xl font-semibold tracking-tight">Enter The Koharu Project</h1>
        <p className="prose-muted mt-3 text-sm leading-relaxed">
          This site contains adult AI chat and members-only IRL photos &amp; video.
          You must be 18 or older to continue.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <button type="button" className="btn-primary w-full" onClick={verifyAge}>
            I am 18 or older
          </button>
          <a
            href="https://www.google.com"
            className="btn-secondary w-full"
          >
            Leave
          </a>
        </div>
        <p className="prose-muted mt-6 text-xs">
          By entering you confirm you are of legal age in your jurisdiction.
        </p>
      </div>
    </div>
  );
}
