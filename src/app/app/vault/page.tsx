"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { VaultGrid } from "@/components/VaultGrid";
import { useAuth } from "@/lib/auth";
import { tierLabels } from "@/lib/vault";

type MediaFile = {
  id: string;
  name: string;
  url: string;
  mediaType?: string;
};

export default function VaultPage() {
  const { user, isOwner } = useAuth();
  const [photos, setPhotos] = useState<MediaFile[]>([]);
  const [videos, setVideos] = useState<MediaFile[]>([]);
  const unlocked = user?.tier === "plus" || user?.tier === "vip" || false;

  useEffect(() => {
    fetch("/api/media/list?companion=koharu&kind=all")
      .then((r) => r.json())
      .then((d) => {
        setPhotos(d.items?.library || []);
        setVideos(d.items?.videos || []);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">IRL Vault</h1>
          <p className="prose-muted mt-2 max-w-xl text-sm">
            Koharu&apos;s photos and videos. Upload via Media Manager — they appear
            here for members.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
          </div>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Photos</h2>
        <p className="prose-muted text-sm">
          {photos.length
            ? `${photos.length} photo${photos.length === 1 ? "" : "s"}`
            : "No photos yet"}
        </p>

        {photos.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-card-border bg-card/40 p-8 text-center">
            <p className="font-medium">Add photos</p>
            <p className="prose-muted mt-2 text-sm">
              Use{" "}
              <Link href="/app/media" className="text-accent-soft hover:underline">
                Media Manager
              </Link>{" "}
              or drop files into{" "}
              <code className="text-accent-soft">media/koharu/library/</code>
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((img) => (
              <div
                key={img.id}
                className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-card-border bg-card"
              >
                {unlocked ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.url}
                    alt={img.name}
                    className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-rose-900/50 to-black p-3 text-center">
                    <span className="text-xl">🔒</span>
                    <p className="mt-2 text-xs text-muted">Plus / VIP</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Videos</h2>
        <p className="prose-muted text-sm">
          {videos.length
            ? `${videos.length} video${videos.length === 1 ? "" : "s"}`
            : "No videos yet"}
        </p>

        {videos.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-card-border bg-card/40 p-6 text-center text-sm text-muted">
            Upload MP4/WEBM in Media Manager → Videos
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {videos.map((vid) => (
              <div
                key={vid.id}
                className="overflow-hidden rounded-2xl border border-card-border bg-card"
              >
                {unlocked ? (
                  <video
                    src={vid.url}
                    controls
                    className="aspect-video w-full bg-black"
                    preload="metadata"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-black/60 text-muted">
                    🔒 VIP video
                  </div>
                )}
                <p className="truncate px-3 py-2 text-xs text-muted">{vid.name}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Featured sets</h2>
        <p className="prose-muted mt-1 text-sm">Curated collection labels</p>
        <div className="mt-6">
          <VaultGrid />
        </div>
      </section>
    </div>
  );
}
