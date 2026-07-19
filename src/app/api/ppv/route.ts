import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { isOwnerEmail } from "@/lib/access";
import { createPpvItem } from "@/lib/ppv-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session?.email || !isOwnerEmail(session.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const mediaUrl = formData.get("mediaUrl") as string;
    const thumbnailUrl = formData.get("thumbnailUrl") as string;
    const priceCents = parseInt(formData.get("priceCents") as string, 10);
    const tierRequired = formData.get("tierRequired") as "any" | "plus" | "vip";

    if (!title || !mediaUrl || !priceCents || priceCents < 100) {
      return NextResponse.json(
        { error: "Missing required fields or invalid price" },
        { status: 400 }
      );
    }

    const item = await createPpvItem({
      title,
      description: description || "",
      mediaUrl,
      thumbnailUrl: thumbnailUrl || mediaUrl,
      priceCents,
      tierRequired: tierRequired || "any",
    });

    return NextResponse.json({ ok: true, item });
  } catch (error) {
    console.error("PPV create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create PPV item" },
      { status: 500 }
    );
  }
}
