import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { isOwnerEmail } from "@/lib/access";
import {
  canAccessTierVault,
  contentTypeFor,
  resolveVaultFilePath,
} from "@/lib/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLIC_TIERS = new Set(["free", "plus", "vip"]);

/**
 * GET /api/vault/file?tier=private|free|plus|vip&type=photos|videos&name=…
 *
 * Private tier: **owner email only** (never VIP subscribers).
 * Other tiers: membership rank + session cookie.
 * Files stream from VAULT_ROOT on the PC (or empty on Vercel without disk).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tier = (searchParams.get("tier") || "").toLowerCase().trim();
    const type = (searchParams.get("type") || "").toLowerCase().trim();
    const name = searchParams.get("name") || "";

    if (!tier || !name) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }
    if (type !== "photos" && type !== "videos") {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    if (tier !== "private" && !PUBLIC_TIERS.has(tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    const session = await getSessionFromRequest(req);
    const email = session?.email || "";
    const userTier = (session?.tier as "free" | "plus" | "vip") || "free";
    const owner = isOwnerEmail(email);

    if (tier === "private") {
      if (!owner) {
        return NextResponse.json(
          { error: "Private vault — owner only" },
          { status: 403 },
        );
      }
    } else {
      // Paid / free tier folders
      const effectiveTier: "free" | "plus" | "vip" = owner
        ? "vip"
        : userTier;
      if (!canAccessTierVault(effectiveTier, tier as "free" | "plus" | "vip")) {
        return NextResponse.json(
          { error: "Membership required", required: tier, yourTier: userTier },
          { status: 403 },
        );
      }
    }

    let full = resolveVaultFilePath(tier, type as "photos" | "videos", name);

    // Private fallback: media/_private on this machine
    if (!full && tier === "private") {
      try {
        const { mediaRoot, sanitizeFileName, isAllowedMedia } = await import(
          "@/lib/media"
        );
        const path = await import("path");
        const fs2 = await import("fs");
        const safeName = sanitizeFileName(name);
        if (isAllowedMedia(safeName)) {
          const kind = type === "photos" ? "library" : "videos";
          const candidate = path.join(mediaRoot(), "_private", kind, safeName);
          const root = path.join(mediaRoot(), "_private", kind);
          if (
            fs2.existsSync(candidate) &&
            path.resolve(candidate).startsWith(path.resolve(root))
          ) {
            full = candidate;
          }
        }
      } catch {
        /* ignore */
      }
    }

    // Private on Vercel: pull from home PC Media CDN with secret (never public)
    if (!full && tier === "private") {
      const cdnBase = (
        process.env.MEDIA_PUBLIC_BASE ||
        process.env.NEXT_PUBLIC_MEDIA_PUBLIC_BASE ||
        ""
      ).replace(/\/$/, "");
      const secret =
        process.env.MEDIA_CDN_SECRET ||
        process.env.FOOOCUS_BRIDGE_SECRET ||
        "";
      if (cdnBase && secret) {
        const kind = type === "photos" ? "library" : "videos";
        const remote = `${cdnBase}/_private/${kind}/${encodeURIComponent(name)}`;
        try {
          const r = await fetch(remote, {
            headers: { "x-media-secret": secret },
            signal: AbortSignal.timeout(60_000),
          });
          if (r.ok) {
            const buf = Buffer.from(await r.arrayBuffer());
            return new NextResponse(buf, {
              status: 200,
              headers: {
                "Content-Type": contentTypeFor(name),
                "Cache-Control": "private, no-store",
                "X-Content-Type-Options": "nosniff",
                "Content-Length": String(buf.length),
              },
            });
          }
        } catch {
          /* fall through */
        }
      }
    }

    if (!full) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const buf = fs.readFileSync(full);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentTypeFor(name),
        // Never let shared caches store private media
        "Cache-Control":
          tier === "private"
            ? "private, no-store"
            : "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        "Content-Length": String(buf.length),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
