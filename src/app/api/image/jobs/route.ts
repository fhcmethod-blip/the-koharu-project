import { NextRequest, NextResponse } from "next/server";
import { getCharacter } from "@/lib/characters";
import {
  buildCompanionImagePrompt,
  resolveImageMode,
} from "@/lib/image-presets";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/image/jobs
 * Starts an async Fooocus job (via public bridge URL).
 * If prepareOnly=true, returns the bridge payload so the browser can POST
 * directly to the tunnel (when Vercel cannot reach the home PC).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const companionId = String(body.companionId || "koharu");
    const prompt = String(body.prompt || "show");
    const prepareOnly = Boolean(body.prepareOnly);
    const mode = resolveImageMode(
      companionId,
      prompt,
      body.mode as string | null,
    );
    const character = getCharacter(companionId);
    const built = buildCompanionImagePrompt({
      companionId,
      companionName: character?.name || companionId,
      appearance: character?.appearance || "",
      userText: prompt,
      mode,
    });

    const bridgeBody = {
      prompt: built.prompt,
      negative_prompt: built.negative,
      style_selections: built.config.styles,
      performance_selection:
        process.env.FOOOCUS_PERFORMANCE || built.config.performance,
      aspect_ratios_selection:
        process.env.FOOOCUS_ASPECT || built.config.aspect,
      image_number: 1,
      sharpness: built.config.sharpness,
      guidance_scale: built.config.cfg,
      base_model_name: process.env.FOOOCUS_MODEL || built.config.model,
      require_base64: false,
    };

    if (prepareOnly) {
      return NextResponse.json({
        ok: true,
        prepareOnly: true,
        mode,
        bridgeBody,
        publicBridgeUrl: (
          process.env.NEXT_PUBLIC_FOOOCUS_API_URL ||
          process.env.FOOOCUS_API_URL ||
          ""
        ).replace(/\/$/, ""),
      });
    }

    const base = (process.env.FOOOCUS_API_URL || "http://127.0.0.1:8888").replace(
      /\/$/,
      "",
    );
    const secret = process.env.FOOOCUS_BRIDGE_SECRET || "";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (secret) headers["x-bridge-secret"] = secret;

    const res = await fetch(`${base}/v1/jobs`, {
      method: "POST",
      headers,
      body: JSON.stringify(bridgeBody),
      signal: AbortSignal.timeout(30_000),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Let the client fall back to direct browser→bridge
      return NextResponse.json(
        {
          error:
            (data as { error?: string; detail?: string }).error ||
            (data as { detail?: string }).detail ||
            `Bridge HTTP ${res.status}`,
          hint: "Is Fooocus + bridge running? Browser will try direct tunnel.",
          mode,
          bridgeBody,
          publicBridgeUrl: (
            process.env.NEXT_PUBLIC_FOOOCUS_API_URL ||
            process.env.FOOOCUS_API_URL ||
            ""
          ).replace(/\/$/, ""),
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      id: (data as { id?: string }).id,
      token: (data as { token?: string }).token,
      status: (data as { status?: string }).status || "queued",
      mode,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "job start failed";
    return NextResponse.json(
      {
        error: message,
        hint: "Set FOOOCUS_API_URL / NEXT_PUBLIC_FOOOCUS_API_URL to https://fooocus.thekoharuproject.com",
      },
      { status: 502 },
    );
  }
}
