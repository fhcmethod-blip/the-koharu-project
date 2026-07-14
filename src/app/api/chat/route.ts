import { NextRequest, NextResponse } from "next/server";
import type { Character, ChatMessage } from "@/lib/types";
import { buildSystemPrompt } from "@/lib/ai-rules";
import { generateReply as mockGenerateReply } from "@/lib/mock-ai";
import { generateCompanionImage } from "@/lib/image-gen";
import {
  pickRandomLibraryImage,
  wantsGenerated,
  wantsImage,
} from "@/lib/media";

export const runtime = "nodejs";

type Provider = "openrouter" | "xai" | "local" | "mock";

type ChatBody = {
  character: Character;
  history: ChatMessage[];
  userText: string;
  /** Client already generated image via job poll (Vercel-safe). */
  skipImage?: boolean;
  preloadedImageUrl?: string;
};

function buildMessages(
  character: Character,
  history: ChatMessage[],
  userText: string,
) {
  const system = buildSystemPrompt(character);

  const prior = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const last = prior[prior.length - 1];
  const messages =
    last?.role === "user" && last.content === userText
      ? prior
      : [...prior, { role: "user" as const, content: userText }];

  const trimmed = messages.slice(-24);
  return [{ role: "system" as const, content: system }, ...trimmed];
}

