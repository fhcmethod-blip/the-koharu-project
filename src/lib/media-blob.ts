/**
 * Permanent cloud media via Vercel Blob.
 * When BLOB_READ_WRITE_TOKEN is set, uploads stay online and stream from CDN.
 */
import { del, list, put } from "@vercel/blob";
import path from "path";
import type { MediaFile, MediaKind, MediaType } from "./media";
import { contentTypeFor, isVideoFile, mediaTypeOf, sanitizeId } from "./media";

export function blobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function blobPath(
  companionId: string,
  kind: MediaKind,
  fileName: string,
): string {
  const safe = sanitizeId(companionId);
  const base = path.basename(fileName).replace(/[^\w.\- ()[\]]+/g, "_");
  return `vault/${safe}/${kind}/${base}`;
}

function fromBlobMeta(b: {
  pathname: string;
  url: string;
  size: number;
  uploadedAt?: Date | string;
}): MediaFile | null {
  // vault/{companion}/{kind}/{name}
  const parts = b.pathname.replace(/^\/+/, "").split("/");
  if (parts[0] !== "vault" || parts.length < 4) return null;
  const companionId = parts[1];
  const kind = parts[2] as MediaKind;
  if (!["library", "videos", "generated"].includes(kind)) return null;
  const name = parts.slice(3).join("/");
  const mtime =
    b.uploadedAt instanceof Date
      ? b.uploadedAt.getTime()
      : b.uploadedAt
        ? new Date(b.uploadedAt).getTime()
        : Date.now();

  return {
    id: `blob:${kind}:${name}`,
    companionId,
    kind,
    mediaType: mediaTypeOf(name),
    name,
    url: b.url, // permanent public CDN URL
    size: b.size,
    mtime,
    storage: "blob",
  };
}

export async function blobListCompanion(
  companionId: string,
  kind?: MediaKind | "all",
): Promise<MediaFile[]> {
  if (!blobEnabled()) return [];
  const safe = sanitizeId(companionId);
  const prefix =
    !kind || kind === "all"
      ? `vault/${safe}/`
      : `vault/${safe}/${kind}/`;

  const out: MediaFile[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({
      prefix,
      cursor,
      limit: 1000,
    });
    for (const b of page.blobs) {
      const item = fromBlobMeta(b);
      if (item) out.push(item);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return out.sort((a, b) => b.mtime - a.mtime);
}

export async function blobUpload(
  companionId: string,
  kind: MediaKind,
  originalName: string,
  data: Buffer | ArrayBuffer | Blob,
  contentType?: string,
): Promise<MediaFile> {
  if (!blobEnabled()) {
    throw new Error("BLOB_READ_WRITE_TOKEN not configured");
  }

  let targetKind = kind;
  if (isVideoFile(originalName) && kind === "library") targetKind = "videos";
  if (!isVideoFile(originalName) && kind === "videos") targetKind = "library";

  // Unique name if needed — append timestamp on collision risk
  const ext = path.extname(originalName) || "";
  const stem = path.basename(originalName, ext).replace(/[^\w.\- ()[\]]+/g, "_") || "file";
  const unique = `${stem}-${Date.now()}${ext}`;
  const pathname = blobPath(companionId, targetKind, unique);

  const body =
    data instanceof Buffer
      ? data
      : data instanceof ArrayBuffer
        ? Buffer.from(data)
        : data;

  const result = await put(pathname, body, {
    access: "public",
    contentType: contentType || contentTypeFor(unique),
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  return {
    id: `blob:${targetKind}:${unique}`,
    companionId: sanitizeId(companionId),
    kind: targetKind,
    mediaType: mediaTypeOf(unique) as MediaType,
    name: unique,
    url: result.url,
    size: body instanceof Buffer ? body.length : (body as Blob).size,
    mtime: Date.now(),
    storage: "blob",
  };
}

export async function blobDeleteByUrl(url: string): Promise<boolean> {
  if (!blobEnabled()) return false;
  try {
    await del(url);
    return true;
  } catch {
    return false;
  }
}

export async function blobDelete(
  companionId: string,
  kind: MediaKind,
  name: string,
): Promise<boolean> {
  if (!blobEnabled()) return false;
  // Find matching blob by prefix list
  const items = await blobListCompanion(companionId, kind);
  const hit = items.find((i) => i.name === name);
  if (!hit) return false;
  return blobDeleteByUrl(hit.url);
}
