import { NextRequest, NextResponse } from "next/server";
import { isOwnerEmail } from "@/lib/access";
import { getSessionFromCookies } from "@/lib/auth/session";
import { vaultMediaDir, ensureVaultDirs } from "@/lib/media";

export const runtime = "nodejs";

/**
 * POST /api/ppv/upload
 * Owner-only: upload files directly to vault tier folders.
 * Used by the desktop admin app.
 * Body: multipart/form-data with fields: file, tier, type
 * Tier: free | plus | vip | private
 * Type: photos | videos
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session || !isOwnerEmail(session.email)) {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const tier = (formData.get("tier") as string || "free").toLowerCase();
    const type = (formData.get("type") as string || "photos").toLowerCase();

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    if (!["free", "plus", "vip", "private"].includes(tier)) {
      return NextResponse.json(
        { error: "Invalid tier. Use free, plus, vip, or private." },
        { status: 400 },
      );
    }
    if (!["photos", "videos"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Use photos or videos." },
        { status: 400 },
      );
    }

    ensureVaultDirs();
    const dir = vaultMediaDir(tier as "free" | "plus" | "vip" | "private", type as "photos" | "videos");

    // Sanitize filename
    let name = file.name || "upload.bin";
    name = name.replace(/[^a-zA-Z0-9._\- ()[\]]/g, "_");
    if (!name || name.length > 200) {
      return NextResponse.json({ error: "Invalid file name." }, { status: 400 });
    }

    const targetPath = `${dir}/${name}`;

    // Write to disk
    const fs = await import("fs/promises");
    const path = await import("path");
    await fs.mkdir(path.dirname(targetPath), { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(targetPath, buffer);

    return NextResponse.json({
      ok: true,
      tier,
      type,
      name,
      size: buffer.length,
      path: targetPath,
    });
  } catch (e) {
    console.error("ppv/upload", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: "Upload failed." },
      { status: 500 },
    );
  }
}