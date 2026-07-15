/**
 * Remote media CDN index (PC via Cloudflare Tunnel).
 * When MEDIA_PUBLIC_BASE is set, Vercel lists files from the CDN so
 * phones/PCs share the same vault.
 */
import type { MediaFile, MediaKind } from "./media";
import { mediaPublicBase } from "./media";

export function cdnEnabled(): boolean {
  return Boolean(mediaPublicBase());
}

export async function cdnListCompanion(
  companionId: string,
  kind?: MediaKind | "all",
): Promise<MediaFile[]> {
  const base = mediaPublicBase();
  if (!base) return [];

  try {
    const res = await fetch(`${base}/index.json`, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      items?: Array<{
        companionId: string;
        kind: MediaKind;
        mediaType: "image" | "video";
        name: string;
        path?: string;
        url?: string;
        size: number;
        mtime: number;
        id?: string;
      }>;
    };
    const items = (data.items || [])
      .filter((i) => i.companionId === companionId)
      .filter((i) => !kind || kind === "all" || i.kind === kind)
      .map((i) => {
        const path = i.path || `${i.companionId}/${i.kind}/${i.name}`;
        return {
          id: i.id || `${i.kind}:${i.name}`,
          companionId: i.companionId,
          kind: i.kind,
          mediaType: i.mediaType,
          name: i.name,
          url: i.url?.startsWith("http")
            ? i.url
            : `${base}/${path.replace(/^\//, "")}`,
          size: i.size,
          mtime: i.mtime,
          storage: "cdn" as const,
        };
      });
    return items;
  } catch {
    return [];
  }
}

export async function cdnUpload(
  companionId: string,
  kind: MediaKind,
  file: Blob,
  fileName: string,
  secret: string,
): Promise<MediaFile> {
  const base = mediaPublicBase();
  if (!base) throw new Error("MEDIA_PUBLIC_BASE not set");

  const form = new FormData();
  form.set("companion", companionId);
  form.set("kind", kind);
  form.set("file", file, fileName);

  const res = await fetch(`${base}/v1/upload`, {
    method: "POST",
    headers: secret ? { "x-media-secret": secret } : {},
    body: form,
    signal: AbortSignal.timeout(3_600_000),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    saved?: MediaFile[];
  };
  if (!res.ok || !data.saved?.[0]) {
    throw new Error(data.error || `CDN upload failed (${res.status})`);
  }
  const item = data.saved[0];
  const path =
    (item as { path?: string }).path ||
    `${companionId}/${item.kind}/${item.name}`;
  return {
    ...item,
    url: item.url?.startsWith("http")
      ? item.url
      : `${base}/${path.replace(/^\//, "")}`,
    storage: "cdn",
  };
}
