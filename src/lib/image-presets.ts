/**
 * Image generation presets.
 * Per-companion parameters live in companions/json/{id}.json → generation.
 * MODE_CONFIG is the global fallback when a mode is forced without overrides.
 */
import {
  getCompanionFile,
  getCompanionGeneration,
} from "./companion-registry";
import type { ImageMode } from "./companion-types";

export type { ImageMode };

export type CompanionVisual = {
  look: string;
  preferredMode: ImageMode;
  gender: "female" | "male";
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
  seed?: number;
  imageNumber?: number;
  promptSuffix?: string;
};

/** Built from companions/json for backwards-compatible imports */
export const COMPANION_VISUALS: Record<string, CompanionVisual> = (() => {
  const map: Record<string, CompanionVisual> = {};
  // Lazy-filled on first access via getCompanionVisual
  return map;
})();

export function getCompanionVisual(
  companionId: string,
): CompanionVisual | undefined {
  const f = getCompanionFile(companionId);
  if (!f) return undefined;
  return {
    look: f.generation.look,
    preferredMode: f.generation.mode,
    gender: f.gender,
  };
}

/** Global mode fallbacks (forced anime / lust / realistic without companion override) */
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
      "nsfw, explicit, uncensored, erotic, pornographic, hardcore sex, adult 18-20 years old, raw photo quality, detailed genitals, detailed anatomy, photorealistic",
    negative:
      "child, loli, shota, underage, young teen, kid, toddler, anime, cartoon, looking at viewer, eye contact, selfie, worst quality, low quality, blurry, bad anatomy, text, watermark, censored, clothed",
    aspect: "896*1152",
  },
  pony: {
    model: "ponyDiffusionV6XL_v6StartWithThisOne (1).safetensors",
    styles: ["Fooocus Pony"],
    performance: "Quality",
    cfg: 7,
    sharpness: 2.2,
    promptPrefix:
      "score_9, score_8_up, score_7_up, source_anime, rating_explicit, masterpiece, best quality, adult 18-20 years old, nsfw, explicit, uncensored",
    negative:
      "score_6, score_5, score_4, child, loli, shota, underage, young, teen under 18, kid, looking at viewer, eye contact, selfie, worst quality, low quality, blurry, bad anatomy, censored, clothed",
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
    performance: "Quality",
    cfg: 4,
    sharpness: 2,
    promptPrefix:
      "nsfw, photorealistic, raw photo, explicit uncensored erotic, adult 18-20 years old, young adult, realistic skin pores, natural lighting, detailed skin, detailed genitals, 85mm lens",
    negative:
      "child, loli, shota, underage, minor, young teen, kid, toddler, looking at viewer, eye contact, selfie, cartoon, anime, manga, 3d render, plastic skin, middle-aged, elderly, wrinkles, worst quality, low quality, blurry, bad anatomy, text, watermark, censored, clothed",
    aspect: "896*1152",
  },
};

/** Merge companion JSON generation with mode base (companion wins). */
export function getModeConfigForCompanion(
  companionId: string,
  mode: ImageMode,
): ModeConfig {
  const base = { ...MODE_CONFIG[mode] };
  const gen = getCompanionGeneration(companionId);
  if (!gen) return base;

  // Only apply companion-specific knobs when using their preferred mode
  // (or always apply look-related prefix/negative from companion)
  const useFull = gen.mode === mode || mode === gen.mode;

  if (useFull) {
    return {
      model: gen.model || base.model,
      styles: gen.styles?.length ? gen.styles : base.styles,
      performance: gen.performance || base.performance,
      cfg: gen.cfg ?? base.cfg,
      sharpness: gen.sharpness ?? base.sharpness,
      promptPrefix: gen.promptPrefix || base.promptPrefix,
      negative: gen.negative || base.negative,
      aspect: gen.aspect || base.aspect,
      seed: gen.seed,
      imageNumber: gen.imageNumber ?? 1,
      promptSuffix: gen.promptSuffix,
    };
  }

  // Forced other mode: keep mode model/styles but companion look still applied in builder
  return base;
}

