import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { isOwnerEmail } from "@/lib/access";

export const runtime = "nodejs";

/**
 * Token exchange for direct browser → Vercel Blob uploads.
 * Required for files larger than ~4.5MB (Vercel function body limit).
 * Supports multi‑GB videos.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // clientPayload: JSON { email, tier, companion, kind }
        let email = "";
        let tier = "";
        try {
          if (clientPayload) {
            const p = JSON.parse(clientPayload) as {
              email?: string;
              tier?: string;
            };
            email = (p.email || "").toLowerCase();
            tier = (p.tier || "").toLowerCase();
          }
        } catch {
          /* ignore */
        }

        // Also accept headers if client sends them on the token request
        const hEmail = (
          request.headers.get("x-user-email") ||
          ""
        ).toLowerCase();
        const hTier = (request.headers.get("x-user-tier") || "").toLowerCase();
        email = email || hEmail;
        tier = tier || hTier;

        const open = process.env.MEDIA_OPEN_UPLOAD === "1";
        const allowed =
          open || isOwnerEmail(email) || (tier === "vip" && !!email);

        if (!allowed) {
          throw new Error(
            "Upload not allowed. Log in as owner/VIP (Account → full access).",
          );
        }

        // Only allow our vault path layout
        if (!pathname.startsWith("vault/")) {
          throw new Error("Invalid upload path");
        }

        return {
          // Wide types for photos + large videos
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/avif",
            "video/mp4",
            "video/webm",
            "video/quicktime",
            "video/x-m4v",
            "video/x-matroska",
            "application/octet-stream",
          ],
          // 5 GB max per file (adjust if your plan allows more)
          maximumSizeInBytes: 5 * 1024 * 1024 * 1024,
          addRandomSuffix: false,
          allowOverwrite: true,
          tokenPayload: JSON.stringify({ email, tier }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // Optional: log / index — list API already discovers blobs by prefix
        console.log("vault blob ready", blob.pathname, blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "upload token failed" },
      { status: 400 },
    );
  }
}
