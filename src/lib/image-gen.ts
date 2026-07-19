export { type ImageMode } from "./image-presets";
import { generateWithFal } from "./fal-image";
import fs from "fs";
import path from "path";
import {
  companionMediaDir,
  ensureMediaDirs,
  sanitizeId,
} from "./media";
import {
  buildFooocusBridgeBody,
  resolveImageMode,
  type ImageMode,
} from "./image-presets";

/**
 * Image generation — SEPARATE from chat (OpenRouter).
 *
 * Default: Fooocus via Koharu bridge (:8888) → Fooocus UI (:7865)
 * Modes: lust (bigLust), pony (Pony V6), realistic (Juggernaut)
 */

export type ImageGenResult = {
  ok: boolean;
  imageUrl?: string;
  error?: string;
  model?: string;
  mode?: ImageMode;
  source?: "fooocus" | "pony" | "openrouter" | "library-fallback" | "fal";
};

type Provider = "fooocus" | "pony" | "openrouter";

function provider(): Provider {
  const p = (process.env.IMAGE_PROVIDER || "fooocus").toLowerCase();
  if (p === "pony") return "pony";
  if (p === "openrouter") return "openrouter";
  return "fooocus";
}

function fooocusBaseUrl(): string {
  return (process.env.FOOOCUS_API_URL || "http://127.0.0.1:8888").replace(
    /\/$/,
    "",
  );
}

function ponyBaseUrl(): string {
  return (process.env.PONY_API_URL || "http://127.0.0.1:7860").replace(
    /\/$/,
    "",
  );
}

function buildNsfwPrompt(opts: {
  companionName: string;
  appearance: string;
  userPrompt: string;
}): { prompt: string; negative: string } {
  let user = opts.userPrompt
    .replace(
      /\b(generate|draw|make|create|an? image of|pic of|photo of|send me|show me)\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();

  if (!user || /^(a |an )?(pic|pics|photo|selfie|image|nude|nudes)\.?$/i.test(user)) {
    user =
      process.env.FOOOCUS_DEFAULT_SCENE ||
      process.env.PONY_DEFAULT_SCENE ||
      "fully nude hardcore sex, penetration, explicit genitals, side angle, eyes closed in pleasure, not looking at camera, not a selfie";
  }

  if (/\b(nude|nudes|naked|sex|fuck|pussy|tits|ass)\b/i.test(opts.userPrompt)) {
    user = `${user}, fully nude, explicit nsfw, uncensored, detailed genitals, sexual act`;
  }

  // Avoid default eye-contact selfie bias unless user asked
  if (
    !/\b(selfie|looking at (me|viewer|camera)|eye contact)\b/i.test(
      opts.userPrompt,
    )
  ) {
    user = `${user}, cinematic angle, averted gaze or eyes closed, not a selfie, not looking at viewer`;
  }

  const prompt = [
    process.env.FOOOCUS_PROMPT_PREFIX ||
      "nsfw, photorealistic, raw photo, explicit, uncensored, hardcore, erotic, adult 18-20 years old, young adult, realistic skin pores, natural lighting",
    opts.companionName,
    "1girl, adult woman 18-20, photoreal",
    opts.appearance.replace(/\s+/g, " ").slice(0, 280),
    user,
    process.env.FOOOCUS_PROMPT_SUFFIX ||
      "masterpiece, best quality, beautiful detailed face, realistic skin, detailed anatomy, 85mm lens, pornographic photo",
  ]
    .filter(Boolean)
    .join(", ");

  const negative =
    process.env.FOOOCUS_NEGATIVE ||
    process.env.PONY_NEGATIVE ||
    [
      "child, loli, shota, underage, young, kid, toddler, teen under 18, little girl",
      "looking at viewer, eye contact, selfie, phone selfie, front-facing camera",
      "cartoon, anime, manga, 3d render, plastic skin, illustration, painting",
      "middle-aged, elderly, wrinkles",
      "worst quality, low quality, blurry, bad anatomy, bad hands",
      "text, watermark, logo, censored, bar censor, mosaic censoring",
      "clothed, lingerie only, covered nipples, covered pussy",
    ].join(", ");

  return { prompt, negative };
}

async function persistBase64Png(
  companionId: string,
  b64: string,
  prefix = "gen",
): Promise<string> {
  const clean = b64.replace(/^data:image\/\w+;base64,/, "");
  // On Vercel, disk is ephemeral — return data URL so the chat can still show the image
  if (process.env.VERCEL && !process.env.MEDIA_ROOT) {
    return `data:image/png;base64,${clean}`;
  }
  try {
    ensureMediaDirs(companionId);
    const dir = companionMediaDir(companionId, "generated");
    const name = `${prefix}-${Date.now()}.png`;
    fs.writeFileSync(path.join(dir, name), Buffer.from(clean, "base64"));
    return `/api/media/file?companion=${encodeURIComponent(sanitizeId(companionId))}&kind=generated&name=${encodeURIComponent(name)}`;
  } catch {
    return `data:image/png;base64,${clean}`;
  }
}

async function persistDataOrUrl(
  companionId: string,
  imageData: string,
  prefix = "gen",
): Promise<string | null> {
  try {
    if (imageData.startsWith("data:")) {
      const m = imageData.match(/^data:image\/[a-zA-Z0-9+.-]+;base64,(.+)$/);
      if (!m) return imageData;
      return persistBase64Png(companionId, m[1], prefix);
    }
    if (imageData.startsWith("http://") || imageData.startsWith("https://")) {
      // download local copy when possible
      try {
        const res = await fetch(imageData, { signal: AbortSignal.timeout(60_000) });
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          const b64 = buf.toString("base64");
          return persistBase64Png(companionId, b64, prefix);
        }
      } catch {
        return imageData;
      }
      return imageData;
    }
    return persistBase64Png(companionId, imageData, prefix);
  } catch (e) {
    console.warn("persist failed", e);
    return null;
  }
}