const EXPLICIT_SCENES_F = [
  "fully nude, legs spread on bed, pussy visible, aroused, from above angle, eyes closed in pleasure",
  "fully nude, doggystyle pose on bed, ass and pussy visible from behind, arched back, face turned to side",
  "fully nude, missionary sex, legs open, penetration, side angle, head tilted back in ecstasy",
  "fully nude, riding cowgirl, breasts bouncing, penetration visible, side-low angle, eyes half-closed",
  "fully nude, blowjob, kneeling, oral sex, cock in mouth, side profile, saliva",
  "fully nude, bent over table, from behind, spread ass, pussy exposed, looking over shoulder not at camera",
  "fully nude, masturbation, fingers in pussy, legs up, overhead angle, pleasure face eyes closed",
  "fully nude, against wall standing sex, leg up, penetration, side three-quarter view",
  "fully nude, on knees presenting, face down ass up, rear angle, submissive",
  "fully nude, sitting on edge of bed, thighs open, three-quarter side view, not looking at camera",
];

const EXPLICIT_SCENES_M = [
  "fully nude, adult man, hard cock, lying on bed, from side angle, eyes closed in pleasure",
  "fully nude, adult man, missionary sex with partner, side angle, muscular back, thrusting",
  "fully nude, adult man, doggystyle from side-behind, hands on hips, hard sex",
  "fully nude, adult man receiving blowjob, sitting on edge of bed, head back, side profile",
  "fully nude, adult man, standing sex against wall, partner legs up, side three-quarter",
  "fully nude, adult man, masturbation, hand on cock, bedroom, cinematic side angle not selfie",
  "fully nude, adult man, cowgirl partner riding him, low side angle, abs and chest visible",
  "fully nude, adult man, prone bone from behind-side, gripping sheets",
  "fully nude, adult man, 69 oral, side view, explicit",
  "fully nude, adult man, handjob from partner, kissing neck, intimate side angle",
];

const NUDE_POSE_SCENES = [
  "completely naked, lying on stomach on bed, from side, face in pillow, bare ass, soft light",
  "completely naked, kneeling on bed from side angle, hands on breasts, eyes closed, arched back",
  "completely naked, stepping out of shower, wet skin, from side profile, not facing camera",
  "completely naked, on all fours on sheets, rear three-quarter view, looking away",
];

function pickScene(pool: string[], seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  h = (h + Math.floor(Date.now() / 30_000)) % pool.length;
  return pool[h];
}

function wantsSelfieFraming(text: string): boolean {
  return /\b(selfie|selfies|look(ing)? at (me|you|camera|viewer)|eye contact|facetime|front (facing|camera)|to the camera)\b/i.test(
    text,
  );
}

function expandSexualActs(text: string): string {
  const t = text.toLowerCase();
  const tags: string[] = [];

  if (/\b(blowjob|bj|suck|oral|deepthroat|throat)\b/.test(t)) {
    tags.push(
      "blowjob, oral sex, cock in mouth, kneeling, explicit saliva, side profile or three-quarter, not a front selfie",
    );
  }
  if (/\b(doggy|doggystyle|from behind|bent over)\b/.test(t)) {
    tags.push(
      "doggystyle, from behind, ass up, pussy visible, penetration, arched back, face away or side",
    );
  }
  if (/\b(missionary)\b/.test(t)) {
    tags.push(
      "missionary sex, legs spread, penetration, from side or above, head back eyes closed",
    );
  }
  if (/\b(cowgirl|riding|ride)\b/.test(t)) {
    tags.push(
      "cowgirl sex, riding, penetration visible, breasts bouncing, side or low angle",
    );
  }
  if (/\b(reverse cowgirl)\b/.test(t)) {
    tags.push("reverse cowgirl, ass toward camera-side, penetration, face away");
  }
  if (/\b(69|sixty.?nine)\b/.test(t)) {
    tags.push("69 position, mutual oral, side view, explicit");
  }
  if (/\b(creampie|cum (in|inside)|cumshot|facial|cum on)\b/.test(t)) {
    tags.push("cum, explicit fluids, uncensored, detailed");
  }
  if (/\b(anal)\b/.test(t)) {
    tags.push("anal sex, from behind or side, explicit penetration");
  }
  if (/\b(finger|masturbat|touch herself|play with)\b/.test(t)) {
    tags.push(
      "masturbation, fingers in pussy, legs open, pleasure, not looking at camera",
    );
  }
  if (/\b(titjob|boobjob|paizuri)\b/.test(t)) {
    tags.push("titjob, breasts around cock, looking down at cock not at camera");
  }
  if (/\b(sex|fuck|fucking|pound|raw|hardcore|pound me|fuck me)\b/.test(t)) {
    tags.push(
      "hardcore sex, penetration, fully nude, explicit genitals, dynamic angle not selfie",
    );
  }
  if (/\b(spread|open (your |my )?legs|pussy)\b/.test(t)) {
    tags.push(
      "legs spread, pussy fully visible, detailed labia, fully nude, from above or front-low not face-locked",
    );
  }
  if (/\b(ass|booty|butt)\b/.test(t) && !/\b(doggystyle|from behind)\b/.test(t)) {
    tags.push("ass focus, from behind or side, fully nude");
  }
  if (/\b(nude|naked|strip)\b/.test(t)) {
    tags.push("completely nude, no clothes, bare breasts, bare pussy");
  }

  return tags.join(", ");
}

