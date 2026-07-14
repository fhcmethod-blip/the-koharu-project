"use client";

import { upload } from "@vercel/blob/client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { characters } from "@/lib/characters";
import { vaultBlobPathname } from "@/lib/media-path";
import {
  localVaultDelete,
  localVaultList,
  localVaultSave,
} from "@/lib/vault-local-store";

/** Above this size → direct browser→Blob (Vercel API body max is ~4.5MB). */
const SERVER_UPLOAD_MAX = 4 * 1024 * 1024;
/** Hard cap for a single file (5 GB) */
const FILE_MAX_BYTES = 5 * 1024 * 1024 * 1024;

type MediaItem = {
  id: string;
  companionId: string;
  kind: "library" | "generated" | "videos";
  mediaType: "image" | "video";
  name: string;
  url: string;
  size: number;
  mtime: number;
  source?: "server" | "local";
};

type Tab = "library" | "videos" | "generated";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaManagerPage() {
  const { user, ready, isOwner } = useAuth();
  const router = useRouter();
  const [companion, setCompanion] = useState("koharu");
  const [tab, setTab] = useState<Tab>("library");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [counts, setCounts] = useState({ library: 0, videos: 0, generated: 0 });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MediaItem | null>(null);

  const canManage = isOwner || user?.tier === "vip";

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let library: MediaItem[] = [];
      let videos: MediaItem[] = [];
      let generated: MediaItem[] = [];

      try {
        const res = await fetch(
          `/api/media/list?companion=${encodeURIComponent(companion)}&kind=all`,
        );
        const data = await res.json();
        if (res.ok) {
          library = (data.items?.library || []).map((x: MediaItem) => ({
            ...x,
            source: "server" as const,
          }));
          videos = (data.items?.videos || []).map((x: MediaItem) => ({
            ...x,
            source: "server" as const,
          }));
          generated = (data.items?.generated || []).map((x: MediaItem) => ({
            ...x,
            source: "server" as const,
          }));
        }
      } catch {
        /* server media unavailable (common on Vercel) */
      }

      try {
        const local = await localVaultList(companion, "all");
        const byName = (arr: MediaItem[]) => new Set(arr.map((a) => a.name));
        const libNames = byName(library);
        const vidNames = byName(videos);
        const genNames = byName(generated);
        for (const item of local) {
          const row: MediaItem = { ...item, source: "local" };
          if (item.kind === "library" && !libNames.has(item.name)) library.push(row);
          if (item.kind === "videos" && !vidNames.has(item.name)) videos.push(row);
          if (item.kind === "generated" && !genNames.has(item.name))
            generated.push(row);
        }
      } catch {
        /* idb unavailable */
      }

      setCounts({
        library: library.length,
        videos: videos.length,
        generated: generated.length,
      });
      const bucket =
        tab === "library" ? library : tab === "videos" ? videos : generated;
      setItems(bucket);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load media");
    } finally {
      setLoading(false);
    }
  }, [companion, tab]);

  useEffect(() => {
    if (ready && !user) router.replace("/login?next=/app/media");
  }, [ready, user, router]);

  useEffect(() => {
    if (user) void refresh();
  }, [user, refresh]);

  const headers = useMemo(() => {
    const h: Record<string, string> = {};
    if (user?.email) h["x-user-email"] = user.email;
    if (user?.tier) h["x-user-tier"] = user.tier;
    return h;
  }, [user]);

  async function uploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (!files.length) return;
    setUploading(true);
    setUploadProgress(null);
    setMessage(null);
    setError(null);
    const kind =
      tab === "generated" ? "library" : tab === "videos" ? "videos" : "library";

    const ok: string[] = [];
    const errs: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const label = `${file.name} (${formatBytes(file.size)})`;
        setUploadProgress(`Uploading ${i + 1}/${files.length}: ${label}`);

        if (file.size > FILE_MAX_BYTES) {
          errs.push(
            `${file.name}: over 5 GB limit (file is ${formatBytes(file.size)})`,
          );
          continue;
        }

        try {
          // Large files (videos) go browser → Blob directly (supports multi‑GB)
          if (file.size > SERVER_UPLOAD_MAX) {
            const { pathname } = vaultBlobPathname(companion, kind, file.name);
            await upload(pathname, file, {
              access: "public",
              handleUploadUrl: "/api/media/client-upload",
              clientPayload: JSON.stringify({
                email: user?.email || "",
                tier: user?.tier || "",
                companion,
                kind,
              }),
              multipart: true,
              contentType: file.type || undefined,
              onUploadProgress: ({ percentage }) => {
                setUploadProgress(
                  `Uploading ${i + 1}/${files.length}: ${file.name} — ${Math.round(percentage)}%`,
                );
              },
            });
            ok.push(file.name);
            continue;
          }

          // Small files: server route (also writes to Blob when token is set)
          const form = new FormData();
          form.set("companion", companion);
          form.set("kind", kind);
          form.append("files", file);
          const res = await fetch("/api/media/upload", {
            method: "POST",
            headers,
            body: form,
          });
          const data = await res.json();
          if (!res.ok || !data.count) {
            throw new Error(data.error || "server upload failed");
          }
          ok.push(file.name);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "failed";
          // Tiny fallback only for small files
          if (file.size <= SERVER_UPLOAD_MAX) {
            try {
              await localVaultSave(companion, kind, file);
              ok.push(`${file.name} (device only)`);
              continue;
            } catch {
              /* */
            }
          }
          errs.push(`${file.name}: ${msg}`);
        }
      }

      if (ok.length) {
        setMessage(
          `Uploaded ${ok.length} file${ok.length === 1 ? "" : "s"} to cloud — stays online, plays in the vault (up to 5 GB each)`,
        );
      }
      if (errs.length) setError(errs.join("; "));
      if (!ok.length && errs.length) {
        throw new Error(errs[0]);
      }

      const onlyVideo =
        files.length > 0 &&
        files.every((f) => /\.(mp4|webm|mov|m4v|mkv)$/i.test(f.name));
      if (onlyVideo) setTab("videos");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }

  async function removeItem(item: MediaItem) {
    if (!confirm(`Delete ${item.name}?`)) return;
    setError(null);
    try {
      if (item.source === "local") {
        await localVaultDelete(item.id);
      } else {
        const qs = new URLSearchParams({
          companion: item.companionId,
          kind: item.kind,
          name: item.name,
        });
        if (item.url?.startsWith("http")) qs.set("url", item.url);
        const res = await fetch(`/api/media/file?${qs}`, {
          method: "DELETE",
          headers,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Delete failed");
      }
      if (selected?.id === item.id) setSelected(null);
      setMessage(`Deleted ${item.name}`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  if (!ready || !user) {
    return (
      <div className="p-10 text-muted">Loading…</div>
    );
  }

  if (!canManage) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Media Manager</h1>
        <p className="prose-muted mt-3 text-sm">
          Upload access is for owner / VIP accounts. Open Account and grant full
          access, or log in as the owner email.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Media Manager</h1>
          <p className="prose-muted mt-1 text-sm">
            Upload IRL photos &amp; videos — they store in{" "}
            <strong className="text-foreground/90">cloud storage</strong> and stay
            online so anyone with access can play them in the vault.
          </p>
          <Link
            href="/app/vault"
            className="mt-2 inline-block text-xs text-accent-soft hover:underline"
          >
            Open IRL Vault →
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-muted">Companion</label>
          <select
            className="input-field !w-auto !py-2"
            value={companion}
            onChange={(e) => setCompanion(e.target.value)}
          >
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={`mt-8 rounded-3xl border-2 border-dashed p-8 text-center transition ${
          dragOver
            ? "border-accent bg-accent/10"
            : "border-card-border bg-card/40"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files);
        }}
      >
        <p className="text-lg font-medium">
          {uploading
            ? uploadProgress || "Uploading…"
            : "Drop images or videos here"}
        </p>
        <p className="prose-muted mt-2 text-sm">
          Images: JPG PNG WEBP GIF · Videos: MP4 WEBM MOV ·{" "}
          <strong className="text-foreground/80">up to 5 GB per file</strong>{" "}
          (large videos upload straight to cloud)
        </p>
        <label className="btn-primary mt-6 inline-flex cursor-pointer">
          {uploading ? "Please wait…" : "Choose files"}
          <input
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v,.mkv"
            multiple
            disabled={uploading}
            onChange={(e) => {
              if (e.target.files?.length) void uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {(message || error) && (
        <div className="mt-4 space-y-1 text-sm">
          {message && <p className="text-success">{message}</p>}
          {error && <p className="text-accent-soft">{error}</p>}
        </div>
      )}

      {/* Tabs */}
      <div className="mt-8 flex flex-wrap gap-2">
        {(
          [
            ["library", `Photos (${counts.library})`],
            ["videos", `Videos (${counts.videos})`],
            ["generated", `AI generated (${counts.generated})`],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-2 text-sm ${
              tab === id
                ? "bg-accent text-white"
                : "border border-card-border text-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void refresh()}
          className="ml-auto text-xs text-muted hover:text-foreground"
        >
          Refresh
        </button>
      </div>

      {/* Grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          {loading ? (
            <p className="text-muted">Loading media…</p>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-card-border bg-card/50 p-10 text-center">
              <p className="font-medium">No files in this folder yet</p>
              <p className="prose-muted mt-2 text-sm">
                Upload above, or copy into{" "}
                <code className="text-accent-soft">
                  media/{companion}/{tab === "videos" ? "videos" : tab}/
                </code>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item)}
                  className={`group relative aspect-[3/4] overflow-hidden rounded-xl border text-left transition ${
                    selected?.id === item.id
                      ? "border-accent ring-2 ring-accent/40"
                      : "border-card-border hover:border-accent/40"
                  }`}
                >
                  {item.mediaType === "video" ? (
                    <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-violet-900/60 to-black p-2">
                      <span className="text-2xl">▶</span>
                      <span className="mt-2 line-clamp-2 px-1 text-center text-[10px] text-muted">
                        {item.name}
                      </span>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.url}
                      alt={item.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  )}
                  <span className="absolute bottom-0 left-0 right-0 bg-black/65 px-2 py-1 text-[10px] text-white/90">
                    {formatBytes(item.size)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Preview pane */}
        <aside className="rounded-2xl border border-card-border bg-card/70 p-4 lg:sticky lg:top-4 lg:self-start">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Preview
          </h2>
          {!selected ? (
            <p className="prose-muted mt-4 text-sm">Select a file to preview or delete.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {selected.mediaType === "video" ? (
                <video
                  src={selected.url}
                  controls
                  className="w-full rounded-xl bg-black"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.url}
                  alt={selected.name}
                  className="w-full rounded-xl object-cover"
                />
              )}
              <p className="break-all text-sm font-medium">{selected.name}</p>
              <p className="text-xs text-muted">
                {selected.mediaType} · {selected.kind} · {formatBytes(selected.size)}
              </p>
              <a
                href={selected.url}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary !w-full !py-2 text-sm"
              >
                Open original
              </a>
              <button
                type="button"
                onClick={() => void removeItem(selected)}
                className="w-full rounded-full border border-red-500/40 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10"
              >
                Delete
              </button>
            </div>
          )}

          <div className="mt-8 border-t border-card-border pt-4 text-[11px] text-muted">
            <p className="font-medium text-foreground/80">Folders on disk</p>
            <p className="mt-1">Photos → media/{companion}/library/</p>
            <p>Videos → media/{companion}/videos/</p>
            <p>AI gens → media/{companion}/generated/</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
