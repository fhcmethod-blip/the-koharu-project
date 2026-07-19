import { NextRequest, NextResponse } from "next/server";
import {
  listVaultMedia,
  canAccessTierVault,
  ensureVaultDirs,
} from "@/lib/media";
import { getSessionFromRequest } from "@/lib/auth/session";
import { isOwnerEmail } from "@/lib/access";

async function fetchVaultFromCdn(
  cdnBase: string,
  secret: string,
): Promise<{
  free: { photos: any[]; videos: any[] };
  plus: { photos: any[]; videos: any[] };
  vip: { photos: any[]; videos: any[] };
  private: { photos: any[]; videos: any[] };
} | null> {
  try {
    const vaultIndexUrl = cdnBase.endsWith("/media-cdn")
      ? `${cdnBase}/vault-index.json`
      : cdnBase.includes("/media-cdn")
        ? `${cdnBase.replace(/\/media-cdn.*$/, "")}/media-cdn/vault-index.json`
        : `${cdnBase}/media-cdn/vault-index.json`;

    const headers: Record<string, string> = {};
    if (secret) {
      headers["x-media-secret"] = secret;
    }

    const r = await fetch(vaultIndexUrl, {
      headers,
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) return null;
    const data = (await r.json()) as {
      ok?: boolean;
      content?: Record<
        string,
        {
          photos?: Array<{
            id: string;
            name: string;
            url: string;
            size?: number;
            mtime?: number;
            mediaType?: string;
          }>;
          videos?: Array<{
            id: string;
            name: string;
            url: string;
            size?: number;
            mtime?: number;
            mediaType?: string;
          }>;
        }
      >;
    };
    if (!data.ok || !data.content) return null;

    const result: {
      free: { photos: any[]; videos: any[] };
      plus: { photos: any[]; videos: any[] };
      vip: { photos: any[]; videos: any[] };
      private: { photos: any[]; videos: any[] };
    } = {
      free: { photos: [], videos: [] },
      plus: { photos: [], videos: [] },
      vip: { photos: [], videos: [] },
      private: { photos: [], videos: [] },
    };

    // Build the CDN base URL for file serving
    const cdnFileBase = cdnBase.endsWith("/media-cdn")
      ? cdnBase
      : cdnBase.includes("/media-cdn")
        ? cdnBase.replace(/\/media-cdn.*$/, "") + "/media-cdn"
        : cdnBase + "/media-cdn";

    for (const tier of ["free", "plus", "vip", "private"]) {
      const tierData = data.content[tier];
      if (!tierData) continue;
      for (const it of tierData.photos || []) {
        result[tier as keyof typeof result].photos.push({
          id: it.id,
          name: it.name,
          url: `${cdnFileBase}/vault/${tier}/photos/${encodeURIComponent(it.name)}`,
          size: it.size || 0,
          mtime: it.mtime || 0,
          mediaType: "image",
          storage: "cdn",
        });
      }
      for (const it of tierData.videos || []) {
        result[tier as keyof typeof result].videos.push({
          id: it.id,
          name: it.name,
          url: `${cdnFileBase}/vault/${tier}/videos/${encodeURIComponent(it.name)}`,
          size: it.size || 0,
          mtime: it.mtime || 0,
          mediaType: "video",
          storage: "cdn",
        });
      }
    }
    return result;
  } catch {
    /* PC offline */
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    ensureVaultDirs();
    const session = await getSessionFromRequest(req);

    const email = session?.email || "";
    const owner = isOwnerEmail(email);
    // Get user tier (default to free); owners treated as vip for public tiers
    const userTier = owner
      ? "vip"
      : ((session?.tier as "free" | "plus" | "vip") || "free");

    // Try local disk first (dev / local server)
    let freePhotos = listVaultMedia("free", "photos");
    let freeVideos = listVaultMedia("free", "videos");

    let plusPhotos = canAccessTierVault(userTier, "plus")
      ? listVaultMedia("plus", "photos")
      : [];
    let plusVideos = canAccessTierVault(userTier, "plus")
      ? listVaultMedia("plus", "videos")
      : [];

    let vipPhotos = canAccessTierVault(userTier, "vip")
      ? listVaultMedia("vip", "photos")
      : [];
    let vipVideos = canAccessTierVault(userTier, "vip")
      ? listVaultMedia("vip", "videos")
      : [];

    let privatePhotos = owner ? listVaultMedia("private", "photos") : [];
    let privateVideos = owner ? listVaultMedia("private", "videos") : [];

    // Fallback to CDN when local disk has no content (Vercel typically)
    const cdnBase = (
      process.env.MEDIA_PUBLIC_BASE ||
      process.env.NEXT_PUBLIC_MEDIA_PUBLIC_BASE ||
      ""
    ).replace(/\/$/, "");
    const secret =
      process.env.MEDIA_CDN_SECRET ||
      process.env.FOOOCUS_BRIDGE_SECRET ||
      "";

    if (
      freePhotos.length === 0 &&
      freeVideos.length === 0 &&
      plusPhotos.length === 0 &&
      plusVideos.length === 0 &&
      vipPhotos.length === 0 &&
      vipVideos.length === 0 &&
      cdnBase
    ) {
      const cdnData = await fetchVaultFromCdn(cdnBase, secret);
      if (cdnData) {
        freePhotos = cdnData.free.photos;
        freeVideos = cdnData.free.videos;
        if (canAccessTierVault(userTier, "plus")) {
          plusPhotos = cdnData.plus.photos;
          plusVideos = cdnData.plus.videos;
        }
        if (canAccessTierVault(userTier, "vip")) {
          vipPhotos = cdnData.vip.photos;
          vipVideos = cdnData.vip.videos;
        }
        if (owner) {
          privatePhotos = cdnData.private.photos;
          privateVideos = cdnData.private.videos;
        }
      }
    }

    // Also try CDN for private vault if empty
    if (owner && privatePhotos.length === 0 && privateVideos.length === 0 && cdnBase && secret) {
      try {
        const r = await fetch(`${cdnBase}/private-index.json`, {
          headers: { "x-media-secret": secret },
          signal: AbortSignal.timeout(15_000),
          cache: "no-store",
        });
        if (r.ok) {
          const data = (await r.json()) as {
            items?: Array<{
              name: string;
              type?: string;
              mediaType?: string;
              size?: number;
              mtime?: number;
            }>;
          };
          for (const it of data.items || []) {
            const isVid = it.type === "videos" || it.mediaType === "video";
            const entry = {
              id: `cdn-private:${it.type || "photos"}:${it.name}`,
              companionId: "private",
              kind: (isVid ? "videos" : "library") as "videos" | "library",
              mediaType: (isVid ? "video" : "image") as "video" | "image",
              name: it.name,
              url: `/api/vault/file?tier=private&type=${isVid ? "videos" : "photos"}&name=${encodeURIComponent(it.name)}`,
              size: it.size || 0,
              mtime: it.mtime || 0,
              storage: "cdn" as const,
            };
            if (isVid) privateVideos.push(entry);
            else privatePhotos.push(entry);
          }
        }
      } catch {
        /* PC offline — empty private vault */
      }
    }

    return NextResponse.json({
      userTier: session?.tier || "free",
      isOwner: owner,
      content: {
        free: {
          photos: freePhotos,
          videos: freeVideos,
          canAccess: true,
        },
        plus: {
          photos: plusPhotos,
          videos: plusVideos,
          canAccess: canAccessTierVault(userTier, "plus"),
        },
        vip: {
          photos: vipPhotos,
          videos: vipVideos,
          canAccess: canAccessTierVault(userTier, "vip"),
        },
        private: {
          photos: privatePhotos,
          videos: privateVideos,
          canAccess: owner,
        },
      },
    });
  } catch (error) {
    console.error("Vault API error:", error);
    return NextResponse.json(
      { error: "Failed to load vault content" },
      { status: 500 },
    );
  }
}