/** Optional client/creator overrides when companion is not on disk (custom-*) */
export type ImageGenOverrides = {
  look?: string;
  appearance?: string;
  gender?: "female" | "male";
  profilePrompt?: string;
  defaultScene?: string;
  companionName?: string;
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
  if (/\b(pony|anime|manga|2d|cartoon)\b/.test(t)) return "pony";
  if (/\b(lust|filthy|hardcore|porn)\b/.test(t) && !/\b(realistic|photo)\b/.test(t))
    return "lust";
  if (/\b(realistic|photo|photoreal|irl look|real life)\b/.test(t))
    return "realistic";

  const envDefault = (process.env.FOOOCUS_DEFAULT_MODE || "").toLowerCase();
  if (envDefault === "lust" || envDefault === "pony" || envDefault === "realistic") {
    return envDefault;
  }

  const gen = getCompanionGeneration(companionId);
  // Custom companions default to photoreal lust (women) / pony (handled by caller)
  if (companionId.startsWith("custom-")) return "lust";
  return gen?.mode || "realistic";
}

export function buildCompanionImagePrompt(opts: {
  companionId: string;
  companionName: string;
  appearance: string;
  userText: string;
  mode: ImageMode;
  overrides?: ImageGenOverrides;
}): { prompt: string; negative: string; config: ModeConfig } {
  const file = getCompanionFile(opts.companionId);
  const gen = file?.generation;
  const config = getModeConfigForCompanion(opts.companionId, opts.mode);
  const o = opts.overrides;
  const gender = o?.gender || file?.gender || "female";
  const isMale = gender === "male";
  const appearance = (o?.appearance || opts.appearance || "").trim();
  const profilePrompt = o?.profilePrompt || gen?.profilePrompt;
  const defaultScene = o?.defaultScene || gen?.defaultScene;
  const raw = opts.userText || "";
  const selfie = wantsSelfieFraming(raw);

  let scene = raw
    .replace(
      /\b(generate|draw|make|create|an? image of|pic of|photo of|send me|show me|show|pony|anime|realistic|photo|pic|pics|image|please)\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();

  const actTags = expandSexualActs(raw);
  const bareRequest =
    !scene ||
    /^(a |an )?(pic|pics|photo|selfie|image|nude|nudes|me|more|sex|fuck|nsfw)\.?$/i.test(
      scene,
    );

  const scenePool = isMale ? EXPLICIT_SCENES_M : EXPLICIT_SCENES_F;

  // Profile-style request → use companion profilePrompt
  const wantsProfile =
    /\b(profile|portrait|avatar|headshot|face pic|creator portrait)\b/i.test(raw) &&
    !!profilePrompt;

  if (wantsProfile && profilePrompt) {
    scene = profilePrompt;
  } else if (bareRequest && !actTags) {
    scene =
      defaultScene ||
      pickScene(scenePool, `${opts.companionId}:${raw}`);
  } else if (bareRequest && actTags) {
    scene = actTags;
  } else {
    scene = [scene, actTags].filter(Boolean).join(", ");
    if (!/\b(lingerie|clothed|dressed|outfit|cosplay only|profile|portrait)\b/i.test(raw)) {
      scene = isMale
        ? `${scene}, fully nude male, explicit nsfw, uncensored, detailed male genitals, sexual`
        : `${scene}, fully nude, explicit nsfw, uncensored, detailed genitals, sexual`;
    }
  }

  if (!wantsProfile) {
    if (selfie) {
      scene = `${scene}, selfie, looking at viewer, eye contact, front facing, phone camera perspective`;
    } else {
      scene = `${scene}, cinematic erotic angle, natural pose, averted gaze or eyes closed, not a selfie, not looking at camera`;
    }

    scene = isMale
      ? `${scene}, completely naked man, bare chest, male abs or soft body, hard or soft cock, explicit sex, erotic, pornographic quality`
      : `${scene}, completely naked, bare breasts, nipples, bare pussy, explicit sex, erotic, pornographic quality`;
  }

  const look =
    o?.look ||
    gen?.look ||
    appearance.replace(/\s+/g, " ").slice(0, 320) ||
    (isMale ? "handsome adult man 18-20" : "beautiful adult woman 18-20");
  const appearanceExtra = appearance
    ? appearance.replace(/\s+/g, " ").slice(0, 220)
    : "";

  const genderTag = isMale
    ? "1boy, solo, adult man 18-20 years old, young adult male, distinct male character design"
    : "1girl, solo, adult woman 18-20 years old, young adult female, distinct character design";

  const prompt = [
    config.promptPrefix,
    o?.companionName || opts.companionName,
    genderTag,
    look,
    appearanceExtra,
    scene,
    "same character consistency, unique face for this companion only",
    config.promptSuffix ||
      "masterpiece, best quality, detailed skin, detailed face, detailed body, adult only 18+",
  ]
    .filter(Boolean)
    .join(", ");

  let negative = config.negative;
  if (isMale) {
    negative = `${negative}, 1girl, woman, female, feminine body, breasts, pussy, loli, shota, young boy, underage, child`;
  } else {
    negative = `${negative}, 1boy, man, male focus, penis, shota, underage, child`;
  }
  if (selfie || wantsProfile) {
    negative = negative
      .replace(/\s*looking at viewer\s*,?/gi, " ")
      .replace(/\s*eye contact\s*,?/gi, " ")
      .replace(/\s*selfie\s*,?/gi, " ")
      .replace(/\s*phone selfie\s*,?/gi, " ")
      .replace(/\s*front-facing camera\s*,?/gi, " ")
      .replace(/\s*portrait selfie\s*,?/gi, " ")
      .replace(/,\s*,/g, ",")
      .trim();
  }

  return { prompt, negative, config };
}

/** Build bridge POST body using companion JSON generation knobs */
export function buildFooocusBridgeBody(opts: {
  companionId: string;
  companionName: string;
  appearance: string;
  userText: string;
  mode?: ImageMode | null;
  requireBase64?: boolean;
  overrides?: ImageGenOverrides;
}) {
  const mode = resolveImageMode(
    opts.companionId,
    opts.userText,
    opts.mode,
  );
  const built = buildCompanionImagePrompt({
    companionId: opts.companionId,
    companionName: opts.companionName,
    appearance: opts.overrides?.appearance || opts.appearance,
    userText: opts.userText,
    mode,
    overrides: opts.overrides,
  });
  const cfg = built.config;

  return {
    mode,
    built,
    bridgeBody: {
      prompt: built.prompt,
      negative_prompt: built.negative,
      style_selections: cfg.styles,
      performance_selection:
        process.env.FOOOCUS_PERFORMANCE || cfg.performance,
      aspect_ratios_selection: process.env.FOOOCUS_ASPECT || cfg.aspect,
      image_number: cfg.imageNumber ?? 1,
      image_seed: cfg.seed ?? -1,
      sharpness: Number(process.env.FOOOCUS_SHARPNESS || cfg.sharpness),
      guidance_scale: Number(process.env.FOOOCUS_GUIDANCE || cfg.cfg),
      base_model_name: process.env.FOOOCUS_MODEL || cfg.model,
      require_base64: opts.requireBase64 ?? false,
      // Saved on disk to media/{companionId}/generated/
      companion_id: opts.companionId,
      companionId: opts.companionId,
    },
  };
}

export function defaultExplicitScene(seed = "show", male = false): string {
  return pickScene(male ? EXPLICIT_SCENES_M : EXPLICIT_SCENES_F, seed);
}

export function defaultNudePoseScene(seed = "nude"): string {
  return pickScene(NUDE_POSE_SCENES, seed);
}
