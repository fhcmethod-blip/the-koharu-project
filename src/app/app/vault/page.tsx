"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { VaultGrid } from "@/components/VaultGrid";
import { VaultLightbox, type LightboxItem } from "@/components/VaultLightbox";
import { VaultVideo } from "@/components/VaultVideo";
import { useAuth } from "@/lib/auth";
import {
  canViewMedia,
  mediaTierRequired,
  tierBlurb,
  tierLabels,
} from "@/lib/vault";

type MediaFile = {
  id: string;
  name: string;
  url: string;
  mediaType?: string;
  kind?: string;
  source?: string;
  size?: number;
};

type VaultBucket = {
  photos: MediaFile[];
  videos: MediaFile[];
  canAccess: boolean;
};

type VaultResponse = {
  userTier: "free" | "plus" | "vip";
  isOwner?: boolean;
  content: {
    free: VaultBucket;
    plus: VaultBucket;
    vip: VaultBucket;
    private?: VaultBucket;
  };
};

function LockedPanel({
  title,
  required,
  yourTier,
  kind,
}: {
  title: string;
  required: string;
  yourTier: string;
  kind: "photo" | "video";
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-3xl border border-card-border bg-card/60">
      <div
        className={`relative flex min-h-[220px] flex-col items-center justify-center px-6 py-12 text-center ${
          kind === "video"
            ? "bg-gradient-to-br from-violet-950/90 via-black to-rose-950/60"
            : "bg-gradient-to-br from-rose-950/90 via-fuchsia-950/50 to-black"
        }`}
      >
        <div className="absolute inset-0 backdrop-blur-sm" />
        <div className="relative z-10 max-w-md">
          <span className="text-4xl" aria-hidden>
            🔒
          </span>
          <h3 className="mt-4 text-xl font-semibold">{title}</h3>
          <p className="prose-muted mt-2 text-sm">
            Requires <strong className="text-gold">{required}</strong> membership.
            Your plan: <strong className="text-foreground/90">{yourTier}</strong>.
          </p>
          <p className="prose-muted mt-2 text-xs">
            Content stays locked until you upgrade — no previews, no filenames, no
            playback.
          </p>
          <Link href="/app/account" className="btn-primary mt-6 inline-flex">
            Upgrade in Account
          </Link>
        </div>
      </div>
      {/* Decorative locked tiles */}
      <div className="grid grid-cols-3 gap-2 p-3 opacity-40 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[3/4] rounded-xl bg-gradient-to-br from-white/5 to-black/40"
          />
        ))}
      </div>
    </div>
  );
}

