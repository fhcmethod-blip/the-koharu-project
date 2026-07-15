/**
 * Visual presets for Fooocus companion image gen.
 * mode is sent to the bridge as model + styles + prompt flavor.
 *
 * Defaults: full explicit nude + sexual acts, varied camera angles.
 * "looking at viewer / selfie" only when the user asks for that.
 */

export type ImageMode = "lust" | "pony" | "realistic";

export type CompanionVisual = {
  /** Extra visual tags for the character */
  look: string;
  /** Prefer which checkpoint mode */
  preferredMode: ImageMode;
};

/**
 * Strong visual fingerprints for image gen — each companion must read as a
 * different person (hair, eyes, body, skin, fashion).
 */
export const COMPANION_VISUALS: Record<string, CompanionVisual> = {
  koharu: {
    preferredMode: "lust",
    look: [
      "1girl, solo, adult woman 22, east asian",
      "long straight black hair, soft bangs, warm brown eyes, oval face",
      "soft pretty girlfriend face, light natural makeup",
      "petite curvy body, soft breasts, narrow waist, fair warm skin",
      "cute-sexy vibe, soft pink and black clothes when clothed",
      "approachable beauty, NOT blonde, NOT pale gothic, NOT freckled blonde",
    ].join(", "),
  },
  mira: {
    preferredMode: "realistic",
    look: [
      "1girl, solo, adult woman 28, elegant european-mixed features",
      "sleek dark brown shoulder-length hair, often half-up, hazel-green eyes",
      "defined cheekbones, poised confident face, expensive minimal makeup",
      "tall lean hourglass, long legs, refined medium breasts, olive-fair skin",
      "black silk, tailored, wine lipstick when made up",
      "dominant elegance, NOT cute, NOT blonde, NOT freckled, NOT petite soft",
    ].join(", "),
  },
  nova: {
    preferredMode: "lust",
    look: [
      "1girl, solo, adult woman 24",
      "messy wavy honey-blonde hair dark roots, bright blue-green eyes, freckles",
      "wide playful grin, expressive bratty face",
      "athletic fit body, toned abs vibe, strong thighs, smaller athletic breasts, sun-kissed skin",
      "crop top streetwear gym-hot energy, gold jewelry",
      "chaotic hot, NOT black hair, NOT pale goth, NOT soft romantic redhead",
    ].join(", "),
  },
  elena: {
    preferredMode: "realistic",
    look: [
      "1girl, solo, adult woman 26",
      "long wavy auburn chestnut hair, soft green-grey eyes, full lips, light freckles",
      "gentle romantic face, soft expression",
      "soft full figure, plush curves, generous breasts, warm ivory skin",
      "linen blouse long skirt bookish sensual fashion",
      "quiet heat, NOT jet black hair, NOT athletic blonde, NOT sharp goth",
    ].join(", "),
  },
  raven: {
    preferredMode: "realistic",
    look: [
      "1girl, solo, adult woman 27",
      "straight jet-black hair sleek, pale cool skin, icy grey eyes, dark eyeliner",
      "sharp seductive face, deep berry or black lipstick",
      "tall slim, sharp shoulders, high small-medium breasts, long fingers",
      "all-black leather sheer mesh silver rings expensive dark fashion",
      "midnight edge, NOT blonde, NOT warm soft girlfriend, NOT freckled sunny",
    ].join(", "),
  },
  yuki: {
    preferredMode: "pony",
    look: [
      "1girl, solo, adult woman 23, mature female, 18+",
      "light ash-brown soft bob or half-up hair, large warm amber-brown eyes",
      "round soft adult face, easy blush on cheeks, shy smile",
      "petite short height, soft slim-curvy body, modest soft breasts, pale peach skin",
      "pastel cardigan cute adult fashion, NOT loli, NOT childlike proportions",
      "sweet melt, NOT black long hair koharu, NOT blonde nova, NOT goth raven",
    ].join(", "),
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
      "nsfw, explicit, uncensored, erotic, pornographic, hardcore sex, adult woman 18+, raw photo quality, detailed genitals, detailed anatomy",
    negative:
      "child, loli, shota, underage, young, teen, kid, toddler, looking at viewer, eye contact, selfie, phone selfie, front-facing camera, portrait selfie, worst quality, low quality, blurry, bad anatomy, bad hands, text, watermark, logo, censored, bar censor, mosaic censoring, deformed, ugly, extra fingers, cartoon, anime, clothed, lingerie only, covered nipples, covered pussy",
    aspect: "896*1152",
  },
  pony: {
    model: "ponyDiffusionV6XL_v6StartWithThisOne (1).safetensors",
    styles: ["Fooocus Pony"],
    performance: "Speed",
    cfg: 7,
    sharpness: 2,
    promptPrefix:
      "score_9, score_8_up, score_7_up, source_anime, rating_explicit, nsfw, explicit, uncensored, sexual, 1girl, adult woman, detailed pussy, detailed breasts",
    negative:
      "score_6, score_5, score_4, child, loli, shota, underage, young, teen, kid, looking at viewer, eye contact, selfie, worst quality, low quality, blurry, bad anatomy, bad hands, text, watermark, censored, bar censor, mosaic censoring, clothed",
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
      "nsfw, photorealistic, explicit uncensored erotic photo, adult woman 18+, detailed skin, detailed genitals, natural lighting",
    negative:
      "child, loli, underage, young, teen, looking at viewer, eye contact, selfie, phone camera, cartoon, anime, manga, 3d render, plastic skin, worst quality, low quality, blurry, bad anatomy, text, watermark, censored, clothed",
    aspect: "896*1152",
  },
};

