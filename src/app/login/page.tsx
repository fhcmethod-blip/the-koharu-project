"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { MarketingFooter } from "@/components/MarketingFooter";
import { MarketingNav } from "@/components/MarketingNav";
import { useAuth } from "@/lib/auth";

function LoginForm() {
  const { login, user, ready } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/app";
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (ready && user) router.replace(next);
  }, [ready, user, router, next]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    login(email);
    router.push(next);
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <div>
        <label className="mb-1.5 block text-sm text-muted">Email</label>
        <input
          type="email"
          required
          className="input-field"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
        />
      </div>
      <button type="submit" className="btn-primary w-full">
        Log in
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="bg-mesh flex min-h-screen flex-col">
      <MarketingNav />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="prose-muted mt-2 text-sm">
          Demo login — no password. Uses the account saved in this browser.
        </p>
        <Suspense fallback={<p className="mt-8 text-muted">Loading…</p>}>
          <LoginForm />
        </Suspense>
        <p className="prose-muted mt-6 text-center text-sm">
          New here?{" "}
          <Link href="/signup" className="text-accent-soft hover:underline">
            Sign up
          </Link>
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
