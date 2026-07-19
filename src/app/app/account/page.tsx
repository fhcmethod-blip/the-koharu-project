"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import type { MembershipTier } from "@/lib/types";
import { tierLabels } from "@/lib/vault";

const tiers: MembershipTier[] = ["free", "plus", "vip"];

type FanslyVer = {
  id: string;
  fanslyUsername: string;
  code: string;
  status: "pending" | "approved" | "expired" | "revoked";
  requestedTier: MembershipTier;
  createdAt: string;
  expiresAt: string;
  approvedAt: string | null;
};

function AccountBody() {
  const { user, setTier, logout, isOwner, refreshUser } = useAuth();
  const params = useSearchParams();
  const upgraded = params.get("upgraded") === "1";
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(
    upgraded ? "Thanks — membership will unlock in a few seconds." : null,
  );

  // Fansly linking state
  const [showFansly, setShowFansly] = useState(false);
  const [fanslyUsername, setFanslyUsername] = useState("");
  const [fanslyTier, setFanslyTier] = useState<MembershipTier>("plus");
  const [fanslyCode, setFanslyCode] = useState<string | null>(null);
  const [fanslyCodeExpiry, setFanslyCodeExpiry] = useState<string | null>(null);
  const [fanslyVerifications, setFanslyVerifications] = useState<FanslyVer[]>([]);
  const [fanslyActiveTier, setFanslyActiveTier] = useState<MembershipTier | null>(null);
  const [fanslyBusy, setFanslyBusy] = useState(false);
  const [fanslyError, setFanslyError] = useState<string | null>(null);

  useEffect(() => {
    if (!upgraded) return;
    // Refresh session after Stripe redirect (webhook may lag slightly)
    const t = window.setTimeout(() => {
      void refreshUser().then(() =>
        setNote("Membership updated. Enjoy the vault."),
      );
    }, 1500);
    return () => window.clearTimeout(t);
  }, [upgraded, refreshUser]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/fansly/status", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.ok) {
          setFanslyVerifications(data.verifications || []);
          setFanslyActiveTier(data.activeTier || null);
        }
      })
      .catch(() => {});
  }, [user]);

  const fanslyPending = fanslyVerifications.find((v) => v.status === "pending");
  const fanslyActive = fanslyVerifications.find(
    (v) => v.status === "approved" && new Date(v.expiresAt).getTime() > Date.now(),
  );

  async function handleFanslyRequest() {
    setFanslyError(null);
    setFanslyBusy(true);
    try {
      const res = await fetch("/api/fansly/request", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fanslyUsername, tier: fanslyTier }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setFanslyError(data.error || "Could not generate code.");
        setFanslyBusy(false);
        return;
      }
      setFanslyCode(data.code);
      setFanslyCodeExpiry(data.expiresAt);
      // Refresh list
      const s = await fetch("/api/fansly/status", { credentials: "include", cache: "no-store" });
      if (s.ok) {
        const sd = await s.json();
        if (sd.ok) setFanslyVerifications(sd.verifications || []);
      }
    } catch {
      setFanslyError("Network error.");
    } finally {
      setFanslyBusy(false);
    }
  }

  if (!user) return null;

  async function openPortal() {
    setBillingError(null);
    setBillingBusy(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.url) {
        setBillingError(data.error || "Billing portal unavailable.");
        setBillingBusy(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setBillingError("Network error.");
      setBillingBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Account</h1>
      {note && (
        <p className="mt-4 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent-soft">
          {note}
        </p>
      )}
      <div className="mt-8 space-y-6 rounded-2xl border border-card-border bg-card/70 p-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">
            Display name
          </p>
          <p className="mt-1 font-medium">{user.displayName}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Email</p>
          <p className="mt-1 font-medium">{user.email}</p>
          {isOwner && (
            <p className="mt-2">
              <span className="badge bg-gold/20 text-gold">
                Owner · full access
              </span>
            </p>
          )}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">
            Membership
          </p>
          <p className="mt-1 font-semibold text-gold">
            {tierLabels[user.tier]}
          </p>
          <p className="prose-muted mt-2 text-xs">
            Free includes companion chat. Plus unlocks IRL photo sets. VIP
            unlocks the full video vault.
          </p>
          <ul className="prose-muted mt-2 list-inside list-disc text-xs">
            <li>
              <strong className="text-foreground/80">Free</strong> — chat +
              vault previews
            </li>
            <li>
              <strong className="text-foreground/80">Plus</strong> — all vault
              photos
            </li>
            <li>
              <strong className="text-foreground/80">VIP</strong> — photos +
              exclusive videos
            </li>
          </ul>

          {isOwner && (
            <div className="mt-4 rounded-xl border border-gold/30 bg-gold/5 p-3">
              <p className="text-[11px] font-medium text-gold">Owner tools</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {tiers.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => void setTier(t)}
                    className={`rounded-full px-4 py-2 text-sm ${
                      user.tier === t
                        ? "bg-accent text-white"
                        : "border border-card-border text-muted hover:text-foreground"
                    }`}
                  >
                    {tierLabels[t]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isOwner && user.tier === "free" && (
            <Link
              href="/pricing"
              className="btn-primary mt-4 block w-full text-center"
            >
              Upgrade membership
            </Link>
          )}

          {!isOwner && user.tier !== "free" && (
            <button
              type="button"
              className="btn-secondary mt-4 w-full"
              disabled={billingBusy}
              onClick={() => void openPortal()}
            >
              {billingBusy ? "Opening…" : "Manage billing"}
            </button>
          )}

          {billingError && (
            <p className="mt-2 text-xs text-red-300">{billingError}</p>
          )}
        </div>

        {/* Fansly subscription linking */}
        <div className="border-t border-card-border pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">
                Fansly subscriber
              </p>
              <p className="mt-1 text-sm text-foreground/80">
                {fanslyActiveTier
                  ? `Active: ${tierLabels[fanslyActiveTier]} (Fansly)`
                  : "Have a Fansly sub? Link it here."}
              </p>
            </div>
            {fanslyActive && (
              <p className="text-[11px] text-muted">
                Expires {new Date(fanslyActive.expiresAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {fanslyCode && (
            <div className="mt-3 rounded-xl border border-accent/30 bg-accent/10 p-4">
              <p className="text-sm font-medium text-accent-soft">
                DM this code to <strong>@Rob</strong> on Fansly:
              </p>
              <p className="mt-2 font-mono text-lg tracking-wider text-white">
                {fanslyCode}
              </p>
              <p className="prose-muted mt-2 text-xs">
                Expires{" "}
                {fanslyCodeExpiry
                  ? new Date(fanslyCodeExpiry).toLocaleString()
                  : "in 48 hours"}
                . Your tier activates once it&apos;s approved.
              </p>
              <button
                type="button"
                className="mt-3 text-xs text-accent-soft hover:underline"
                onClick={() => {
                  navigator.clipboard?.writeText(fanslyCode);
                }}
              >
                Copy code
              </button>
            </div>
          )}

          {fanslyPending && !fanslyCode && (
            <div className="mt-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
              <p className="text-sm font-medium text-yellow-200">
                Pending code: <span className="font-mono">{fanslyPending.code}</span>
              </p>
              <p className="prose-muted mt-1 text-xs">
                DM this code to <strong>@Rob</strong> on Fansly to activate your{" "}
                {tierLabels[fanslyPending.requestedTier]} membership.
              </p>
            </div>
          )}

          {!fanslyCode && !fanslyPending && (
            <>
              {!showFansly ? (
                <button
                  type="button"
                  className="btn-secondary mt-3 text-sm"
                  onClick={() => setShowFansly(true)}
                >
                  I have a Fansly sub — link it
                </button>
              ) : (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-xs text-muted">
                      Your Fansly username
                    </label>
                    <input
                      type="text"
                      className="input mt-1"
                      placeholder="@yourhandle"
                      value={fanslyUsername}
                      onChange={(e) => setFanslyUsername(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted">
                      Fansly tier you subscribed to
                    </label>
                    <div className="mt-1 flex gap-2">
                      {(["plus", "vip"] as MembershipTier[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFanslyTier(t)}
                          className={`rounded-full px-4 py-2 text-sm ${
                            fanslyTier === t
                              ? "bg-accent text-white"
                              : "border border-card-border text-muted hover:text-foreground"
                          }`}
                        >
                          {tierLabels[t]}
                        </button>
                      ))}
                    </div>
                  </div>
                  {fanslyError && (
                    <p className="text-xs text-red-300">{fanslyError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-primary text-sm"
                      disabled={fanslyBusy || !fanslyUsername}
                      onClick={() => void handleFanslyRequest()}
                    >
                      {fanslyBusy ? "Generating…" : "Get verification code"}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary text-sm"
                      onClick={() => {
                        setShowFansly(false);
                        setFanslyError(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => void logout()}
          className="btn-secondary w-full"
        >
          Log out
        </button>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-10 text-sm text-muted">
          Loading account…
        </div>
      }
    >
      <AccountBody />
    </Suspense>
  );
}
