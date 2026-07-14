import { NextRequest, NextResponse } from "next/server";
import { generateCompanionImage } from "@/lib/image-gen";
import { pickRandomLibraryImage, wantsGenerated } from "@/lib/media";
import { getCharacter } from "@/lib/characters";

export const runtime = "nodejs";

/**
 * POST /api/image
 * body: { companionId, prompt, prefer?: "generate" | "library" | "auto" }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const companionId = String(body.companionId || "koharu");
    const prompt = String(body.prompt || "portrait selfie");
    const prefer = (body.prefer as string) || "auto";
    const mode = body.mode as string | undefined;

    const character = getCharacter(companionId);
    const wantGen =
      prefer === "generate" ||
      (prefer === "auto" && wantsGenerated(prompt));

    if (wantGen || prefer === "generate") {
      const gen = await generateCompanionImage({
        companionId,
        companionName: character?.name || companionId,
        appearance: character?.appearance || "attractive adult woman",
        userPrompt: prompt,
        mode: mode as "lust" | "pony" | "realistic" | null,
      });
      if (gen.ok && gen.imageUrl) {
        return NextResponse.json({
          imageUrl: gen.imageUrl,
          source: "generated",
          model: gen.model,
        });
      }
      // fall through to library if gen fails
      const lib = pickRandomLibraryImage(companionId);
      if (lib) {
        return NextResponse.json({
          imageUrl: lib.url,
          source: "library-fallback",
          note: gen.error || "Generation failed; used library photo",
        });
      }
      return NextResponse.json(
        { error: gen.error || "No image available" },
        { status: 502 },
      );
    }

    // Library first
    const lib = pickRandomLibraryImage(companionId);
    if (lib) {
      return NextResponse.json({
        imageUrl: lib.url,
        source: "library",
        name: lib.name,
      });
    }

    // Generate if no library
    const gen = await generateCompanionImage({
      companionId,
      companionName: character?.name || companionId,
      appearance: character?.appearance || "attractive adult woman",
      userPrompt: prompt,
      mode: mode as "lust" | "pony" | "realistic" | null,
    });
    if (gen.ok && gen.imageUrl) {
      return NextResponse.json({
        imageUrl: gen.imageUrl,
        source: "generated",
        model: gen.model,
        mode: gen.mode,
      });
    }

    return NextResponse.json(
      {
        error:
          gen.error ||
          "No library images yet. Drop files into media/koharu/library/",
      },
      { status: 404 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
