import { NextRequest, NextResponse } from "next/server";
import {
  ensureMediaDirs,
  listCompanionMedia,
  mediaRoot,
  type MediaKind,
} from "@/lib/media";

export const runtime = "nodejs";

/** GET /api/media/list?companion=koharu&kind=library|videos|generated|all */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companion = searchParams.get("companion") || "koharu";
  const kindParam = searchParams.get("kind") || "all";

  ensureMediaDirs(companion);

  if (kindParam === "all") {
    const library = listCompanionMedia(companion, "library");
    const videos = listCompanionMedia(companion, "videos");
    const generated = listCompanionMedia(companion, "generated");
    const images = [...library, ...generated];
    return NextResponse.json({
      companion,
      kind: "all",
      count: library.length + videos.length + generated.length,
      images: library.length,
      videos: videos.length,
      generated: generated.length,
      mediaRoot: mediaRoot(),
      items: {
        library,
        videos,
        generated,
      },
      // flat for simple UIs
      flat: [...library, ...videos, ...generated].sort(
        (a, b) => b.mtime - a.mtime,
      ),
      dropFolderHint: `media/${companion}/library/ (photos) · media/${companion}/videos/ (video)`,
    });
  }

  const kind = kindParam as MediaKind;
  const items = listCompanionMedia(companion, kind);
  return NextResponse.json({
    companion,
    kind,
    count: items.length,
    mediaRoot: mediaRoot(),
    images: items.filter((i) => i.mediaType === "image"),
    items,
    dropFolderHint:
      kind === "videos"
        ? `Drop videos into: media/${companion}/videos/`
        : `Drop files into: media/${companion}/${kind}/`,
  });
}
