import { ImageGenResult, ImageMode } from "./image-gen";

/**
 * fal.ai image generation fallback
 * Used automatically when local Fooocus bridge is unavailable (PC off)
 */

const FAL_API_URL = "https://fal.run/fal-ai";

export async function generateWithFal(
  opts: {
    companionName: string;
    appearance: string;
    userPrompt: string;
    mode?: ImageMode;
  }
): Promise<ImageGenResult> {
  const apiKey = process.env.FAL_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "FAL_API_KEY not configured",
      source: "fal",
    };
  }

  // Build a strong NSFW prompt (reuse logic style from image-gen.ts)
  const prompt = [
    "nsfw, photorealistic, raw photo, explicit, uncensored, hardcore, erotic",
    "adult 18-20 years old, young adult, realistic skin",
    opts.companionName,
    opts.appearance,
    opts.userPrompt,
    "masterpiece, best quality, detailed face, detailed anatomy",
  ]
    .filter(Boolean)
    .join(", ");

  const negative =
    "blurry, low quality, deformed, ugly, extra limbs, bad anatomy, watermark, text, logo";

  try {
    // Using Flux Schnell as a fast, high-quality default.
    // You can change the model path below if you prefer a different one.
    const response = await fetch(`${FAL_API_URL}/fal-ai/flux/schnell`, {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        negative_prompt: negative,
        image_size: "square",
        num_inference_steps: 4,
        guidance_scale: 3.5,
        num_images: 1,
        enable_safety_checker: false, // allow NSFW
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        ok: false,
        error: `fal.ai error: ${response.status} ${errText}`,
        source: "fal",
      };
    }

    const data = await response.json();
    const imageUrl = data.images?.[0]?.url;

    if (!imageUrl) {
      return {
        ok: false,
        error: "fal.ai returned no image",
        source: "fal",
      };
    }

    return {
      ok: true,
      imageUrl,
      source: "fal",
      mode: opts.mode,
      model: "fal-ai/flux/schnell",
    };
  } catch (err: any) {
    return {
      ok: false,
      error: `fal.ai request failed: ${err.message}`,
      source: "fal",
    };
  }
}
