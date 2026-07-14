import fs from "fs";
import path from "path";

const IMAGE_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".avif",
]);

const VIDEO_EXT = new Set([
  ".mp4",
  ".webm",
  ".mov",
  ".m4v",
  ".mkv",
]);

export type MediaKind = "library" | "generated" | "videos";

export type MediaType = "image" | "video";

export type MediaFile = {
  id: string;
  companionId: string;
  kind: MediaKind;
  mediaType: MediaType;
  name: string;
  url: string;
  size: number;
  mtime: number;
};

export function mediaRoot(): string {
  // On Vercel/serverless, only /tmp is writable; local dev uses ./media
  if (process.env.MEDIA_ROOT) {
    return path.resolve(process.env.MEDIA_ROOT);
  }
  if (process.env.VERCEL) {
    return path.join("/tmp", "kohar-media");
  }
  // turbopackIgnore keeps Next from bundling the whole project via cwd()
  return path.join(/* turbopackIgnore: true */ process.cwd(), "media");
}

/** True when local disk media is expected to work */
export function mediaAvailable(): boolean {
  try {
    const root = mediaRoot();
    if (!fs.existsSync(root)) {
      fs.mkdirSync(root, { recursive: true });
    }
    return true;
  } catch {
    return false;
  }
}

export function companionMediaDir(
  companionId: string,
  kind: MediaKind = "library",
): string {
  const safe = sanitizeId(companionId);
  return path.join(mediaRoot(), safe, kind);
}

export function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase() || "unknown";
}

export function sanitizeFileName(name: string): string {
  const base = path.basename(name).replace(/[^\w.\- ()[\]]+/g, "_");
  if (!base || base === "." || base === ".." || base.includes("..")) {
    throw new Error("Invalid file name");
  }
  return base;
}

export function isImageFile(fileName: string): boolean {
  return IMAGE_EXT.has(path.extname(fileName).toLowerCase());
}

export function isVideoFile(fileName: string): boolean {
  return VIDEO_EXT.has(path.extname(fileName).toLowerCase());
}

export function isAllowedMedia(fileName: string): boolean {
  return isImageFile(fileName) || isVideoFile(fileName);
}

export function mediaTypeOf(fileName: string): MediaType {
  if (isVideoFile(fileName)) return "video";
  return "image";
}

export function ensureMediaDirs(companionId: string) {
  for (const kind of ["library", "generated", "videos"] as MediaKind[]) {
    const dir = companionMediaDir(companionId, kind);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

function toMediaFile(
  companionId: string,
  kind: MediaKind,
  name: string,
  stat: fs.Stats,
): MediaFile {
  const safeId = sanitizeId(companionId);
  return {
    id: `${kind}:${name}`,
    companionId: safeId,
    kind,
    mediaType: mediaTypeOf(name),
    name,
    url: `/api/media/file?companion=${encodeURIComponent(safeId)}&kind=${kind}&name=${encodeURIComponent(name)}`,
    size: stat.size,
    mtime: stat.mtimeMs,
  };
}

export function listCompanionMedia(
  companionId: string,
  kind: MediaKind = "library",
): MediaFile[] {
  try {
    const dir = companionMediaDir(companionId, kind);
    if (!fs.existsSync(dir)) return [];

    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isFile() && isAllowedMedia(d.name))
      .map((d) => {
        const full = path.join(dir, d.name);
        return toMediaFile(companionId, kind, d.name, fs.statSync(full));
      })
      .sort((a, b) => b.mtime - a.mtime);
  } catch {
    return [];
  }
}

/** @deprecated use listCompanionMedia */
export function listCompanionImages(
  companionId: string,
  kind: MediaKind = "library",
): MediaFile[] {
  return listCompanionMedia(companionId, kind).filter(
    (f) => f.mediaType === "image",
  );
}

export function resolveMediaPath(
  companionId: string,
  kind: MediaKind,
  name: string,
): string {
  const safeName = sanitizeFileName(name);
  if (!isAllowedMedia(safeName)) throw new Error("File type not allowed");
  const full = path.join(companionMediaDir(companionId, kind), safeName);
  const root = companionMediaDir(companionId, kind);
  const resolved = path.resolve(full);
  if (!resolved.startsWith(path.resolve(root))) {
    throw new Error("Path escape blocked");
  }
  return resolved;
}

export function uniqueFileName(dir: string, original: string): string {
  const safe = sanitizeFileName(original);
  const ext = path.extname(safe);
  const stem = path.basename(safe, ext);
  let candidate = safe;
  let i = 1;
  while (fs.existsSync(path.join(dir, candidate))) {
    candidate = `${stem}-${i}${ext}`;
    i += 1;
  }
  return candidate;
}

export function saveUploadedFile(
  companionId: string,
  kind: MediaKind,
  originalName: string,
  data: Buffer,
): MediaFile {
  ensureMediaDirs(companionId);
  // Route videos to videos/ if kind is library but file is video
  let targetKind = kind;
  if (isVideoFile(originalName) && kind === "library") {
    targetKind = "videos";
  }
  if (isImageFile(originalName) && kind === "videos") {
    targetKind = "library";
  }

  const dir = companionMediaDir(companionId, targetKind);
  const name = uniqueFileName(dir, originalName);
  const full = path.join(dir, name);
  fs.writeFileSync(full, data);
  return toMediaFile(companionId, targetKind, name, fs.statSync(full));
}

export function deleteMediaFile(
  companionId: string,
  kind: MediaKind,
  name: string,
): boolean {
  const full = resolveMediaPath(companionId, kind, name);
  if (!fs.existsSync(full)) return false;
  fs.unlinkSync(full);
  return true;
}

export function pickRandomLibraryImage(
  companionId: string,
): MediaFile | undefined {
  const list = listCompanionImages(companionId, "library");
  if (!list.length) return undefined;
  return list[Math.floor(Math.random() * list.length)];
}

export function wantsImage(text: string): boolean {
  const t = text.trim();
  // "show" alone or "show me ..." always means send/generate a pic
  if (/\bshow\b/i.test(t)) return true;
  return (
    /\b(pic|pics|photo|photos|image|images|selfie|selfies|picture|visual|ai art)\b/i.test(
      t,
    ) ||
    /\b(send me|send a|snap)\b/i.test(t) ||
    /\b(nude|nudes|naked)\b/i.test(t) ||
    /\b(generate|draw|render)\b.*\b(pic|photo|image|selfie|nude|body)\b/i.test(
      t,
    ) ||
    /\b(pic|photo|image|selfie|nude).*\b(generate|draw|render)\b/i.test(t)
  );
}

/** Prefer Fooocus gen over library. "show" always starts generation. */
export function wantsGenerated(text: string): boolean {
  const t = text.trim();
  if (/\bshow\b/i.test(t)) return true;
  return (
    /\b(generate|ai |draw|render|imagine|txt2img|pony|fooocus)\b/i.test(t) ||
    /\b(fantasy (pic|image|photo)|make (me )?(a |an )?(pic|image|photo|selfie))\b/i.test(
      t,
    ) ||
    /\b(nude selfie|naked selfie|nsfw (pic|photo|image))\b/i.test(t)
  );
}

export function contentTypeFor(fileName: string): string {
  switch (path.extname(fileName).toLowerCase()) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".avif":
      return "image/avif";
    case ".mp4":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".mov":
      return "video/quicktime";
    case ".m4v":
      return "video/x-m4v";
    case ".mkv":
      return "video/x-matroska";
    default:
      return "image/jpeg";
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
