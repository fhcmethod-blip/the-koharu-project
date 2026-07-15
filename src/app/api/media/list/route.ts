import { NextRequest, NextResponse } from "next/server";
import {
  ensureMediaDirs,
  listCompanionMedia,
  mediaPublicBase,
  mediaRoot,
  type MediaFile,
  type MediaKind,
} from "@/lib/media";
import { blobEnabled, blobListCompanion } from "@/lib/media-blob";
import { cdnEnabled, cdnListCompanion } from "@/lib/media-cdn";
import { canListKind, identityFromRequest } from "@/lib/vault-auth";
import { mediaTierRequired, tierLabels } from "@/lib/vault";

export const runtime = "nodejs";

function mergeByName(...lists: MediaFile[][]): MediaFile[] {
  const map = new Map<string, MediaFile>();
  // Later lists win (priority order: pass cloud/cdn last)
  for (const list of lists) {
    for (const item of list) {
      map.set(`${item.kind}:${item.name}`, item);
    }
  }
  return Array.from(map.values()).sort((x, y) => y.mtime - x.mtime);
}

function redact(items: MediaFile[], allowed: boolean): MediaFile[] {
  if (allowed) return items;
  return [];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companion = searchParams.get("companion") || "koharu";
  const kindParam = searchParams.get("kind") || "all";
  const id = identityFromRequest(req);

  const hasBlob = blobEnabled();
  const hasCdn = cdnEnabled();
  if (!hasBlob && !hasCdn) {
    try {
      ensureMediaDirs(companion);
    } catch {
      /* */
    }
  }

  async function loadKind(kind: MediaKind): Promise<MediaFile[]> {
    if (!canListKind(id, kind)) return [];

    const disk = (() => {
      try {
        return listCompanionMedia(companion, kind);
      } catch {
        return [] as MediaFile[];
      }
    })();
    const cloud = hasBlob ? await blobListCompanion(companion, kind) : [];
    const cdn = hasCdn ? await cdnListCompanion(companion, kind) : [];
    // CDN/cloud preferred for multi-device URLs
    return mergeByName(disk, cloud, cdn);
  }

  const storage = hasBlob ? "blob" : hasCdn ? "cdn" : "disk";

  if (kindParam === "all") {
    const allowLib = canListKind(id, "library");
    const allowVid = canListKind(id, "videos");
    const allowGen = canListKind(id, "generated");

    const library = redact(await loadKind("library"), allowLib);
    const videos = redact(await loadKind("videos"), allowVid);
    const generated = redact(await loadKind("generated"), allowGen);

    return NextResponse.json({
      companion,
      kind: "all",
      tier: id.tier,
      isOwner: id.isOwner,
      access: {
        library: allowLib,
        videos: allowVid,
        generated: allowGen,
      },
      locks: {
        library: {
          locked: !allowLib,
          requiredTier: tierLabels[mediaTierRequired("library")],
        },
        videos: {
          locked: !allowVid,
          requiredTier: tierLabels[mediaTierRequired("videos")],
        },
        generated: {
          locked: !allowGen,
          requiredTier: tierLabels[mediaTierRequired("generated")],
        },
      },
      storage,
      permanent: hasBlob || hasCdn,
      mediaPublicBase: mediaPublicBase() || null,
      count: library.length + videos.length + generated.length,
      images: library.length,
      videos: videos.length,
      generated: generated.length,
      mediaRoot: hasCdn
        ? mediaPublicBase()
        : hasBlob
          ? "vercel-blob:vault/"
          : mediaRoot(),
      items: { library, videos, generated },
      flat: [...library, ...videos, ...generated].sort(
        (a, b) => b.mtime - a.mtime,
      ),
    });
  }

  const kind = kindParam as MediaKind;
  const allowed = canListKind(id, kind);
  const items = redact(await loadKind(kind), allowed);
  return NextResponse.json({
    companion,
    kind,
    tier: id.tier,
    access: allowed,
    locked: !allowed,
    requiredTier: tierLabels[mediaTierRequired(kind)],
    storage,
    permanent: hasBlob || hasCdn,
    mediaPublicBase: mediaPublicBase() || null,
    count: items.length,
    items,
    images: items.filter((i) => i.mediaType === "image"),
  });
}
