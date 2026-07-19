"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";

type PendingVer = {
  id: string;
  userId: string;
  fanslyUsername: string;
  requestedTier: string;
  code: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  userEmail?: string;
  userDisplayName?: string;
};

export default function AdminFanslyPage() {
  const { user, isOwner } = useAuth();
  const [pending, setPending] = useState<PendingVer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="bg-red-950 border border-red-800 rounded-lg p-8 text-center">
          <h1 className="text-xl font-bold text-red-400">Access Denied</h1>
          <p className="text-gray-400 mt-2">Owner only.</p>
        </div>
      </div>
    );
  }

  async function loadPending() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/fansly/admin", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) setPending(data.pending);
      else setError(data.error || "Could not load.");
    } catch {
      setError("Network error.");
    }
    setLoading(false);
    setLoaded(true);
  }

  if (!loaded) {
    loadPending();
  }

  async function approve(code: string) {
    setBusy(code);
    setError("");
    try {
      const res = await fetch("/api/fansly/admin", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Approval failed.");
      } else {
        await loadPending();
      }
    } catch {
      setError("Network error.");
    }
    setBusy(null);
  }

  async function revoke(code: string) {
    if (!confirm(`Revoke code ${code}?`)) return;
    setBusy(code);
    setError("");
    try {
      const res = await fetch("/api/fansly/admin", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Revoke failed.");
      } else {
        await loadPending();
      }
    } catch {
      setError("Network error.");
    }
    setBusy(null);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Fansly Verifications
        </h1>
        <button
          type="button"
          className="btn-secondary text-sm"
          onClick={() => void loadPending()}
        >
          Refresh
        </button>
      </div>
      <p className="mt-2 text-sm text-muted">
        Approve DM codes from your Fansly subscribers to grant site access.
        Each approval grants 30 days of the matching tier.
      </p>

      {error && (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading && !loaded && (
        <p className="mt-8 text-sm text-muted">Loading pending codes…</p>
      )}

      {!loading && pending.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-card-border bg-card/40 p-8 text-center">
          <p className="text-sm text-foreground/80">
            No pending verification codes.
          </p>
          <p className="prose-muted mt-1 text-xs">
            When a Fan DMs you a code, approve it here.
          </p>
        </div>
      )}

      {pending.length > 0 && (
        <ul className="mt-6 space-y-3">
          {pending.map((v) => (
            <li
              key={v.id}
              className="rounded-2xl border border-card-border bg-card/70 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-mono text-lg tracking-wider text-white">
                    {v.code}
                  </p>
                  <p className="mt-1 text-sm">
                    <span className="text-muted">Fansly:</span>{" "}
                    <strong>@{v.fanslyUsername}</strong>
                  </p>
                  {v.userDisplayName && (
                    <p className="text-xs text-muted">
                      Site: {v.userDisplayName} ({v.userEmail})
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted">
                    Wants{" "}
                    <strong className="text-gold">
                      {v.requestedTier === "plus" ? "Touch ($15)" : "Claimed ($35)"}
                    </strong>
                  </p>
                  <p className="mt-1 text-[11px] text-muted">
                    Requested{" "}
                    {new Date(v.createdAt).toLocaleString()} · expires{" "}
                    {new Date(v.expiresAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-primary !py-2 text-sm"
                  disabled={busy === v.code}
                  onClick={() => void approve(v.code)}
                >
                  {busy === v.code ? "…" : "Approve"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 rounded-2xl border border-card-border bg-card/40 p-4 text-xs text-muted">
        <p className="font-medium text-foreground/70">How it works:</p>
        <ol className="mt-2 list-inside list-decimal space-y-1">
          <li>
            User clicks "Link Fansly sub" on account page → gets a code like{" "}
            <code className="bg-card-border/50 px-1">KH-XXXX-XXXX</code>
          </li>
          <li>
            User DMs that code to you on Fansly from their Fansly account
          </li>
          <li>
            You match the Fansly username in the DM to the list above and click Approve
          </li>
          <li>
            User's site tier upgrades to the matching Fansly tier for 30 days
          </li>
          <li>
            Next renewal: user requests a new code, cycle repeats
          </li>
        </ol>
      </div>
    </div>
  );
}
