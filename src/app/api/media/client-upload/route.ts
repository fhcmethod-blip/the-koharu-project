import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { isOwnerEmail } from "@/lib/access";

export const runtime = "nodejs";

/**
 * Browser → Vercel Blob direct upload (multi‑GB videos).
 * Files land on the public CDN and play on any device.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let email = "";
        let tier = "";
        try {
          if (clientPayload) {
            const p = JSON.parse(clientPayload) as {
              email?: string;
              tier?: string;
            };
            email = (p.email || "").trim().toLowerCase();
            tier = (p.tier || "").trim().toLowerCase();
          }
        } catch {
          /* ignore bad payload */
        }

        email =
          email ||
          (request.headers.get("x-user-email") || "").trim().toLowerCase();
        tier =
          tier ||
          (request.headers.get("x-user-tier") || "").trim().toLowerCase();

        const open = process.env.MEDIA_OPEN_UPLOAD === "1";
        const allowed =
          open ||
          isOwnerEmail(email) ||
          (Boolean(email) && (tier === "vip" || tier === "plus"));

        if (!allowed) {
          throw new Error(
            "Cloud upload blocked. Log in, open Account, set VIP / full access, then try again.",
          );
        }

        if (!pathname.startsWith("vault/")) {
          throw new Error("Invalid upload path (must be vault/...)");
        }

        return {
          // Allow any content type — phones/cameras use odd MIME types
          maximumSizeInBytes: 5 * 1024 * 1024 * 1024,
          addRandomSuffix: false,
          allowOverwrite: true,
          tokenPayload: JSON.stringify({ email, tier, pathname }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // Never throw — a failed callback must not look like a failed upload
        console.log("[vault] cloud upload complete", blob.pathname, blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("[vault] client-upload error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "upload token failed" },
      { status: 400 },
    );
  }
}
