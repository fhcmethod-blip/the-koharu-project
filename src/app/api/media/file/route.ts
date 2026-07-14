import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import {
  contentTypeFor,
  resolveMediaPath,
  type MediaKind,
} from "@/lib/media";

export const runtime = "nodejs";

const KINDS = new Set(["library", "generated", "videos"]);

/**
 * GET  /api/media/file?companion=koharu&kind=library&name=photo1.jpg
 * DELETE same query — requires x-user-email owner header
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
    const email = req.headers.get("x-user-email") || "";
    const tier = (req.headers.get("x-user-tier") || "").toLowerCase();
    const { isOwnerEmail } = await import("@/lib/access");
    const open = process.env.MEDIA_OPEN_UPLOAD === "1";
    const allowed =
      open || isOwnerEmail(email) || (tier === "vip" && !!email);
    if (!allowed) {
      return NextResponse.json({ error: "Owner/VIP only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const companion = searchParams.get("companion") || "";
    const kind = (searchParams.get("kind") || "library") as MediaKind;
    const name = searchParams.get("name") || "";

    if (!companion || !name || !KINDS.has(kind)) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const { deleteMediaFile } = await import("@/lib/media");
    const ok = deleteMediaFile(companion, kind, name);
    if (!ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
