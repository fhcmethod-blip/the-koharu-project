"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { VaultLightbox, type LightboxItem } from "@/components/VaultLightbox";
import { useAuth } from "@/lib/auth";
import { canAccess, getVaultItem, tierLabels } from "@/lib/vault";

export default function VaultItemPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const item = getVaultItem(id);
  const { user, isOwner } = useAuth();
  const tier = user?.tier ?? "free";
  const [files, setFiles] = useState<LightboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lbIndex, setLbIndex] = useState<number | null>(null);

  const unlocked = item
    ? isOwner || canAccess(tier, item.tierRequired)
    : false;
  const companion = item?.companionId || "koharu";
  const kind =
    item?.mediaKind || (item?.type === "video" ? "videos" : "library");

  const load = useCallback(async () => {
    if (!item || !unlocked) {
      setFiles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list: LightboxItem[] = [];
      const res = await fetch(
        `/api/media/list?companion=${encodeURIComponent(companion)}&kind=${kind}`,
        {
          headers: {
            "x-user-email": user?.email || "",
            "x-user-tier": user?.tier || "free",
          },
          credentials: "same-origin",
        },
      );
      const d = await res.json();
      if (res.ok && d.access !== false && !d.locked) {
        const items = d.items || [];
        for (const f of items) {
          if (!f.url) continue;
          list.push({
            id: f.id,
            name: f.name,
            url: f.url,
            mediaType:
              f.mediaType === "video" || kind === "videos" ? "video" : "image",
          });
        }
      }
      setFiles(list);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [item, unlocked, companion, kind, user?.email, user?.tier]);

  useEffect(() => {
    void load();
  }, [load]);

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/app/vault" className="text-sm text-muted hover:text-foreground">
        ← Vault
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{item.title}</h1>
      <p className="prose-muted mt-2">{item.description}</p>
      <p className="mt-2">
        <span className="badge bg-white/5 text-muted">
          {item.type === "video" ? "Video" : "Photo set"} ·{" "}
          {tierLabels[item.tierRequired]}
        </span>
      </p>

      {!unlocked ? (
        <div
          className={`relative mt-8 aspect-video overflow-hidden rounded-3xl border border-card-border bg-gradient-to-br ${item.gradient}`}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 p-6 text-center backdrop-blur-xl">
            <span className="text-3xl">🔒</span>
            <p className="mt-3 text-lg font-medium">
              Locked — {tierLabels[item.tierRequired]} required
            </p>
            <p className="prose-muted mt-2 text-sm">
              Your plan: {tierLabels[tier]}. Content is hidden until you upgrade.
            </p>
            <Link href="/app/account" className="btn-primary mt-6">
              Manage membership
            </Link>
          </div>
        </div>
      ) : loading ? (
        <p className="mt-8 text-muted">Loading media…</p>
      ) : files.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-card-border bg-card/50 p-10 text-center">
          <p className="font-medium">No files in this set yet</p>
          <p className="prose-muted mt-2 text-sm">
            Upload in Media Manager to fill this collection.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {files.map((f, i) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setLbIndex(i)}
              className="aspect-[3/4] overflow-hidden rounded-xl border border-card-border bg-black/40"
            >
              {f.mediaType === "video" ? (
                <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-violet-900/50 to-black p-2">
                  <span className="text-2xl">▶</span>
                  <span className="mt-2 line-clamp-2 text-center text-[10px] text-muted">
                    {f.name}
                  </span>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={f.url}
                  alt={f.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              )}
            </button>
          ))}
        </div>
      )}

      {lbIndex !== null && unlocked && (
        <VaultLightbox
          items={files}
          index={lbIndex}
          onClose={() => setLbIndex(null)}
          onChange={setLbIndex}
        />
      )}
    </div>
  );
}
