import { NextRequest, NextResponse } from "next/server";
import { getCharacter } from "@/lib/characters";
import {
  buildCompanionImagePrompt,
  resolveImageMode,
  type ImageMode,
} from "@/lib/image-presets";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/image/jobs
 * Starts an async Fooocus job (via public bridge URL).
 * Returns quickly — poll GET /api/image/jobs/[id]
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const companionId = String(body.companionId || "koharu");
    const prompt = String(body.prompt || "show");
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
      body: JSON.stringify({
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
        require_base64: true,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        {
          error:
            (data as { error?: string; detail?: string }).error ||
            (data as { detail?: string }).detail ||
            `Bridge HTTP ${res.status}`,
          hint: "Is Fooocus + bridge running? FOOOCUS_API_URL must be public for Vercel.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      id: (data as { id?: string }).id,
      status: (data as { status?: string }).status || "queued",
      mode,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "job start failed";
    return NextResponse.json(
      {
        error: message,
        hint: "Set FOOOCUS_API_URL to your public tunnel (e.g. https://fooocus.thekoharuproject.com)",
      },
      { status: 502 },
    );
  }
}
