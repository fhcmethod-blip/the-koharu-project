import { NextRequest, NextResponse } from "next/server";
import { getCharacter } from "@/lib/characters";
import {
  buildFooocusBridgeBody,
  type ImageGenOverrides,
} from "@/lib/image-presets";
import type { ImageMode } from "@/lib/image-presets";

export const runtime = "nodejs";
export const maxDuration = 60;

function publicBridgeUrl(): string {
  return (
    process.env.NEXT_PUBLIC_FOOOCUS_API_URL ||
    process.env.FOOOCUS_API_URL ||
    ""
  ).replace(/\/$/, "");
}

/**
 * POST /api/image/jobs
 * Starts an async Fooocus job (via public bridge URL).
 * Uses companions/json/{id}.json generation params.
 * Accepts overrides for custom companions / Creator portraits:
 *   look, appearance, gender, profilePrompt, companionName, mode
 * If prepareOnly=true, returns the bridge payload so the browser can POST
 * directly to the tunnel (when Vercel cannot reach the home PC).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const companionId = String(body.companionId || "koharu");
    const prompt = String(body.prompt || "show");
    const prepareOnly = Boolean(body.prepareOnly);
    const character = getCharacter(companionId);

    const overrides: ImageGenOverrides = {};
    if (body.look) overrides.look = String(body.look);
    if (body.appearance) overrides.appearance = String(body.appearance);
    if (body.gender === "male" || body.gender === "female") {
      overrides.gender = body.gender;
    }
    if (body.profilePrompt) overrides.profilePrompt = String(body.profilePrompt);
    if (body.defaultScene) overrides.defaultScene = String(body.defaultScene);
    if (body.companionName) overrides.companionName = String(body.companionName);

    const companionName =
      overrides.companionName ||
      character?.name ||
      (companionId.startsWith("custom-") ? "Custom" : companionId);
    const appearance =
      overrides.appearance || character?.appearance || "";

    // Prefer character.look / imageMode for customs if body didn't send them
    if (!overrides.look && character?.look) overrides.look = character.look;
    if (!overrides.gender && character?.gender) overrides.gender = character.gender;
    if (!overrides.profilePrompt && character?.profilePrompt) {
      overrides.profilePrompt = character.profilePrompt;
    }

    const forcedMode =
      (body.mode as ImageMode | null) ||
      character?.imageMode ||
      null;

    const { mode, bridgeBody } = buildFooocusBridgeBody({
      companionId,
      companionName,
      appearance,
      userText: prompt,
      mode: forcedMode,
      requireBase64: false,
      overrides: Object.keys(overrides).length ? overrides : undefined,
    });

    const secret =
      process.env.FOOOCUS_BRIDGE_SECRET ||
      process.env.NEXT_PUBLIC_FOOOCUS_BRIDGE_SECRET ||
      "";

    if (prepareOnly) {
      // Include secret so the browser can POST/poll the public tunnel even when
      // NEXT_PUBLIC_* was missing from the client bundle at build time.
      return NextResponse.json({
        ok: true,
        prepareOnly: true,
        mode,
        bridgeBody,
        publicBridgeUrl: publicBridgeUrl(),
        bridgeSecret: secret || undefined,
      });
    }

    const base = (process.env.FOOOCUS_API_URL || "http://127.0.0.1:8888").replace(
      /\/$/,
      "",
    );

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (secret) headers["x-bridge-secret"] = secret;

    const jobUrl = secret
      ? `${base}/v1/jobs?secret=${encodeURIComponent(secret)}`
      : `${base}/v1/jobs`;

    const res = await fetch(jobUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(bridgeBody),
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
          hint: "Image service busy. Retry shortly.",
          mode,
          bridgeBody,
          publicBridgeUrl: publicBridgeUrl(),
          bridgeSecret: secret || undefined,
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
        hint: "Image service unavailable. Please try again later.",
        publicBridgeUrl: publicBridgeUrl(),
        bridgeSecret:
          process.env.FOOOCUS_BRIDGE_SECRET ||
          process.env.NEXT_PUBLIC_FOOOCUS_BRIDGE_SECRET ||
          undefined,
      },
      { status: 502 },
    );
  }
}
