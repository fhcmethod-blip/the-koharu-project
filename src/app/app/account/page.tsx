"use client";

import { useAuth } from "@/lib/auth";
import type { MembershipTier } from "@/lib/types";
import { tierLabels } from "@/lib/vault";

const tiers: MembershipTier[] = ["free", "plus", "vip"];

export default function AccountPage() {
  const { user, setTier, logout, isOwner, grantFullAccess } = useAuth();

  if (!user) return null;

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Account</h1>
      <div className="mt-8 space-y-6 rounded-2xl border border-card-border bg-card/70 p-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Display name</p>
          <p className="mt-1 font-medium">{user.displayName}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Email</p>
          <p className="mt-1 font-medium">{user.email}</p>
          {isOwner && (
            <p className="mt-2">
              <span className="badge bg-gold/20 text-gold">Owner · full access</span>
            </p>
          )}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Membership</p>
          <p className="mt-1 text-gold font-semibold">{tierLabels[user.tier]}</p>
          <p className="prose-muted mt-2 text-xs">
            {isOwner
              ? "Your email is on the owner list — VIP is locked on for vault + all features."
              : "Free: chat. Plus: IRL photos. VIP: photos + videos. Switch tiers to test locks, or unlock everything below."}
          </p>
          <ul className="prose-muted mt-2 list-inside list-disc text-xs">
            <li>
              <strong className="text-foreground/80">Free</strong> — chat + locked vault previews
            </li>
            <li>
              <strong className="text-foreground/80">Plus</strong> — all vault photos
            </li>
            <li>
              <strong className="text-foreground/80">VIP</strong> — photos + exclusive videos
            </li>
          </ul>
          {!isOwner && (
            <div className="mt-3 flex flex-wrap gap-2">
              {tiers.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(t)}
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
          )}
          {user.tier !== "vip" && (
            <button
              type="button"
              onClick={grantFullAccess}
              className="btn-primary mt-4 w-full"
            >
              Give this account full access (VIP)
            </button>
          )}
        </div>
        <button type="button" onClick={logout} className="btn-secondary w-full">
          Log out
        </button>
      </div>
    </div>
  );
}
