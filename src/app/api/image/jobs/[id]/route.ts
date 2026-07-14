import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * GET /api/image/jobs/[id]
 * Poll Fooocus bridge job. When done, returns imageUrl (data URL).
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

    const base = (process.env.FOOOCUS_API_URL || "http://127.0.0.1:8888").replace(
      /\/$/,
      "",
    );
    const secret = process.env.FOOOCUS_BRIDGE_SECRET || "";
    const headers: Record<string, string> = {};
    if (secret) headers["x-bridge-secret"] = secret;

    const res = await fetch(`${base}/v1/jobs/${encodeURIComponent(id)}`, {
      headers,
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      status?: string;
      error?: string;
      base64?: string;
      detail?: string;
    };

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || data.detail || `HTTP ${res.status}` },
        { status: res.status },
      );
    }

    if (data.status === "done" && data.base64) {
      // Prefer data URL so Vercel doesn't need disk
      const imageUrl = `data:image/png;base64,${data.base64}`;
      return NextResponse.json({
        ok: true,
        status: "done",
        imageUrl,
        source: "fooocus",
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