async function callOpenAICompatible(opts: {
  url: string;
  apiKey?: string;
  model: string;
  messages: { role: string; content: string }[];
  extraHeaders?: Record<string, string>;
}): Promise<{ content: string | null; error?: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.extraHeaders || {}),
  };
  if (opts.apiKey) headers.Authorization = `Bearer ${opts.apiKey}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch(opts.url, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        temperature: 0.9,
        max_tokens: 700,
        stream: false,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn("LLM HTTP error", res.status, text.slice(0, 400));
      return { content: null, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    };

    if (data.error?.message) {
      return { content: null, error: data.error.message };
    }

    const content = data.choices?.[0]?.message?.content?.trim() || null;
    return { content };
  } catch (e) {
    const message = e instanceof Error ? e.message : "request failed";
    console.warn("LLM request failed", message);
    return { content: null, error: message };
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatBody;
    const {
      character,
      history = [],
      userText,
      skipImage = false,
      preloadedImageUrl,
    } = body;

    if (!character?.id || !userText?.trim()) {
      return NextResponse.json(
        { error: "Missing character or message" },
        { status: 400 },
      );
    }

    const text = userText.trim();
    const errors: string[] = [];

    // Optional image attach — BEFORE text reply
    // On Vercel, client should poll /api/image/jobs and pass preloadedImageUrl
    // so this request stays under platform timeouts.
    let imageUrl: string | undefined = preloadedImageUrl || undefined;
    let imageSource: string | undefined = preloadedImageUrl
      ? "fooocus"
      : undefined;
    let imageError: string | undefined;
    const imageRequested = wantsImage(text) || !!preloadedImageUrl;

    if (imageRequested && !skipImage && !preloadedImageUrl) {
      // Local / long-running server only: generate inline
      const forceGen = wantsGenerated(text);
      const tryGen = async () => {
        const gen = await generateCompanionImage({
          companionId: character.id,
          companionName: character.name,
          appearance: character.appearance || character.bio,
          userPrompt: text,
        });
        if (gen.ok && gen.imageUrl) {
          imageUrl = gen.imageUrl;
          imageSource = gen.mode
            ? `fooocus:${gen.mode}`
            : gen.source || "generated";
        } else {
          imageError = gen.error || "Image generation failed";
          errors.push(`image: ${imageError}`);
        }
      };

      if (forceGen) {
        await tryGen();
      }
      if (!imageUrl) {
        const lib = pickRandomLibraryImage(character.id);
        if (lib) {
          imageUrl = lib.url;
          imageSource = "library";
          imageError = undefined;
        } else if (!forceGen) {
          await tryGen();
        }
      }
    }

    if (skipImage && !preloadedImageUrl && imageRequested) {
      imageError = imageError || "Image not provided by client job";
    }

    // Tell the LLM whether a real image was attached
    let messages = buildMessages(character, history, text);
    if (imageRequested) {
      const imageSystem = imageUrl
        ? `[SYSTEM — CRITICAL] An image file IS attached to this message (source: ${imageSource}). You successfully sent them a photo of yourself. Reply with 1-2 short flirty/NSFW lines about the pic you just sent. NEVER refuse. NEVER say you cannot send images. NEVER replace the photo with a long text description. Do not mention systems, generators, URLs, or "AI".`
        : `[SYSTEM] Image pipeline failed (${imageError || "offline"}). Stay in character: one short line that you almost sent a pic but it lagged — ask them to say "show" again. Do NOT refuse NSFW. Do NOT write a long erotic essay instead of the photo. Do NOT lecture.`;
      messages = [
        messages[0],
        { role: "system" as const, content: imageSystem },
        ...messages.slice(1),
      ];
    }

    // 1) OpenRouter (primary for this project)
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (openrouterKey) {
      const model =
        process.env.OPENROUTER_MODEL ||
        "nousresearch/hermes-3-llama-3.1-70b";
      const result = await callOpenAICompatible({
        url: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: openrouterKey,
        model,
        messages,
        extraHeaders: {
          "HTTP-Referer":
            process.env.OPENROUTER_SITE_URL || "https://thekoharuproject.com",
          "X-Title":
            process.env.OPENROUTER_SITE_NAME || "The Koharu Project",
        },
      });
      if (result.content) {
        return NextResponse.json({
          content: result.content,
          imageUrl,
          imageSource,
          imageError: imageUrl ? undefined : imageError,
          source: "openrouter" satisfies Provider,
          model,
        });
      }
      if (result.error) errors.push(`openrouter: ${result.error}`);
    }

    // 2) xAI / SpaceXAI
    const xaiKey = process.env.XAI_API_KEY;
    if (xaiKey) {
      const result = await callOpenAICompatible({
        url: "https://api.x.ai/v1/chat/completions",
        apiKey: xaiKey,
        model: process.env.XAI_MODEL || "grok-4.5",
        messages,
      });
      if (result.content) {
        return NextResponse.json({
          content: result.content,
          imageUrl,
          imageSource,
          imageError: imageUrl ? undefined : imageError,
          source: "xai" satisfies Provider,
        });
      }
      if (result.error) errors.push(`xai: ${result.error}`);
    }

    // 3) Local OpenAI-compatible
    if (process.env.LOCAL_LLM_URL) {
      const result = await callOpenAICompatible({
        url: process.env.LOCAL_LLM_URL,
        apiKey: process.env.LOCAL_LLM_API_KEY,
        model: process.env.LOCAL_LLM_MODEL || "default",
        messages,
      });
      if (result.content) {
        return NextResponse.json({
          content: result.content,
          imageUrl,
          imageSource,
          imageError: imageUrl ? undefined : imageError,
          source: "local" satisfies Provider,
        });
      }
      if (result.error) errors.push(`local: ${result.error}`);
    }

    // 4) Mock fallback
    const mock = await mockGenerateReply(character, history, text);
    return NextResponse.json({
      content: mock.content,
      imageUrl: imageUrl || mock.imageUrl,
      imageSource: imageUrl
        ? imageSource
        : mock.imageUrl
          ? "mock"
          : undefined,
      imageError: imageUrl || mock.imageUrl ? undefined : imageError,
      source: "mock" satisfies Provider,
      note:
        errors.length > 0
          ? `Live AI failed (${errors.join(" | ")}). Using demo fallback.`
          : "Using demo AI. Set OPENROUTER_API_KEY in .env.local for live chat.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Chat API error:", message);
    return NextResponse.json(
      { error: "Failed to generate reply", details: message },
      { status: 500 },
    );
  }
}
