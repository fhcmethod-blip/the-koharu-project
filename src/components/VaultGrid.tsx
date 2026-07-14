"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { canAccess, tierLabels, vaultItems } from "@/lib/vault";

export function VaultGrid() {
  const { user } = useAuth();
  const tier = user?.tier ?? "free";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {vaultItems.map((item) => {
        const unlocked = canAccess(tier, item.tierRequired);
        return (
          <Link
            key={item.id}
            href={`/app/vault/${item.id}`}
            className="group overflow-hidden rounded-2xl border border-card-border bg-card transition hover:border-accent/40"
          >
            <div
              className={`relative aspect-[4/5] bg-gradient-to-br ${item.gradient}`}
            >
              {!unlocked ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 p-4 text-center backdrop-blur-md">
                  <span className="text-2xl" aria-hidden>
                    🔒
                  </span>
                  <p className="mt-2 text-sm font-medium">{item.lockedPreview}</p>
                  <p className="mt-1 text-xs text-muted">
                    Needs {tierLabels[item.tierRequired]}
                  </p>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/75 via-black/20 to-transparent p-4">
                  <span className="badge w-fit bg-white/15 text-white">
                    {item.type === "video"
                      ? `▶ ${item.duration ?? "Video"}`
                      : "Photo set"}
                  </span>
                  <p className="mt-2 text-xs text-white/70">Open gallery →</p>
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium group-hover:text-accent-soft">
                  {item.title}
                </h3>
                <span className="badge shrink-0 bg-white/5 text-muted">
                  {tierLabels[item.tierRequired]}
                </span>
              </div>
              <p className="prose-muted mt-1 text-sm">{item.description}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