/**
 * Fooocus via Koharu bridge REST (default http://127.0.0.1:8888).
 * Uses lust / pony / realistic modes mapped to your local checkpoints.
 */
async function generateWithFooocus(opts: {
  companionId: string;
  companionName: string;
  appearance: string;
  userPrompt: string;
  mode?: ImageMode | null;
}): Promise<ImageGenResult> {
  const base = fooocusBaseUrl();
  const { mode, bridgeBody } = buildFooocusBridgeBody({
    companionId: opts.companionId,
    companionName: opts.companionName,
    appearance: opts.appearance,
    userText: opts.userPrompt,
    mode: opts.mode,
    requireBase64: true,
  });
  const body = {
    ...bridgeBody,
    refiner_model_name: "None",
    async_process: false,
  };

  // Try several known endpoints
  const endpoints = [
    "/v1/generation/text-to-image",
    "/v2/generation/text-to-image-with-ip",
    "/v1/generation/text-to-image-simple",
  ];

  let lastError = "Fooocus unreachable";

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${base}${ep}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(180_000),
      });
      const raw = await res.text();
      if (!res.ok) {
        lastError = `Fooocus ${ep} HTTP ${res.status}: ${raw.slice(0, 160)}`;
        continue;
      }

      let data: unknown;
      try {
        data = JSON.parse(raw);
      } catch {
        lastError = `Fooocus ${ep} returned non-JSON`;
        continue;
      }

      const b64 = extractFooocusBase64(data);
      if (!b64) {
        const url = extractFooocusUrl(data, base);
        if (url) {
          const saved = await persistDataOrUrl(opts.companionId, url, "fooocus");
          return {
            ok: true,
            imageUrl: saved || url,
            model: body.base_model_name || "fooocus",
            mode,
            source: "fooocus",
          };
        }
        lastError = `Fooocus ${ep} returned no image`;
        continue;
      }

      const imageUrl = await persistBase64Png(opts.companionId, b64, "fooocus");
      return {
        ok: true,
        imageUrl,
        model: body.base_model_name || "fooocus",
        mode,
        source: "fooocus",
      };
    } catch (e) {
      lastError = e instanceof Error ? e.message : "fooocus failed";
    }
  }

  return {
    ok: false,
    error: `${lastError}. Start Fooocus UI + bridge (scripts/start-fooocus-bridge.bat).`,
    model: body.base_model_name || "fooocus",
    mode,
    source: "fooocus",
  };
}

