"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { MarketingFooter } from "@/components/MarketingFooter";
import { MarketingNav } from "@/components/MarketingNav";
import { useAuth } from "@/lib/auth";

export default function SignupPage() {
  const { signup, user, ready } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [grantCode, setGrantCode] = useState("");
  const [ageOk, setAgeOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    const c = q.get("code") || q.get("grant") || "";
    if (c) setGrantCode(c.trim().toUpperCase());
  }, []);

  useEffect(() => {
    if (ready && user) router.replace("/app");
  }, [ready, user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);

    if (!ageOk) {
      setError("Confirm you are 18 or older to create an account.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setBusy(true);
    const result = await signup(email, name, password, grantCode || undefined);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.grantWarning) {
      // Account exists; still enter app so they can fix code on Account
      sessionStorage.setItem("kohar_grant_warning", result.grantWarning);
    }
    router.push("/app");
  }

  return (
    <div className="bg-mesh flex min-h-screen flex-col">
      <MarketingNav />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">
          Create account
        </h1>
        <p className="prose-muted mt-2 text-sm">
          {grantCode
            ? "Access code detected — sign up to unlock your paid membership."
            : "Free to start, or paste a Fansly access code for paid membership."}
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          {error && (
            <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}
          <div
            className={
              grantCode
                ? "rounded-2xl border border-accent/40 bg-accent/10 p-4"
                : ""
            }
          >
            <label className="mb-1.5 block text-sm text-muted">
              Access code{" "}
              <span className="text-muted/70">(from Fansly DM)</span>
            </label>
            <input
              className="input-field font-mono tracking-wider uppercase"
              value={grantCode}
              onChange={(e) =>
                setGrantCode(e.target.value.toUpperCase().replace(/\s+/g, ""))
              }
              placeholder="KH-XXXX-XXXX"
              autoComplete="off"
              name="grantCode"
              spellCheck={false}
            />
            <p className="prose-muted mt-1 text-xs">
              Paste the code Rob sent you (starts with KH-). Unlocks paid site
              access for 30 days. Leave blank for a free account.
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted">
              Display name
            </label>
            <input
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What Koharu should call you"
              autoComplete="nickname"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted">Password</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted">
              Confirm password
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              className="input-field"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat password"
              minLength={8}
            />
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-card-border bg-black/25 px-3 py-3 text-left">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
              checked={ageOk}
              onChange={(e) => setAgeOk(e.target.checked)}
            />
            <span className="text-xs leading-relaxed text-muted">
              I am 18 or older and agree to the{" "}
              <Link href="/terms" className="text-accent-soft hover:underline">
                Terms
              </Link>
              ,{" "}
              <Link href="/privacy" className="text-accent-soft hover:underline">
                Privacy Policy
              </Link>
              , and{" "}
              <Link
                href="/content-policy"
                className="text-accent-soft hover:underline"
              >
                Content Policy
              </Link>
              .
            </span>
          </label>
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy
              ? "Creating account…"
              : grantCode
                ? "Sign up with access code"
                : "Sign up free"}
          </button>
        </form>
        <p className="prose-muted mt-6 text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-accent-soft hover:underline">
            Log in
          </Link>
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
