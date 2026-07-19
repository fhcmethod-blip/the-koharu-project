import { NextResponse } from "next/server";
import { mediaPublicBase } from "@/lib/media";
import { blobEnabled } from "@/lib/media-blob";
import { cdnEnabled } from "@/lib/media-cdn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function probe(
  url: string,
  timeoutMs = 6000,
): Promise<{ ok: boolean; status?: number; detail?: string }> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return {
      ok: res.ok,
      status: res.status,
      detail: res.ok ? "ok" : `HTTP ${res.status}`,
    };
  } catch (e) {
    return {
      ok: false,
      detail: e instanceof Error ? e.message : "unreachable",
    };
  }
}

/**
 * GET /api/system/status
 * Green/red for live stack — Blob is optional when Media CDN works.
 */
export async function GET() {
  const fooocusBase = (
    process.env.FOOOCUS_API_URL ||
    process.env.NEXT_PUBLIC_FOOOCUS_API_URL ||
    ""
  ).replace(/\/$/, "");
  const mediaBase = mediaPublicBase();

  const [fooocus, media] = await Promise.all([
    fooocusBase
      ? probe(`${fooocusBase}/health`)
      : Promise.resolve({ ok: false, detail: "FOOOCUS_API_URL not set" }),
    mediaBase
      ? probe(`${mediaBase}/health`)
      : Promise.resolve({
          ok: false,
          detail: "MEDIA_PUBLIC_BASE not set",
        }),
  ]);

  const hasBlob = blobEnabled();
  const hasCdn = cdnEnabled() && media.ok;

  // Blob is only a real problem if CDN is also down
  const blobOk = hasBlob || hasCdn;
  const blobDetail = hasBlob
    ? "token present"
    : hasCdn
      ? "not needed — Media CDN is serving vault"
      : "disabled / quota — enable R2 or fix Blob for always-on vault";

  const checks = {
    site: { ok: true, detail: "vercel", optional: false },
    fooocusBridge: {
      ok: fooocus.ok,
      url: fooocusBase || null,
      detail: fooocus.detail,
      optional: false,
      needs: fooocus.ok
        ? null
        : "Start Fooocus + bridge on PC; tunnel fooocus.thekoharuproject.com",
    },
    mediaCdn: {
      ok: media.ok,
      url: mediaBase || null,
      detail: media.detail,
      optional: false,
      needs: media.ok
        ? null
        : "Start Media CDN on PC :8890; path https://fooocus.thekoharuproject.com/media-cdn",
    },
    blob: {
      ok: blobOk,
      detail: blobDetail,
      optional: true,
      needs:
        hasBlob || hasCdn
          ? null
          : "Vercel Blob quota hit. Use Media CDN (PC on) or set up Cloudflare R2.",
    },
    cdnConfigured: {
      ok: cdnEnabled(),
      detail: mediaBase || "not set",
      optional: true,
    },
  };

  const blockers = Object.entries(checks)
    .filter(
      ([, v]) =>
        !v.ok &&
        !(v as { optional?: boolean }).optional &&
        "needs" in v &&
        (v as { needs?: string | null }).needs,
    )
    .map(([k, v]) => ({
      id: k,
      needs: (v as { needs?: string }).needs,
    }));

  return NextResponse.json({
    ok: checks.site.ok && checks.fooocusBridge.ok && checks.mediaCdn.ok,
    time: new Date().toISOString(),
    checks,
    blockers,
    nextSteps: blockers.map((b) => b.needs).filter(Boolean),
    note:
      "Vercel Blob red/disabled is OK if Media CDN is green — vault uses your PC tunnel while the PC is on.",
  });
}