function extractFooocusBase64(data: unknown): string | null {
  const d = data as Record<string, unknown>;

  // [{ base64: "..." }]
  if (Array.isArray(data)) {
    for (const item of data) {
      const o = item as Record<string, unknown>;
      if (typeof o.base64 === "string") return o.base64;
      if (typeof o.image_base64 === "string") return o.image_base64;
    }
  }

  if (typeof d.base64 === "string") return d.base64;

  // { result: [ { base64 } ] }
  if (Array.isArray(d.result)) {
    for (const item of d.result as Record<string, unknown>[]) {
      if (typeof item.base64 === "string") return item.base64;
    }
  }

  // { images: ["base64..."] } or nested
  if (Array.isArray(d.images)) {
    const first = d.images[0];
    if (typeof first === "string" && first.length > 100) return first;
    if (first && typeof first === "object") {
      const o = first as Record<string, unknown>;
      if (typeof o.base64 === "string") return o.base64;
    }
  }

  return null;
}

function extractFooocusUrl(data: unknown, base: string): string | null {
  const d = data as Record<string, unknown>;
  const candidates: unknown[] = [];
  if (Array.isArray(data)) candidates.push(...data);
  if (Array.isArray(d.result)) candidates.push(...(d.result as unknown[]));
  if (Array.isArray(d.images)) candidates.push(...(d.images as unknown[]));
  if (typeof d.url === "string") candidates.push(d.url);

  for (const c of candidates) {
    if (typeof c === "string" && /^https?:\/\//i.test(c)) return c;
    if (typeof c === "string" && c.startsWith("/")) return `${base}${c}`;
    if (c && typeof c === "object") {
      const o = c as Record<string, unknown>;
      if (typeof o.url === "string") {
        return o.url.startsWith("http") ? o.url : `${base}${o.url}`;
      }
      if (typeof o.image_url === "string") return o.image_url as string;
    }
  }
  return null;
}

/** Automatic1111 / Forge txt2img (optional Pony) */
async function generateWithPony(opts: {
  companionId: string;
  companionName: string;
  appearance: string;
  userPrompt: string;
}): Promise<ImageGenResult> {
  const base = ponyBaseUrl();
  const { prompt, negative } = buildNsfwPrompt(opts);

  const body: Record<string, unknown> = {
    prompt: [
      process.env.PONY_STYLE_PREFIX ||
        "score_9, score_8_up, score_7_up, source_anime, rating_explicit, nsfw,",
      prompt,
      process.env.PONY_STYLE_SUFFIX || "",
    ].join(" "),
    negative_prompt: negative,
    steps: Number(process.env.PONY_STEPS || 28),
    cfg_scale: Number(process.env.PONY_CFG || 6),
    width: Number(process.env.PONY_WIDTH || 832),
    height: Number(process.env.PONY_HEIGHT || 1216),
    sampler_name: process.env.PONY_SAMPLER || "Euler a",
    batch_size: 1,
    n_iter: 1,
    seed: -1,
    override_settings: {},
    override_settings_restore_afterwards: true,
  };

  const checkpoint = process.env.PONY_CHECKPOINT;
  if (checkpoint) {
    (body.override_settings as Record<string, string>).sd_model_checkpoint =
      checkpoint;
  }

  try {
    const res = await fetch(`${base}/sdapi/v1/txt2img`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180_000),
    });
    const raw = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        error: `Pony API ${res.status}`,
        model: "pony",
        source: "pony",
      };
    }
    const data = JSON.parse(raw) as { images?: string[] };
    const b64 = data.images?.[0];
    if (!b64) {
      return { ok: false, error: "Pony returned no image", source: "pony" };
    }
    const imageUrl = await persistBase64Png(opts.companionId, b64, "pony");
    return {
      ok: true,
      imageUrl,
      model: checkpoint || "pony",
      source: "pony",
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "pony failed";
    return {
      ok: false,
      error: `${message} (start Forge/A1111 --api on ${base})`,
      source: "pony",
    };
  }
}

