import { NextRequest, NextResponse } from "next/server";
import { isOwnerEmail } from "@/lib/access";
import {
  ensureMediaDirs,
  isAllowedMedia,
  mediaPublicBase,
  saveUploadedFile,
  type MediaKind,
} from "@/lib/media";
import { blobEnabled, blobUpload } from "@/lib/media-blob";
import { cdnEnabled } from "@/lib/media-cdn";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Small-file upload via Vercel.
 * Large files should use client-upload (Blob) or MEDIA CDN /v1/upload.
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
        { error: "Upload restricted. Log in as owner/VIP." },
        { status: 403 },
      );
    }

    const form = await req.formData();
    const companion = String(form.get("companion") || "koharu");
    let kind = String(form.get("kind") || "library") as MediaKind;
    if (!["library", "videos", "generated"].includes(kind)) kind = "library";

    const useBlob = blobEnabled();
    if (!useBlob) {
      try {
        ensureMediaDirs(companion);
      } catch {
        /* */
      }
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
            error: "Unsupported type",
          });
          continue;
        }
        if (file.size > 4.5 * 1024 * 1024) {
          failed.push({
            name: file.name,
            error:
              "File too large for this route — use Media Manager (direct cloud/CDN upload)",
          });
          continue;
        }

        const buf = Buffer.from(await file.arrayBuffer());
        if (useBlob) {
          saved.push(
            await blobUpload(companion, kind, file.name, buf, file.type || undefined),
          );
        } else {
          const item = saveUploadedFile(companion, kind, file.name, buf);
          // Rewrite URL to public CDN if configured
          const base = mediaPublicBase();
          if (base) {
            item.url = `${base}/${item.companionId}/${item.kind}/${item.name}`;
            item.storage = "cdn";
          }
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
      storage: useBlob ? "blob" : cdnEnabled() ? "cdn" : "disk",
      permanent: useBlob || cdnEnabled(),
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
