import { NextRequest, NextResponse } from "next/server";
import {
  ensureMediaDirs,
  listCompanionMedia,
  mediaRoot,
  type MediaFile,
  type MediaKind,
} from "@/lib/media";
import { blobEnabled, blobListCompanion } from "@/lib/media-blob";

export const runtime = "nodejs";

function mergeByName(a: MediaFile[], b: MediaFile[]): MediaFile[] {
  const map = new Map<string, MediaFile>();
  // Blob first (permanent), disk fills gaps
  for (const item of b) map.set(`${item.kind}:${item.name}`, item);
  for (const item of a) map.set(`${item.kind}:${item.name}`, item);
  return Array.from(map.values()).sort((x, y) => y.mtime - x.mtime);
}

/** GET /api/media/list?companion=koharu&kind=library|videos|generated|all */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companion = searchParams.get("companion") || "koharu";
  const kindParam = searchParams.get("kind") || "all";

  const hasBlob = blobEnabled();
  if (!hasBlob) {
    try {
      ensureMediaDirs(companion);
    } catch {
      /* vercel without blob */
    }
  }

  async function loadKind(kind: MediaKind): Promise<MediaFile[]> {
    const disk = (() => {
      try {
        return listCompanionMedia(companion, kind);
      } catch {
        return [] as MediaFile[];
      }
    })();
    const cloud = hasBlob ? await blobListCompanion(companion, kind) : [];
    // Prefer cloud over disk for same name
    return mergeByName(cloud, disk);
  }

  if (kindParam === "all") {
    const library = await loadKind("library");
    const videos = await loadKind("videos");
    const generated = await loadKind("generated");
    return NextResponse.json({
      companion,
      kind: "all",
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
      dropFolderHint: hasBlob
        ? "Cloud storage (Vercel Blob) — upload via Media Manager"
        : `media/${companion}/library/ (photos) · media/${companion}/videos/ (video)`,
    });
  }

  const kind = kindParam as MediaKind;
  const items = await loadKind(kind);
  return NextResponse.json({
    companion,
    kind,
    storage: hasBlob ? "blob" : "disk",
    permanent: hasBlob,
    count: items.length,
    mediaRoot: hasBlob ? "vercel-blob:vault/" : mediaRoot(),
    images: items.filter((i) => i.mediaType === "image"),
    items,
    dropFolderHint: hasBlob
      ? "Upload via Media Manager — files stay online permanently"
      : kind === "videos"
        ? `Drop videos into: media/${companion}/videos/`
        : `Drop files into: media/${companion}/${kind}/`,
  });
}
