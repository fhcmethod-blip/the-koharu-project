"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { canAccess, getVaultItem, tierLabels } from "@/lib/vault";

export default function VaultItemPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const item = getVaultItem(id);
  const { user } = useAuth();
  const tier = user?.tier ?? "free";

  if (!item) {
    return (
      <div className="p-10">
        <p>Item not found.</p>
        <Link href="/app/vault" className="text-accent-soft">
          Back to vault
        </Link>
      </div>
    );
  }

  const unlocked = canAccess(tier, item.tierRequired);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/app/vault" className="text-sm text-muted hover:text-foreground">
        ← Vault
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{item.title}</h1>
      <p className="prose-muted mt-2">{item.description}</p>
      <p className="mt-2">
        <span className="badge bg-white/5 text-muted">
          {item.type === "video" ? "Video" : "Photo set"} · {tierLabels[item.tierRequired]}
        </span>
      </p>

      <div
        className={`relative mt-8 aspect-video overflow-hidden rounded-3xl border border-card-border bg-gradient-to-br ${item.gradient}`}
      >
        {unlocked ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <p className="text-lg font-medium">
              {item.type === "video" ? "Video player placeholder" : "Photo gallery placeholder"}
            </p>
            <p className="prose-muted mt-2 max-w-md text-sm">
              Drop your real files into Cloudflare R2 (or any storage), then replace this
              block with signed URLs. Demo shows unlocked state only.
            </p>
            {item.duration && (
              <p className="mt-4 badge bg-black/30 text-white">Duration {item.duration}</p>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 p-6 text-center backdrop-blur-xl">
            <span className="text-3xl">🔒</span>
            <p className="mt-3 text-lg font-medium">Locked — {tierLabels[item.tierRequired]} required</p>
            <p className="prose-muted mt-2 text-sm">
              Your plan: {tierLabels[tier]}. Upgrade in Account to preview unlocks (demo).
            </p>
            <Link href="/app/account" className="btn-primary mt-6">
              Manage membership
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
