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

type IssuedVer = {
  id: string;
  fanslyUsername: string;
  requestedTier: string;
  code: string;
  createdAt: string;
  expiresAt: string;
};

export default function AdminFanslyPage() {
  const { isOwner } = useAuth();
  const [pending, setPending] = useState<PendingVer[]>([]);
  const [issued, setIssued] = useState<IssuedVer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [issueTier, setIssueTier] = useState<"plus" | "vip">("plus");
  const [issueUsername, setIssueUsername] = useState("");
  const [lastIssued, setLastIssued] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/fansly/admin", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        setPending(data.pending || []);
        setIssued(data.issued || []);
      } else setError(data.error || "Could not load.");
    } catch {
      setError("Network error.");
    }
    setLoading(false);
    setLoaded(true);
  }

  if (!loaded) {
    void loadAll();
  }

  async function createCode() {
    setBusy("issue");
    setError("");
    setLastIssued(null);
    try {
      const res = await fetch("/api/fansly/admin", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "issue",
          tier: issueTier,
          fanslyUsername: issueUsername || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not create code.");
      } else {
        const code = data.verification?.code as string;
        setLastIssued(code);
        await loadAll();
      }
    } catch {
      setError("Network error.");
    }
    setBusy(null);
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
        await loadAll();
      }
    } catch {
      setError("Network error.");
    }
    setBusy(null);
  }

  async function revoke(code: string) {
    if (!confirm(`Revoke / cancel code ${code}?`)) return;
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
        await loadAll();
      }
    } catch {
      setError("Network error.");
    }
    setBusy(null);
  }

  function copyCode(code: string) {
    void navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyDmTemplate(code: string, tier: string) {
    const tierLabel = tier === "vip" ? "Claimed / VIP ($35)" : "Touch / Plus ($15)";
    const text = `Thanks for the Fansly sub 💕 Here's your Koharu site access:

1) Sign up: https://thekoharuproject.com/signup?code=${code}
2) Or open signup and paste this code: ${code}
3) Create your email + password (18+)

That unlocks ${tierLabel} on the site for 30 days. If anything fails, reply here.`;
    void navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          onClick={() => void loadAll()}
        >
          Refresh
        </button>
      </div>
      <p className="mt-2 text-sm text-muted">
        Create a code → DM it on Fansly → fan signs up with the code. Or
        approve codes fans request from Account.
      </p>

      {error && (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* Create grant code */}
      <section className="mt-8 rounded-2xl border border-accent/30 bg-accent/5 p-5">
        <h2 className="text-lg font-medium">Create access code for Fansly sub</h2>
        <p className="prose-muted mt-1 text-xs">
          DM this code to your paid fan. They enter it at signup. One use ·
          must redeem within 14 days · then 30 days of site access.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-muted">Tier</label>
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                className={`rounded-full px-4 py-2 text-sm ${
                  issueTier === "plus"
                    ? "bg-accent text-white"
                    : "border border-card-border text-muted"
                }`}
                onClick={() => setIssueTier("plus")}
              >
                Plus / Touch
              </button>
              <button
                type="button"
                className={`rounded-full px-4 py-2 text-sm ${
                  issueTier === "vip"
                    ? "bg-accent text-white"
                    : "border border-card-border text-muted"
                }`}
                onClick={() => setIssueTier("vip")}
              >
                VIP / Claimed
              </button>
            </div>
          </div>
          <div className="min-w-[10rem] flex-1">
            <label className="block text-xs text-muted">
              Fansly @ (optional note)
            </label>
            <input
              className="input mt-1 w-full"
              placeholder="@theirhandle"
              value={issueUsername}
              onChange={(e) => setIssueUsername(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={busy === "issue"}
            onClick={() => void createCode()}
          >
            {busy === "issue" ? "Creating…" : "Create code"}
          </button>
        </div>

        {lastIssued && (
          <div className="mt-4 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
            <p className="text-sm text-green-200">Code ready — send on Fansly:</p>
            <p className="mt-2 font-mono text-2xl tracking-wider text-white">
              {lastIssued}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => copyCode(lastIssued)}
              >
                {copied ? "Copied!" : "Copy code"}
              </button>
              <button
                type="button"
                className="btn-primary text-xs"
                onClick={() => copyDmTemplate(lastIssued, issueTier)}
              >
                Copy full DM message
              </button>
            </div>
            <p className="prose-muted mt-2 text-[11px]">
              Signup link:{" "}
              <span className="break-all text-accent-soft">
                https://thekoharuproject.com/signup?code={lastIssued}
              </span>
            </p>
          </div>
        )}
      </section>

      {/* Unredeemed issued codes */}
      <section className="mt-10">
        <h2 className="text-base font-medium">Unredeemed codes (you issued)</h2>
        {loading && !loaded && (
          <p className="mt-3 text-sm text-muted">Loading…</p>
        )}
        {!loading && issued.length === 0 && (
          <p className="mt-3 text-sm text-muted">No open grant codes.</p>
        )}
        {issued.length > 0 && (
          <ul className="mt-3 space-y-2">
            {issued.map((v) => (
              <li
                key={v.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-card-border bg-card/70 px-4 py-3"
              >
                <div>
                  <p className="font-mono tracking-wider text-white">{v.code}</p>
                  <p className="text-xs text-muted">
                    {v.requestedTier === "vip" ? "VIP / Claimed" : "Plus / Touch"}
                    {v.fanslyUsername ? ` · @${v.fanslyUsername}` : ""}
                    {" · "}
                    redeem by {new Date(v.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={() => copyDmTemplate(v.code, v.requestedTier)}
                  >
                    Copy DM
                  </button>
                  <button
                    type="button"
                    className="text-xs text-red-300 hover:underline"
                    disabled={busy === v.code}
                    onClick={() => void revoke(v.code)}
                  >
                    Cancel
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Pending fan-request codes */}
      <section className="mt-10">
        <h2 className="text-base font-medium">
          Pending (fan requested from site)
        </h2>
        <p className="prose-muted mt-1 text-xs">
          Fan got a code on Account and DMed it to you — approve after you match
          their Fansly @.
        </p>

        {!loading && pending.length === 0 && (
          <div className="mt-4 rounded-2xl border border-dashed border-card-border bg-card/40 p-6 text-center">
            <p className="text-sm text-foreground/80">No pending codes.</p>
          </div>
        )}

        {pending.length > 0 && (
          <ul className="mt-4 space-y-3">
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
                        {v.requestedTier === "plus"
                          ? "Touch ($15)"
                          : "Claimed ($35)"}
                      </strong>
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
      </section>

      <div className="mt-10 rounded-2xl border border-card-border bg-card/40 p-4 text-xs text-muted">
        <p className="font-medium text-foreground/70">Recommended flow:</p>
        <ol className="mt-2 list-inside list-decimal space-y-1">
          <li>They pay / sub on Fansly</li>
          <li>
            You create a code here (Plus or VIP) and DM it + signup link
          </li>
          <li>
            They open{" "}
            <code className="bg-card-border/50 px-1">
              thekoharuproject.com/signup?code=KH-…
            </code>
          </li>
          <li>They create an account — code unlocks paid tier for 30 days</li>
        </ol>
      </div>
    </div>
  );
}
