import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import {
  contentTypeFor,
  resolveMediaPath,
  type MediaKind,
} from "@/lib/media";
import { blobDelete, blobEnabled, blobListCompanion } from "@/lib/media-blob";
import { canListKind, identityFromRequest } from "@/lib/vault-auth";
import { mediaTierRequired, tierLabels } from "@/lib/vault";

export const runtime = "nodejs";

const KINDS = new Set(["library", "generated", "videos"]);

/**
 * GET  — serve local disk file only if membership allows
 * DELETE — owner/VIP
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companion = searchParams.get("companion") || "";
    const kind = (searchParams.get("kind") || "library") as MediaKind;
    const name = searchParams.get("name") || "";

    if (!companion || !name) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }
    if (!KINDS.has(kind)) {
      return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    }

    const id = identityFromRequest(req);
    if (!canListKind(id, kind)) {
      return NextResponse.json(
        {
          error: "Membership required",
          required: mediaTierRequired(kind),
          requiredLabel: tierLabels[mediaTierRequired(kind)],
          yourTier: id.tier,
        },
        { status: 403 },
      );
    }

    // Blob CDN is public if URL was leaked — prefer not redirecting free users
    // (they never receive URLs from list). Paying users may use CDN URLs directly.
    if (blobEnabled()) {
      try {
        const cloud = await blobListCompanion(companion, kind);
        const hit = cloud.find((i) => i.name === name);
        if (hit?.url) {
          return NextResponse.redirect(hit.url, 302);
        }
      } catch {
        /* fall through to disk */
      }
    }

    const full = resolveMediaPath(companion, kind, name);
    if (!fs.existsSync(full)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const buf = fs.readFileSync(full);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentTypeFor(name),
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        "Content-Length": String(buf.length),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = identityFromRequest(req);
    const open = process.env.MEDIA_OPEN_UPLOAD === "1";
    const allowed =
      open || id.isOwner || (id.tier === "vip" && !!id.email);
    if (!allowed) {
      return NextResponse.json({ error: "Owner/VIP only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const companion = searchParams.get("companion") || "";
    const kind = (searchParams.get("kind") || "library") as MediaKind;
    const name = searchParams.get("name") || "";
    const blobUrl = searchParams.get("url") || "";

    if (!companion || !name || !KINDS.has(kind)) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    let deleted = false;

    if (blobEnabled()) {
      if (blobUrl.startsWith("http")) {
        const { blobDeleteByUrl } = await import("@/lib/media-blob");
        deleted = (await blobDeleteByUrl(blobUrl)) || deleted;
      }
      deleted = (await blobDelete(companion, kind, name)) || deleted;
    }

    try {
      const { deleteMediaFile } = await import("@/lib/media");
      deleted = deleteMediaFile(companion, kind, name) || deleted;
    } catch {
      /* no disk copy */
    }

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