async function generateWithOpenRouter(opts: {
  companionId: string;
  companionName: string;
  appearance: string;
  userPrompt: string;
}): Promise<ImageGenResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "OPENROUTER_API_KEY missing", source: "openrouter" };
  }
  const model =
    process.env.OPENROUTER_IMAGE_MODEL ||
    "google/gemini-2.5-flash-image-preview";
  const { prompt } = buildNsfwPrompt(opts);

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          process.env.OPENROUTER_SITE_URL || "https://thekoharuproject.com",
        "X-Title":
          process.env.OPENROUTER_SITE_NAME || "The Koharu Project",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: `Generate image: ${prompt}` }],
        modalities: ["image", "text"],
      }),
      signal: AbortSignal.timeout(90_000),
    });
    const raw = await res.text();
    if (!res.ok) {
      return { ok: false, error: `OpenRouter image ${res.status}`, model };
    }
    const data = JSON.parse(raw) as {
      choices?: Array<{
        message?: {
          content?: string;
          images?: Array<{ image_url?: { url?: string } | string }>;
        };
      }>;
    };
    const msg = data.choices?.[0]?.message;
    let extracted: string | null = null;
    if (msg?.images?.[0]) {
      const u = msg.images[0].image_url;
      extracted = typeof u === "string" ? u : u?.url || null;
    }
    if (!extracted && typeof msg?.content === "string") {
      const m = msg.content.match(
        /data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]+/,
      );
      extracted = m?.[0] || null;
    }
    if (!extracted) {
      return { ok: false, error: "No image in OpenRouter response", model };
    }
    const saved = await persistDataOrUrl(opts.companionId, extracted, "or");
    return {
      ok: true,
      imageUrl: saved || extracted,
      model,
      source: "openrouter",
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "openrouter image failed";
    return { ok: false, error: message, model };
  }
}

/** Generate companion image (default: Fooocus). */
export async function generateCompanionImage(opts: {
  companionId: string;
  companionName: string;
  appearance: string;
  userPrompt: string;
  mode?: ImageMode | null;
}): Promise<ImageGenResult> {
  const mode = provider();

  if (mode === "fooocus") {
    const r = await generateWithFooocus(opts);
    if (r.ok) return r;
    // fal.ai fallback when local bridge is down (PC off)
    const normalizedOpts = { ...opts, mode: opts.mode ?? undefined };
    const falResult = await generateWithFal(normalizedOpts);
    if (falResult.ok) return falResult;
    if (process.env.IMAGE_FALLBACK_OPENROUTER === "1") {
      const fb = await generateWithOpenRouter(opts);
      if (fb.ok) return fb;
      return {
        ok: false,
        error: `Fooocus: ${r.error} | Fallback: ${fb.error}`,
        source: "fooocus",
      };
    }
    return r;
  }

  if (mode === "pony") {
    const r = await generateWithPony(opts);
    if (r.ok) return r;
    if (process.env.IMAGE_FALLBACK_OPENROUTER === "1") {
      return generateWithOpenRouter(opts);
    }
    return r;
  }

  return generateWithOpenRouter(opts);
}

export async function fooocusHealth(): Promise<{
  ok: boolean;
  url: string;
  error?: string;
  detail?: string;
}> {
  const url = fooocusBaseUrl();
  const probes = ["/", "/docs", "/openapi.json", "/v1/engines/all-models", "/app_id"];
  for (const p of probes) {
    try {
      const res = await fetch(`${url}${p}`, {
        signal: AbortSignal.timeout(4_000),
      });
      if (res.ok || res.status === 404 || res.status === 405) {
        // any HTTP response means server is up
        return {
          ok: true,
          url,
          detail: `responded on ${p} with ${res.status}`,
        };
      }
    } catch {
      // try next
    }
  }
  return {
    ok: false,
    url,
    error: "unreachable — start Fooocus-API (often port 8888) or set FOOOCUS_API_URL",
  };
}

export async function ponyHealth(): Promise<{
  ok: boolean;
  url: string;
  models?: string[];
  error?: string;
}> {
  const url = ponyBaseUrl();
  try {
    const res = await fetch(`${url}/sdapi/v1/sd-models`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return { ok: false, url, error: `HTTP ${res.status}` };
    const models = (await res.json()) as { title?: string; model_name?: string }[];
    return {
      ok: true,
      url,
      models: models.map((m) => m.title || m.model_name || "?").slice(0, 30),
    };
  } catch (e) {
    return {
      ok: false,
      url,
      error: e instanceof Error ? e.message : "unreachable",
    };
  }
}
