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

  useEffect(() => {
    if (ready && user) router.replace("/app");
  }, [ready, user, router]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    signup(email, name);
    router.push("/app");
  }

  return (
    <div className="bg-mesh flex min-h-screen flex-col">
      <MarketingNav />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Create account</h1>
        <p className="prose-muted mt-2 text-sm">
          Free to start. Demo auth stores your session in this browser only.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-muted">Display name</label>
            <input
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What Koharu should call you"
            />
          </div>
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
            Sign up free
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
