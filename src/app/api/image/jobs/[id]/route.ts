import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * GET /api/image/jobs/[id]
 * Poll Fooocus bridge job. When done, returns imageUrl pointing at the
 * public bridge (file URL) — does NOT pull multi-MB base64 through Next.js
 * (that was crashing the local site during image gen).
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const base = (
      process.env.NEXT_PUBLIC_FOOOCUS_API_URL ||
      process.env.FOOOCUS_API_URL ||
      "http://127.0.0.1:8888"
    ).replace(/\/$/, "");
    const secret =
      process.env.FOOOCUS_BRIDGE_SECRET ||
      process.env.NEXT_PUBLIC_FOOOCUS_BRIDGE_SECRET ||
      "";
    const headers: Record<string, string> = {};
    if (secret) headers["x-bridge-secret"] = secret;

    const pollUrl = secret
      ? `${base}/v1/jobs/${encodeURIComponent(id)}?secret=${encodeURIComponent(secret)}`
      : `${base}/v1/jobs/${encodeURIComponent(id)}`;

    const res = await fetch(pollUrl, {
      headers,
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      status?: string;
      error?: string;
      detail?: string;
      image_url?: string;
      media_url?: string;
      token?: string;
      base64?: string;
    };

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || data.detail || `HTTP ${res.status}` },
        { status: res.status },
      );
    }

    if (data.status === "done") {
      // Prefer permanent media-cdn URL (survives job expiry; already on PC).
      // Then bridge job image URL. Fallback to base64 only if old bridge.
      let imageUrl: string | undefined;
      if (data.media_url && /^https?:\/\//i.test(data.media_url)) {
        imageUrl = data.media_url;
      } else if (data.image_url) {
        imageUrl = data.image_url.startsWith("http")
          ? data.image_url
          : `${base}${data.image_url.startsWith("/") ? "" : "/"}${data.image_url}`;
      } else if (data.token) {
        imageUrl = `${base}/v1/jobs/${encodeURIComponent(id)}/image?t=${encodeURIComponent(data.token)}`;
      } else if (data.base64) {
        imageUrl = `data:image/png;base64,${data.base64}`;
      }

      if (imageUrl) {
        return NextResponse.json({
          ok: true,
          status: "done",
          imageUrl,
          mediaUrl: data.media_url || undefined,
          source: "fooocus",
        });
      }

      return NextResponse.json({
        ok: false,
        status: "error",
        error: "Job done but no image URL from bridge",
      });
    }

    if (data.status === "error") {
      return NextResponse.json({
        ok: false,
        status: "error",
        error: data.error || "generate failed",
      });
    }

    return NextResponse.json({
      ok: true,
      status: data.status || "running",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "poll failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