export default function VaultPage() {
  const { user, isOwner } = useAuth();
  const tier = user?.tier ?? "free";
  const [photos, setPhotos] = useState<MediaFile[]>([]);
  const [videos, setVideos] = useState<MediaFile[]>([]);
  const [privatePhotos, setPrivatePhotos] = useState<MediaFile[]>([]);
  const [privateVideos, setPrivateVideos] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<{
    items: LightboxItem[];
    index: number;
  } | null>(null);

  // Access control: photos require plus, videos require vip (owner bypasses)
  const canPhotos = canViewMedia(tier, "library") || isOwner;
  const canVideos = canViewMedia(tier, "videos") || isOwner;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vault", {
        credentials: "same-origin",
      });

      if (!res.ok) {
        setPhotos([]);
        setVideos([]);
        setPrivatePhotos([]);
        setPrivateVideos([]);
        return;
      }

      const data: VaultResponse = await res.json();

      // Tier-based access:
      // free tier  → sees free/ photos only (teasers for everyone)
      // plus tier  → sees free/ + plus/ photos, no videos
      // vip tier   → sees ALL photos + ALL videos
      // private    → OWNER EMAIL ONLY (never sold tiers)

      // Free photos are ALWAYS visible to everyone (teaser content)
      let unlockedPhotos: MediaFile[] = [...data.content.free.photos];
      let unlockedVideos: MediaFile[] = [];

      if (isOwner || data.content.vip.canAccess) {
        // VIP or owner: all photos + all videos
        unlockedPhotos = [
          ...unlockedPhotos,
          ...data.content.plus.photos,
          ...data.content.vip.photos,
        ];
        unlockedVideos = [
          ...data.content.free.videos,
          ...data.content.plus.videos,
          ...data.content.vip.videos,
        ];
      } else if (data.content.plus.canAccess) {
        // Plus: free + plus photos (no videos)
        unlockedPhotos = [
          ...unlockedPhotos,
          ...data.content.plus.photos,
        ];
      }

      // Photos: always show at least free tier; videos stay gated
      setPhotos(unlockedPhotos);
      setVideos(canVideos ? unlockedVideos : []);

      // Owner-only private vault — never mix into public grids
      if (isOwner && data.content.private?.canAccess) {
        setPrivatePhotos(data.content.private.photos || []);
        setPrivateVideos(data.content.private.videos || []);
      } else {
        setPrivatePhotos([]);
        setPrivateVideos([]);
      }
    } catch {
      setPhotos([]);
      setVideos([]);
      setPrivatePhotos([]);
      setPrivateVideos([]);
    } finally {
      setLoading(false);
    }
  }, [canPhotos, canVideos, isOwner]);

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
      canVideos
        ? videos.map((v) => ({
            id: v.id,
            name: v.name,
            url: v.url,
            mediaType: "video" as const,
          }))
        : [],
    [videos, canVideos],
  );

  const privatePhotoItems: LightboxItem[] = useMemo(
    () =>
      privatePhotos.map((p) => ({
        id: p.id,
        name: p.name,
        url: p.url,
        mediaType: "image" as const,
      })),
    [privatePhotos],
  );

  const privateVideoItems: LightboxItem[] = useMemo(
    () =>
      privateVideos.map((v) => ({
        id: v.id,
        name: v.name,
        url: v.url,
        mediaType: "video" as const,
      })),
    [privateVideos],
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">IRL Vault</h1>
          <p className="prose-muted mt-2 max-w-xl text-sm">
            Exclusive photos &amp; videos. Free tier shows a teaser gallery —
            Touch unlocks the full photo sets, Claimed adds videos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {(isOwner || tier === "vip") && (
            <Link href="/app/media" className="btn-primary !py-2 text-sm">
              Manage media
            </Link>
          )}
          <div className="rounded-2xl border border-card-border bg-card/70 px-4 py-3 text-sm">
            <p className="text-muted">Your access</p>
            <p className="font-semibold text-gold">
              {user ? tierLabels[user.tier] : "Free"}
              {isOwner ? " · Owner" : ""}
            </p>
            <p className="text-[11px] text-muted">
              {user ? tierBlurb[user.tier] : tierBlurb.free}
            </p>
          </div>
        </div>
      </div>

      {/* Owner-only private vault */}
      {isOwner && (
        <section className="mt-8 rounded-3xl border border-amber-500/40 bg-gradient-to-br from-amber-950/40 via-black/60 to-rose-950/30 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/90">
                Private · owner only
              </p>
              <h2 className="mt-1 text-xl font-semibold text-amber-50">
                Your private vault
              </h2>
              <p className="prose-muted mt-2 max-w-xl text-sm">
                Only your owner login can see this. Not sold to Touch/Claimed.
                Drop files into{" "}
                <code className="rounded bg-black/40 px-1.5 py-0.5 text-[11px] text-amber-100/90">
                  D:\koharu-server\vault\private\photos
                </code>{" "}
                or{" "}
                <code className="rounded bg-black/40 px-1.5 py-0.5 text-[11px] text-amber-100/90">
                  …\private\videos
                </code>
                .
              </p>
            </div>
            <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-amber-200">
              {privatePhotos.length} photos · {privateVideos.length} videos
            </span>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-muted">Loading private vault…</p>
          ) : privatePhotos.length === 0 && privateVideos.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-amber-500/30 bg-black/30 p-6 text-center text-sm text-muted">
              Empty for now. Add files on this PC into the{" "}
              <code className="text-amber-100/80">private</code> folders above,
              then refresh.
            </div>
          ) : (
            <>
              {privatePhotos.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-sm font-medium text-amber-100/90">
                    Private photos
                  </h3>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {privatePhotos.map((img, i) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() =>
                          setLightbox({ items: privatePhotoItems, index: i })
                        }
                        className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-amber-500/25 bg-card text-left"
                      >
                        <img
                          src={img.url}
                          alt={img.name}
                          className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {privateVideos.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-amber-100/90">
                    Private videos
                  </h3>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    {privateVideos.map((vid, i) => (
                      <div
                        key={vid.id}
                        className="overflow-hidden rounded-2xl border border-amber-500/25 bg-card"
                      >
                        <VaultVideo
                          src={vid.url}
                          title={vid.name}
                          className="aspect-video object-contain"
                        />
                        <div className="flex items-center justify-between gap-2 px-3 py-2">
                          <p className="truncate text-xs text-muted">
                            {vid.name}
                          </p>
                          <button
                            type="button"
                            className="shrink-0 text-[11px] text-amber-200/90 hover:underline"
                            onClick={() =>
                              setLightbox({
                                items: privateVideoItems,
                                index: i,
                              })
                            }
                          >
                            Fullscreen
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Membership summary */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {(
          [
            ["free", "Chat only", "No IRL media"],
            ["plus", "Photos", "All photo sets"],
            ["vip", "Photos + video", "Full vault"],
          ] as const
        ).map(([t, label, desc]) => {
          const active = tier === t || (isOwner && t === "vip");
          return (
            <div
              key={t}
              className={`rounded-2xl border px-4 py-3 text-sm ${
                active
                  ? "border-accent/50 bg-accent/10"
                  : "border-card-border bg-card/40 opacity-70"
              }`}
            >
              <p className="font-medium text-gold">{tierLabels[t]}</p>
              <p className="mt-1 text-foreground/90">{label}</p>
              <p className="prose-muted text-xs">{desc}</p>
            </div>
          );
        })}
      </div>

      {/* Photos */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold">Photos</h2>
        {canPhotos ? (
          <p className="prose-muted text-sm">
            {photos.length} {photos.length === 1 ? "photo" : "photos"}
          </p>
        ) : (
          <p className="prose-muted text-sm">
            Free teaser gallery · {photos.length} visible · upgrade for full photo sets
          </p>
        )}

        {loading ? (
          <p className="mt-4 text-sm text-muted">Loading vault…</p>
        ) : photos.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-card-border bg-card/40 p-8 text-center">
            <p className="font-medium">No photos uploaded yet</p>
            <p className="prose-muted mt-2 text-sm">
              Owner can add files via the{" "}
              <Link href="/admin/ppv" className="text-accent-soft hover:underline">
                PPV admin
              </Link>{" "}
              or drop content into{" "}
              <code className="rounded bg-card-border/50 px-1.5 py-0.5 text-xs">
                vault/free/photos/
              </code>{" "}
              for teasers, or{" "}
              <code className="rounded bg-card-border/50 px-1.5 py-0.5 text-xs">
                vault/plus/photos/
              </code>{" "}
              for Touch tier on the server.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setLightbox({ items: photoItems, index: i })}
                className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-card-border bg-card text-left"
              >
                <img
                  src={img.url}
                  alt={img.name}
                  className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                  loading="lazy"
                />
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
          {canVideos && videos.length ? ` · ${videos.length} unlocked` : ""}
        </p>

        {!canVideos ? (
          <LockedPanel
            title="Video vault locked"
            required={tierLabels[mediaTierRequired("videos")]}
            yourTier={tierLabels[tier]}
            kind="video"
          />
        ) : loading ? (
          <p className="mt-4 text-sm text-muted">Loading videos…</p>
        ) : videos.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-card-border bg-card/40 p-6 text-center text-sm text-muted">
            No videos uploaded yet. Owner: drop video files into{" "}
            <code className="rounded bg-card-border/50 px-1.5 py-0.5 text-xs">
              vault/vip/videos/
            </code>{" "}
            on the server.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {videos.map((vid, i) => (
              <div
                key={vid.id}
                className="overflow-hidden rounded-2xl border border-card-border bg-card"
              >
                <VaultVideo
                  src={vid.url}
                  title={vid.name}
                  className="aspect-video object-contain"
                />
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <p className="truncate text-xs text-muted">{vid.name}</p>
                  <button
                    type="button"
                    className="shrink-0 text-[11px] text-accent-soft hover:underline"
                    onClick={() => setLightbox({ items: videoItems, index: i })}
                  >
                    Fullscreen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Featured sets */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold">Featured sets</h2>
        <p className="prose-muted mt-1 text-sm">
          Collections open only at the required tier
        </p>
        <div className="mt-6">
          <VaultGrid />
        </div>
      </section>

      {lightbox && lightbox.items[0]?.mediaType === "image" && (
        <VaultLightbox
          items={lightbox.items}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onChange={(i) => setLightbox({ ...lightbox, index: i })}
        />
      )}
      {lightbox && canVideos && lightbox.items[0]?.mediaType === "video" && (
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
