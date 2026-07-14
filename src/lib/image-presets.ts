/**
 * Visual presets for Fooocus companion image gen.
 * mode is sent to the bridge as model + styles + prompt flavor.
 */

export type ImageMode = "lust" | "pony" | "realistic";

export type CompanionVisual = {
  /** Extra visual tags for the character */
  look: string;
  /** Prefer which checkpoint mode */
  preferredMode: ImageMode;
};

export const COMPANION_VISUALS: Record<string, CompanionVisual> = {
  koharu: {
    preferredMode: "lust",
    look: "soft pretty face, warm eyes, approachable beauty, feminine body, cute-to-sexy vibe, adult woman 22",
  },
  mira: {
    preferredMode: "realistic",
    look: "elegant dominant woman, sharp eyes, confident expression, refined features, adult woman 28",
  },
  nova: {
    preferredMode: "lust",
    look: "playful bratty beauty, mischievous smile, energetic pose, adult woman 24",
  },
  elena: {
    preferredMode: "realistic",
    look: "soft romantic beauty, gentle eyes, delicate features, intimate lighting, adult woman 26",
  },
  raven: {
    preferredMode: "realistic",
    look: "dark seductive beauty, intense eyes, mysterious expression, stylish, adult woman 27",
  },
  yuki: {
    preferredMode: "pony",
    look: "soft shy beauty, blushing, gentle expression, adult woman 23, cute but mature",
  },
};

export type ModeConfig = {
  model: string;
  styles: string[];
  performance: string;
  cfg: number;
  sharpness: number;
  promptPrefix: string;
  negative: string;
  aspect: string;
};

/** Must match checkpoint filenames on disk */
export const MODE_CONFIG: Record<ImageMode, ModeConfig> = {
  lust: {
    model: "bigLust_v16.safetensors",
    styles: [
      "Fooocus V2",
      "Fooocus Enhance",
      "Fooocus Photograph",
      "Fooocus Sharp",
    ],
    performance: "Quality",
    cfg: 4,
    sharpness: 2.5,
    promptPrefix:
      "nsfw, explicit, uncensored, erotic photograph, adult woman, 18+, raw photo quality",
    negative:
      "child, loli, shota, underage, young, teen, kid, toddler, worst quality, low quality, blurry, bad anatomy, bad hands, text, watermark, logo, censored, bar censor, mosaic censoring, deformed, ugly, extra fingers, cartoon, anime",
    aspect: "896*1152",
  },
  pony: {
    model: "ponyDiffusionV6XL_v6StartWithThisOne (1).safetensors",
    styles: ["Fooocus Pony"],
    performance: "Speed",
    cfg: 7,
    sharpness: 2,
    promptPrefix:
      "score_9, score_8_up, score_7_up, source_anime, rating_explicit, nsfw, explicit, uncensored, 1girl, solo, adult woman",
    negative:
      "score_6, score_5, score_4, child, loli, shota, underage, young, teen, kid, worst quality, low quality, blurry, bad anatomy, bad hands, text, watermark, censored, bar censor, mosaic censoring",
    aspect: "896*1152",
  },
  realistic: {
    model: "juggernautXL_v8Rundiffusion.safetensors",
    styles: [
      "Fooocus V2",
      "Fooocus Photograph",
      "Fooocus Negative",
      "Fooocus Sharp",
    ],
    performance: "Speed",
    cfg: 4,
    sharpness: 2,
    promptPrefix:
      "nsfw, photorealistic, adult woman, 18+, detailed skin, natural lighting",
    negative:
      "child, loli, underage, young, teen, cartoon, anime, manga, 3d render, plastic skin, worst quality, low quality, blurry, bad anatomy, text, watermark, censored",
    aspect: "896*1152",
  },
};

export function resolveImageMode(
  companionId: string,
  userText: string,
  forced?: string | null,
): ImageMode {
  if (forced === "lust" || forced === "pony" || forced === "realistic") {
    return forced;
  }
  const t = userText.toLowerCase();
  if (/\b(pony|anime|manga|2d)\b/.test(t)) return "pony";
  if (/\b(realistic|photo|photoreal|irl look)\b/.test(t)) return "realistic";
  if (/\b(lust|filthy|hardcore|porn)\b/.test(t)) return "lust";
  return COMPANION_VISUALS[companionId]?.preferredMode || "lust";
}

export function buildCompanionImagePrompt(opts: {
  companionId: string;
  companionName: string;
  appearance: string;
  userText: string;
  mode: ImageMode;
}): { prompt: string; negative: string; config: ModeConfig } {
  const config = MODE_CONFIG[opts.mode];
  const visual = COMPANION_VISUALS[opts.companionId];

  let scene = opts.userText
    .replace(
      /\b(generate|draw|make|create|an? image of|pic of|photo of|send me|show me|show|pony|anime|realistic|photo)\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();

  // Bare "show" or empty after strip → default NSFW selfie scene
  if (
    !scene ||
    /^(a |an )?(pic|pics|photo|selfie|image|nude|nudes|me|more)\.?$/i.test(scene)
  ) {
    scene =
      "sexy nude selfie, bedroom, looking at viewer, sultry expression, detailed body";
  }

  if (/\b(nude|nudes|naked|sex|fuck|pussy|tits|ass|blowjob)\b/i.test(opts.userText)) {
    scene = `${scene}, fully nude, explicit nsfw, detailed anatomy, uncensored`;
  }

  const look =
    visual?.look ||
    opts.appearance.replace(/\s+/g, " ").slice(0, 200) ||
    "beautiful adult woman";

  const prompt = [
    config.promptPrefix,
    opts.companionName,
    look,
    scene,
    "masterpiece, best quality, detailed face, detailed eyes",
  ]
    .filter(Boolean)
    .join(", ");

  return { prompt, negative: config.negative, config };
}
