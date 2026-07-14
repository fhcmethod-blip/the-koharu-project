import { NextRequest, NextResponse } from "next/server";
import { isOwnerEmail } from "@/lib/access";
import {
  ensureMediaDirs,
  isAllowedMedia,
  saveUploadedFile,
  type MediaKind,
} from "@/lib/media";

export const runtime = "nodejs";

// Allow large video uploads (Next may still cap depending on host)
export const maxDuration = 300;

/**
 * POST /api/media/upload
 * multipart form-data:
 *  - companion: koharu
 *  - kind: library | videos | generated
 *  - files: one or more
 * Header: x-user-email (owner) OR MEDIA_OPEN_UPLOAD=1
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
      // Local demo convenience: any authenticated VIP/owner email header
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

    ensureMediaDirs(companion);

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
        // 200MB hard cap per file for safety
        if (file.size > 200 * 1024 * 1024) {
          failed.push({ name: file.name, error: "File too large (max 200MB)" });
          continue;
        }
        const buf = Buffer.from(await file.arrayBuffer());
        const item = saveUploadedFile(companion, kind, file.name, buf);
        saved.push(item);
      } catch (e) {
        failed.push({
          name: file.name,
          error: e instanceof Error ? e.message : "save failed",
        });
      }
    }

    return NextResponse.json({
      ok: true,
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
