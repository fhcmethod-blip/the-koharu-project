import { NextRequest, NextResponse } from "next/server";
import { isOwnerEmail } from "@/lib/access";
import {
  ensureMediaDirs,
  isAllowedMedia,
  saveUploadedFile,
  type MediaKind,
} from "@/lib/media";
import { blobEnabled, blobUpload } from "@/lib/media-blob";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/media/upload
 * multipart form-data: companion, kind, files
 * Prefer Vercel Blob (permanent CDN) when BLOB_READ_WRITE_TOKEN is set.
 */
export async function POST(req: NextRequest) {
  try {
    const email = (req.headers.get("x-user-email") || "").toLowerCase();
    const open = process.env.MEDIA_OPEN_UPLOAD === "1";
    const allowVip = process.env.MEDIA_ALLOW_VIP_MANAGE === "1";
    const tier = (req.headers.get("x-user-tier") || "").toLowerCase();
    const allowed =
      open ||
      isOwnerEmail(email) ||
      (allowVip && tier === "vip" && !!email) ||
      (tier === "vip" && !!email);

    if (!allowed) {
      return NextResponse.json(
        {
          error:
            "Upload restricted. Log in as owner/VIP (Account → full access).",
        },
        { status: 403 },
      );
    }

    const form = await req.formData();
    const companion = String(form.get("companion") || "koharu");
    let kind = String(form.get("kind") || "library") as MediaKind;
    if (!["library", "videos", "generated"].includes(kind)) {
      kind = "library";
    }

    const useBlob = blobEnabled();
    if (!useBlob) {
      ensureMediaDirs(companion);
    }

    const files = form.getAll("files").filter((f) => f instanceof File) as File[];
    const single = form.get("file");
    if (single instanceof File) files.push(single);

    if (!files.length) {
      return NextResponse.json({ error: "No files" }, { status: 400 });
    }

    const saved = [];
    const failed: { name: string; error: string }[] = [];

    for (const file of files) {
      try {
        if (!file.name || !isAllowedMedia(file.name)) {
          failed.push({
            name: file.name || "unknown",
            error: "Unsupported type (use jpg/png/webp/gif/mp4/webm/mov)",
          });
          continue;
        }
        // Server route only for smaller files. Large videos use
        // /api/media/client-upload (direct browser → Blob, up to 5GB).
        if (file.size > 4.5 * 1024 * 1024) {
          failed.push({
            name: file.name,
            error:
              "Use Media Manager large-file upload (files over ~4MB go direct to cloud, up to 5GB)",
          });
          continue;
        }

        if (useBlob) {
          const buf = Buffer.from(await file.arrayBuffer());
          const item = await blobUpload(
            companion,
            kind,
            file.name,
            buf,
            file.type || undefined,
          );
          saved.push(item);
        } else {
          const buf = Buffer.from(await file.arrayBuffer());
          const item = saveUploadedFile(companion, kind, file.name, buf);
          saved.push(item);
        }
      } catch (e) {
        failed.push({
          name: file.name,
          error: e instanceof Error ? e.message : "save failed",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      storage: useBlob ? "blob" : "disk",
      permanent: useBlob,
      saved,
      failed,
      count: saved.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "upload failed";
    console.error("upload error", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
