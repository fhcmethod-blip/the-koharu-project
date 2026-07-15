import { NextRequest, NextResponse } from "next/server";
import {
  ensureMediaDirs,
  listCompanionMedia,
  mediaRoot,
  type MediaFile,
  type MediaKind,
} from "@/lib/media";
import { blobEnabled, blobListCompanion } from "@/lib/media-blob";
import { canListKind, identityFromRequest } from "@/lib/vault-auth";
import { mediaTierRequired, tierLabels } from "@/lib/vault";

export const runtime = "nodejs";

function mergeByName(a: MediaFile[], b: MediaFile[]): MediaFile[] {
  const map = new Map<string, MediaFile>();
  for (const item of b) map.set(`${item.kind}:${item.name}`, item);
  for (const item of a) map.set(`${item.kind}:${item.name}`, item);
  return Array.from(map.values()).sort((x, y) => y.mtime - x.mtime);
}

/** Strip playable URLs for clients that must not access this kind. */
function redact(items: MediaFile[], allowed: boolean): MediaFile[] {
  if (allowed) return items;
  // Locked: no urls, no real filenames — only a count placeholder
  return [];
}

/** GET /api/media/list?companion=koharu&kind=library|videos|generated|all */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companion = searchParams.get("companion") || "koharu";
  const kindParam = searchParams.get("kind") || "all";
  const id = identityFromRequest(req);

  const hasBlob = blobEnabled();
  if (!hasBlob) {
    try {
      ensureMediaDirs(companion);
    } catch {
      /* vercel without blob */
    }
  }

  async function loadKind(kind: MediaKind): Promise<MediaFile[]> {
    const allowed = canListKind(id, kind);
    if (!allowed) return [];

    const disk = (() => {
      try {
        return listCompanionMedia(companion, kind);
      } catch {
        return [] as MediaFile[];
      }
    })();
    const cloud = hasBlob ? await blobListCompanion(companion, kind) : [];
    return mergeByName(cloud, disk);
  }

  async function lockedMeta(kind: MediaKind) {
    // Count without exposing URLs: load only if owner/bypass — otherwise generic
    // Free users must not learn real filenames/urls
    return {
      locked: !canListKind(id, kind),
      requiredTier: tierLabels[mediaTierRequired(kind)],
      count: canListKind(id, kind) ? undefined : null,
    };
  }

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
        library: await lockedMeta("library"),
        videos: await lockedMeta("videos"),
        generated: await lockedMeta("generated"),
      },
      storage: hasBlob ? "blob" : "disk",
      permanent: hasBlob,
      count: library.length + videos.length + generated.length,
      images: library.length,
      videos: videos.length,
      generated: generated.length,
      mediaRoot: hasBlob ? "vercel-blob:vault/" : mediaRoot(),
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
    storage: hasBlob ? "blob" : "disk",
    permanent: hasBlob,
    count: items.length,
    mediaRoot: hasBlob ? "vercel-blob:vault/" : mediaRoot(),
    images: items.filter((i) => i.mediaType === "image"),
    items,
  });
}
