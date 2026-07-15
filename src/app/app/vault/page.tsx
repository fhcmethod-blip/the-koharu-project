"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { VaultGrid } from "@/components/VaultGrid";
import { VaultLightbox, type LightboxItem } from "@/components/VaultLightbox";
import { VaultVideo } from "@/components/VaultVideo";
import { useAuth } from "@/lib/auth";
import { characters } from "@/lib/characters";
import {
  canViewMedia,
  mediaTierRequired,
  tierBlurb,
  tierLabels,
} from "@/lib/vault";
import { localVaultList } from "@/lib/vault-local-store";

type MediaFile = {
  id: string;
  name: string;
  url: string;
  mediaType?: string;
  kind?: string;
  source?: string;
  size?: number;
};

function mergeMedia(server: MediaFile[], local: MediaFile[]): MediaFile[] {
  const map = new Map<string, MediaFile>();
  for (const item of local) map.set(item.name, { ...item, source: "local" });
  // Server/cloud wins over device-only
  for (const item of server) map.set(item.name, { ...item, source: item.source || "server" });
  return Array.from(map.values());
}

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
            Media stays hidden until you upgrade — no previews, no filenames, no
            playback.
          </p>
          <Link href="/app/account" className="btn-primary mt-6 inline-flex">
            Upgrade in Account
          </Link>
        </div>
      </div>
      {/* Decorative locked tiles — not real media */}
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
  const [companion, setCompanion] = useState("koharu");
  const [photos, setPhotos] = useState<MediaFile[]>([]);
  const [videos, setVideos] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<{
    items: LightboxItem[];
    index: number;
  } | null>(null);

  const canPhotos = canViewMedia(tier, "library") || isOwner;
  const canVideos = canViewMedia(tier, "videos") || isOwner;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Free / locked users: no media at all
      if (!canPhotos && !canVideos) {
        setPhotos([]);
        setVideos([]);
        return;
      }

      let lib: MediaFile[] = [];
      let vid: MediaFile[] = [];

      try {
        const res = await fetch(
          `/api/media/list?companion=${encodeURIComponent(companion)}&kind=all`,
          {
            headers: {
              "x-user-email": user?.email || "",
              "x-user-tier": user?.tier || "free",
            },
            credentials: "same-origin",
          },
        );
        const d = await res.json();
        if (res.ok) {
          if (d.access?.library) lib = d.items?.library || [];
          if (d.access?.videos) vid = d.items?.videos || [];
        }
      } catch {
        /* server empty / offline */
      }

      // Same source as Media Manager: include this-device vault files for entitled users
      // (so a video you see in Manager also appears here when VIP)
      try {
        const local = await localVaultList(companion, "all");
        if (canPhotos) {
          const localPhotos = local
            .filter((i) => i.kind === "library")
            .map((i) => ({ ...i, source: "local" as const }));
          lib = mergeMedia(lib, localPhotos);
        }
        if (canVideos) {
          const localVideos = local
            .filter((i) => i.kind === "videos")
            .map((i) => ({ ...i, source: "local" as const }));
          vid = mergeMedia(vid, localVideos);
        }
      } catch {
        /* no idb */
      }

      setPhotos(canPhotos ? lib : []);
      setVideos(canVideos ? vid : []);
    } catch {
      setPhotos([]);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, [companion, user?.email, user?.tier, canPhotos, canVideos]);

  useEffect(() => {
    void load();
  }, [load]);

  const photoItems: LightboxItem[] = useMemo(
    () =>
      canPhotos
        ? photos.map((p) => ({
            id: p.id,
            name: p.name,
            url: p.url,
            mediaType: "image" as const,
          }))
        : [],
    [photos, canPhotos],
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">IRL Vault</h1>
          <p className="prose-muted mt-2 max-w-xl text-sm">
            Exclusive photos &amp; videos. Content is locked to your membership —
            Free sees nothing, Plus gets photos, VIP gets photos + videos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {(canPhotos || canVideos) && (
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
          )}
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
        <p className="prose-muted text-sm">
          Requires {tierLabels[mediaTierRequired("library")]}
          {canPhotos && photos.length ? ` · ${photos.length} unlocked` : ""}
        </p>

        {!canPhotos ? (
          <LockedPanel
            title="Photo vault locked"
            required={tierLabels[mediaTierRequired("library")]}
            yourTier={tierLabels[tier]}
            kind="photo"
          />
        ) : loading ? (
          <p className="mt-4 text-sm text-muted">Loading vault…</p>
        ) : photos.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-card-border bg-card/40 p-8 text-center">
            <p className="font-medium">No photos uploaded yet</p>
            <p className="prose-muted mt-2 text-sm">
              Owner can add files in{" "}
              <Link href="/app/media" className="text-accent-soft hover:underline">
                Media Manager
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() =>
                  setLightbox({ items: photoItems, index: i })
                }
                className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-card-border bg-card text-left"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
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
            No videos uploaded yet. Owner: Media Manager → Videos.
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
                  <p className="truncate text-xs text-muted">
                    {vid.name}
                    {vid.source === "local" ||
                    (vid.url && vid.url.startsWith("blob:")) ? (
                      <span className="ml-2 text-amber-300/90">· this device</span>
                    ) : null}
                  </p>
                  <button
                    type="button"
                    className="shrink-0 text-[11px] text-accent-soft hover:underline"
                    onClick={() =>
                      setLightbox({ items: videoItems, index: i })
                    }
                  >
                    Fullscreen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Featured sets — already tier-gated in VaultGrid */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold">Featured sets</h2>
        <p className="prose-muted mt-1 text-sm">
          Collections open only at the required tier
        </p>
        <div className="mt-6">
          <VaultGrid />
        </div>
      </section>

      {lightbox && canPhotos && lightbox.items[0]?.mediaType === "image" && (
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