/** Rotating full-explicit scenes — NO forced eye contact / selfie framing */
const EXPLICIT_SCENES = [
  "fully nude, legs spread on bed, pussy visible, aroused, from above angle, eyes closed in pleasure, moaning expression",
  "fully nude, doggystyle pose on bed, ass and pussy visible from behind, arched back, face turned to side, hard sex",
  "fully nude, missionary sex with male partner, legs open, penetration, side angle, head tilted back in ecstasy",
  "fully nude, riding cowgirl, breasts bouncing, penetration visible, camera from side-low angle, eyes half-closed",
  "fully nude, blowjob, kneeling, oral sex, cock in mouth, side profile view, saliva, erotic",
  "fully nude, bent over table, from behind, spread ass, pussy exposed, looking over shoulder not at camera",
  "fully nude, missionary masturbation, fingers in pussy, legs up, overhead angle, pleasure face eyes closed",
  "fully nude, against wall standing sex, leg up, penetration, side three-quarter view, sweaty skin",
  "fully nude, prone bone sex face down on sheets, ass up, from behind angle, gripping sheets",
  "fully nude, 69 oral sex, mutual, side view, detailed bodies, explicit",
  "fully nude, reverse cowgirl, ass facing viewer-ish from behind-side, penetration, arched back, face away",
  "fully nude, lying on side, spooning sex, penetration, intimate side angle, soft moans eyes shut",
  "fully nude, on knees presenting, face down ass up, pussy and asshole visible, rear angle, submissive",
  "fully nude, sitting on edge of bed, thighs open, fingering herself, three-quarter side view, not looking at camera",
  "fully nude, deepthroat oral, hands on cock, extreme close side angle, tears of pleasure, explicit",
  "fully nude, standing doggy against dresser, from side-behind, hard fucking, bouncing body",
  "fully nude, spread eagle on bed, full body from foot of bed, wet pussy, nipples hard, head rolled to side",
  "fully nude, handjob and kissing neck, partner out of frame mostly, intimate side angle, bedroom",
];

/** Softer but still nude scenes if user is mild (rare) */
const NUDE_POSE_SCENES = [
  "completely naked, lying on stomach on bed, from side, face in pillow, bare ass, soft light",
  "completely naked, kneeling on bed from side angle, hands on breasts, eyes closed, arched back",
  "completely naked, stepping out of shower, wet skin, from side profile, not facing camera",
  "completely naked, on all fours on sheets, rear three-quarter view, looking away",
];

function pickScene(pool: string[], seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  // mix in time so repeated "show" rotates
  h = (h + Math.floor(Date.now() / 30_000)) % pool.length;
  return pool[h];
}

/** User wants classic selfie / eye contact */
function wantsSelfieFraming(text: string): boolean {
  return /\b(selfie|selfies|look(ing)? at (me|you|camera|viewer)|eye contact|facetime|front (facing|camera)|to the camera)\b/i.test(
    text,
  );
}

/** Map casual user words → explicit visual tags */
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

  if (bareRequest && !actTags) {
    // Default: full explicit sex / nude act, varied angle — NOT camera stare
    scene = pickScene(EXPLICIT_SCENES, `${opts.companionId}:${raw}`);
  } else if (bareRequest && actTags) {
    scene = actTags;
  } else {
    scene = [scene, actTags].filter(Boolean).join(", ");
    // Always push full explicit unless user clearly asked clothed/lingerie only
    if (!/\b(lingerie|clothed|dressed|outfit|cosplay only)\b/i.test(raw)) {
      scene = `${scene}, fully nude, explicit nsfw, uncensored, detailed genitals, sexual`;
    }
  }

  // Camera framing
  if (selfie) {
    scene = `${scene}, selfie, looking at viewer, eye contact, front facing, phone camera perspective`;
  } else {
    // Explicitly steer away from default selfie bias models love
    scene = `${scene}, cinematic erotic angle, natural pose, averted gaze or eyes closed, not a selfie, not looking at camera`;
  }

  // Global hardcore polish
  scene = `${scene}, completely naked, bare breasts, nipples, bare pussy, explicit sex, erotic, pornographic quality`;

  // Prefer hard visual fingerprint so each companion does not collapse to the same face
  const look =
    visual?.look ||
    opts.appearance.replace(/\s+/g, " ").slice(0, 320) ||
    "beautiful adult woman";
  const appearanceExtra = opts.appearance
    ? opts.appearance.replace(/\s+/g, " ").slice(0, 220)
    : "";

  const prompt = [
    config.promptPrefix,
    opts.companionName,
    "1girl, solo, mature female, 18+, distinct character design",
    look,
    appearanceExtra,
    scene,
    "same character consistency, unique face for this companion only",
    "masterpiece, best quality, detailed skin, detailed face, detailed body",
  ]
    .filter(Boolean)
    .join(", ");

  // If user wants selfie, strip anti-selfie negatives
  let negative = config.negative;
  if (selfie) {
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

/** Exported for tests / fallbacks */
export function defaultExplicitScene(seed = "show"): string {
  return pickScene(EXPLICIT_SCENES, seed);
}

export function defaultNudePoseScene(seed = "nude"): string {
  return pickScene(NUDE_POSE_SCENES, seed);
}
