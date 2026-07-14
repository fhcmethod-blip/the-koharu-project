"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { VaultGrid } from "@/components/VaultGrid";
import { VaultLightbox, type LightboxItem } from "@/components/VaultLightbox";
import { useAuth } from "@/lib/auth";
import { characters } from "@/lib/characters";
import {
  canViewMedia,
  mediaTierRequired,
  tierBlurb,
  tierLabels,
} from "@/lib/vault";
import {
  localVaultList,
  type LocalVaultItem,
} from "@/lib/vault-local-store";

type MediaFile = {
  id: string;
  name: string;
  url: string;
  mediaType?: string;
  kind?: string;
  source?: string;
  size?: number;
};

export default function VaultPage() {
  const { user, isOwner } = useAuth();
  const tier = user?.tier ?? "free";
  const [companion, setCompanion] = useState("koharu");
  const [photos, setPhotos] = useState<MediaFile[]>([]);
  const [videos, setVideos] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageNote, setStorageNote] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{
    items: LightboxItem[];
    index: number;
  } | null>(null);

  const canPhotos = canViewMedia(tier, "library");
  const canVideos = canViewMedia(tier, "videos");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let serverPhotos: MediaFile[] = [];
      let serverVideos: MediaFile[] = [];
      let serverOk = false;

      try {
        const res = await fetch(
          `/api/media/list?companion=${encodeURIComponent(companion)}&kind=all`,
          {
            headers: {
              "x-user-email": user?.email || "",
              "x-user-tier": user?.tier || "free",
            },
          },
        );
        const d = await res.json();
        if (res.ok) {
          serverOk = true;
          serverPhotos = d.items?.library || [];
          serverVideos = d.items?.videos || [];
        }
      } catch {
        /* offline / vercel empty */
      }

      let local: LocalVaultItem[] = [];
      // Prefer cloud only — browser-only files do NOT play on phones
      try {
        local = await localVaultList(companion, "all");
      } catch {
        local = [];
      }

      setPhotos(serverPhotos);
      setVideos(serverVideos);

      if (serverOk && (serverPhotos.length || serverVideos.length)) {
        setStorageNote(
          "Cloud vault — these files play on phones and computers.",
        );
      } else if (serverOk) {
        setStorageNote(
          "Cloud vault is empty. Owner: Media Manager → upload video (must finish % progress). Files then play everywhere.",
        );
      } else if (local.length > 0) {
        setStorageNote(
          "Only device-local files found (not on cloud). Re-upload in Media Manager so phones can play them.",
        );
        // Show local only as last resort on this device
        setPhotos(local.filter((i) => i.kind === "library"));
        setVideos(local.filter((i) => i.kind === "videos"));
      } else {
        setStorageNote(
          "No media yet. Upload via Media Manager (VIP/owner) to cloud storage.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [companion, user?.email, user?.tier]);

  useEffect(() => {
    void load();
  }, [load]);

  const photoItems: LightboxItem[] = useMemo(
    () =>
      photos.map((p) => ({
        id: p.id,
        name: p.name,
        url: p.url,
        mediaType: "image" as const,
      })),
    [photos],
  );

  const videoItems: LightboxItem[] = useMemo(
    () =>
      videos.map((v) => ({
        id: v.id,
        name: v.name,
        url: v.url,
        mediaType: "video" as const,
      })),
    [videos],
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">IRL Vault</h1>
          <p className="prose-muted mt-2 max-w-xl text-sm">
            Real photos &amp; videos of your companions. Locked by membership —
            Free teasers, Plus for photos, VIP for video.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="input-field !w-auto !py-2 text-sm"
            value={companion}
            onChange={(e) => setCompanion(e.target.value)}
            aria-label="Companion"
          >
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {(isOwner || user?.tier === "vip") && (
            <Link href="/app/media" className="btn-primary !py-2 text-sm">
              Manage media
            </Link>
          )}
          <div className="rounded-2xl border border-card-border bg-card/70 px-4 py-3 text-sm">
            <p className="text-muted">Your access</p>
            <p className="font-semibold text-gold">
              {user ? tierLabels[user.tier] : "Free"}
            </p>
            <p className="text-[11px] text-muted">
              {user ? tierBlurb[user.tier] : tierBlurb.free}
            </p>
          </div>
        </div>
      </div>

      {/* Tier banner */}
      {!canPhotos && (
        <div className="mt-6 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm">
          <p className="font-medium text-gold">Photos locked</p>
          <p className="prose-muted mt-1">
            Upgrade to <strong>Plus</strong> or <strong>VIP</strong> to open IRL
            photo sets.{" "}
            <Link href="/app/account" className="text-accent-soft underline">
              Account
            </Link>
          </p>
        </div>
      )}
      {canPhotos && !canVideos && (
        <div className="mt-6 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm">
          <p className="font-medium text-accent-soft">Videos are VIP</p>
          <p className="prose-muted mt-1">
            You can view photos. Video clips need VIP.{" "}
            <Link href="/app/account" className="underline">
              Upgrade
            </Link>
          </p>
        </div>
      )}

      {storageNote && (
        <p className="prose-muted mt-4 text-xs">{storageNote}</p>
      )}

      {/* Photos */}
      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold">Photos</h2>
            <p className="prose-muted text-sm">
              Requires {tierLabels[mediaTierRequired("library")]}
              {photos.length ? ` · ${photos.length} file(s)` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="text-xs text-muted hover:text-foreground"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-muted">Loading vault…</p>
        ) : photos.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-card-border bg-card/40 p-8 text-center">
            <p className="font-medium">No photos yet</p>
            <p className="prose-muted mt-2 text-sm">
              Owner: upload in{" "}
              <Link href="/app/media" className="text-accent-soft hover:underline">
                Media Manager
              </Link>{" "}
              or drop files into{" "}
              <code className="text-accent-soft">media/{companion}/library/</code>
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => {
                  if (canPhotos) setLightbox({ items: photoItems, index: i });
                }}
                className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-card-border bg-card text-left"
              >
                {canPhotos ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.url}
                    alt={img.name}
                    className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-rose-950/90 via-fuchsia-950/70 to-black p-3 text-center">
                    <span className="text-xl">🔒</span>
                    <p className="mt-2 text-xs text-muted">
                      {tierLabels[mediaTierRequired("library")]}
                    </p>
                  </div>
                )}
                {img.source === "local" && canPhotos && (
                  <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white/80">
                    device
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Videos */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold">Videos</h2>
        <p className="prose-muted text-sm">
          Requires {tierLabels[mediaTierRequired("videos")]}
          {videos.length ? ` · ${videos.length} file(s)` : ""}
        </p>

        {loading ? null : videos.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-card-border bg-card/40 p-6 text-center text-sm text-muted">
            Upload MP4/WEBM in Media Manager → Videos
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {videos.map((vid, i) => (
              <div
                key={vid.id}
                className="overflow-hidden rounded-2xl border border-card-border bg-card"
              >
                {canVideos ? (
                  <button
                    type="button"
                    className="block w-full"
                    onClick={() =>
                      setLightbox({ items: videoItems, index: i })
                    }
                  >
                    <video
                      src={vid.url}
                      className="aspect-video w-full bg-black object-cover"
                      preload="metadata"
                      muted
                      playsInline
                    />
                  </button>
                ) : (
                  <div className="flex aspect-video flex-col items-center justify-center bg-gradient-to-br from-violet-950/80 to-black text-center">
                    <span className="text-2xl">🔒</span>
                    <p className="mt-2 text-sm text-muted">
                      {tierLabels[mediaTierRequired("videos")]} video
                    </p>
                    <Link
                      href="/app/account"
                      className="mt-3 text-xs text-accent-soft underline"
                    >
                      Upgrade membership
                    </Link>
                  </div>
                )}
                <p className="truncate px-3 py-2 text-xs text-muted">
                  {vid.name}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Featured sets */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold">Featured sets</h2>
        <p className="prose-muted mt-1 text-sm">
          Curated collections — open a set to browse unlocked media
        </p>
        <div className="mt-6">
          <VaultGrid />
        </div>
      </section>

      {lightbox && (
        <VaultLightbox
          items={lightbox.items}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onChange={(i) => setLightbox({ ...lightbox, index: i })}
        />
      )}
    </div>
  );
}
