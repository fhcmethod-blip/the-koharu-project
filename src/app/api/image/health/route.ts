import { NextResponse } from "next/server";
import { fooocusHealth, ponyHealth } from "@/lib/image-gen";

export const runtime = "nodejs";

/** GET /api/image/health */
export async function GET() {
  const provider = (process.env.IMAGE_PROVIDER || "fooocus").toLowerCase();
  const fooocus = await fooocusHealth();
  const pony = await ponyHealth();

  const active =
    provider === "pony"
      ? pony
      : provider === "openrouter"
        ? { ok: !!process.env.OPENROUTER_API_KEY, url: "openrouter" }
        : fooocus;

  return NextResponse.json({
    provider,
    active,
    fooocus,
    pony,
    hint:
      provider === "fooocus"
        ? fooocus.ok
          ? "Fooocus is up — chat image gen uses Fooocus."
          : "Start Fooocus-API (default http://127.0.0.1:8888). See media/FOOOCUS-SETUP.md"
        : provider === "pony"
          ? pony.ok
            ? "Pony/A1111 is up."
            : "Start Forge/A1111 with --api on port 7860."
          : "Using OpenRouter image models.",
  });
}
