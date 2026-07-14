/**
 * Client-safe path helpers (no Node fs).
 */

export type MediaKind = "library" | "generated" | "videos";

export function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase() || "unknown";
}

export function isVideoFileName(fileName: string): boolean {
  return /\.(mp4|webm|mov|m4v|mkv)$/i.test(fileName);
}

/** Build a unique vault pathname for client-side Blob uploads */
export function vaultBlobPathname(
  companionId: string,
  kind: MediaKind,
  originalName: string,
): { pathname: string; kind: MediaKind; name: string } {
  let targetKind: MediaKind = kind;
  if (isVideoFileName(originalName) && kind === "library") targetKind = "videos";
  if (!isVideoFileName(originalName) && kind === "videos") targetKind = "library";

  const raw = originalName.replace(/\\/g, "/").split("/").pop() || "file";
  const dot = raw.lastIndexOf(".");
  const ext = dot >= 0 ? raw.slice(dot) : "";
  const stem = (dot >= 0 ? raw.slice(0, dot) : raw).replace(
    /[^\w.\- ()[\]]+/g,
    "_",
  ) || "file";
  const name = `${stem}-${Date.now()}${ext}`;
  const safe = sanitizeId(companionId);
  return {
    pathname: `vault/${safe}/${targetKind}/${name}`,
    kind: targetKind,
    name,
  };
}
