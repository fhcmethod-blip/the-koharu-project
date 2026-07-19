/**
 * Companion Creator — body sliders + example presets.
 * All companions are consenting adults 18+.
 */

export type CreatorGender = "female" | "male";

export type BodySliders = {
  /** 1 petite … 5 very tall */
  height: number;
  /** 1 slim … 5 thick/heavy */
  build: number;
  /** 1 flat/small … 5 large (bust or male chest) */
  chest: number;
  /** 1 narrow … 5 soft/wide */
  waist: number;
  /** 1 narrow … 5 very wide */
  hips: number;
  /** 1 flat … 5 thick */
  butt: number;
  /** 1 soft … 5 muscular */
  muscle: number;
  /** 1 soft cute … 5 sharp angular */
  face: number;
  /** 18 | 19 | 20 display age look */
  age: number;
};

export type CreatorStyle = {
  hairLength: string;
  hairColor: string;
  eyeColor: string;
  skinTone: string;
  fashion: string;
  vibe: string;
};

export type CreatorDraft = {
  name: string;
  gender: CreatorGender;
  tagline: string;
  body: BodySliders;
  style: CreatorStyle;
  personality: string[];
};

export type SliderDef = {
  key: keyof BodySliders;
  label: string;
  min: number;
  max: number;
  /** Label at each step 1..n */
  steps: string[];
  /** Short example under the slider */
  example: string;
  /** Hide for male (e.g. bust wording still used as chest) */
  femaleOnly?: boolean;
};

export const BODY_SLIDERS: SliderDef[] = [
  {
    key: "height",
    label: "Height",
    min: 1,
    max: 5,
    steps: ["Petite", "Short", "Average", "Tall", "Very tall"],
    example: "e.g. Petite like Yuki · Tall like Raven",
  },
  {
    key: "build",
    label: "Body build",
    min: 1,
    max: 5,
    steps: ["Slim", "Lean", "Average", "Curvy", "Thick"],
    example: "e.g. Slim cyber brat · Soft full curves",
  },
  {
    key: "chest",
    label: "Bust / chest",
    min: 1,
    max: 5,
    steps: ["Small", "Modest", "Medium", "Full", "Large"],
    example: "Adult proportions only — small athletic → full",
  },
  {
    key: "waist",
    label: "Waist",
    min: 1,
    max: 5,
    steps: ["Very narrow", "Narrow", "Average", "Soft", "Wide"],
    example: "Hourglass = narrow waist + wider hips",
  },
  {
    key: "hips",
    label: "Hips",
    min: 1,
    max: 5,
    steps: ["Narrow", "Slim", "Average", "Wide", "Very wide"],
    example: "Pairs with waist for silhouette",
  },
  {
    key: "butt",
    label: "Butt",
    min: 1,
    max: 5,
    steps: ["Flat", "Small", "Round", "Full", "Thick"],
    example: "e.g. Round athletic · Soft full",
  },
  {
    key: "muscle",
    label: "Muscle / tone",
    min: 1,
    max: 5,
    steps: ["Soft", "Light tone", "Athletic", "Fit", "Muscular"],
    example: "Soft girlfriend · Gym athletic · Defined abs",
  },
  {
    key: "face",
    label: "Face shape",
    min: 1,
    max: 5,
    steps: ["Soft / cute", "Pretty", "Striking", "Sharp", "Angular"],
    example: "Soft blushy · Sharp cheekbones · Intense",
  },
  {
    key: "age",
    label: "Age (adult)",
    min: 18,
    max: 20,
    steps: ["18", "19", "20"],
    example: "Always 18+ adults only",
  },
];

export const HAIR_LENGTHS = [
  "buzz / very short",
  "short bob",
  "shoulder-length",
  "long",
  "very long",
  "messy medium",
  "slicked back",
  "half-up",
];

export const HAIR_COLORS = [
  "black",
  "dark brown",
  "light brown",
  "ash brown",
  "blonde",
  "dirty blonde",
  "platinum",
  "pastel pink",
  "neon cyan / teal",
  "auburn / chestnut",
  "jet black with neon streaks",
  "silver / grey-dyed",
];

export const EYE_COLORS = [
  "brown",
  "amber",
  "hazel-green",
  "green",
  "blue",
  "grey",
  "violet / contacts",
  "cyan contacts",
];

export const SKIN_TONES = [
  "fair / pale",
  "fair warm",
  "light olive",
  "medium",
  "sun-kissed",
  "tan",
  "deep brown",
  "cool pale",
];

export const FASHIONS = [
  "casual hoodie / jeans",
  "black silk elegant",
  "pastel cardigan soft",
  "neon cyber street",
  "goth leather / mesh",
  "linen bookish",
  "gym tank / athletic",
  "lingerie / intimate",
];

export const VIBES = [
  "soft girlfriend / boyfriend",
  "bratty playful",
  "calm dominant",
  "shy devoted sub",
  "dark seductive",
  "romantic slow-burn",
  "chaotic fun",
];

export type ExamplePreset = {
  id: string;
  name: string;
  blurb: string;
  draft: CreatorDraft;
};

export const EXAMPLE_PRESETS: ExamplePreset[] = [
  {
    id: "soft-petite",
    name: "Soft petite",
    blurb: "Short, blushy, sweet — guided energy",
    draft: {
      name: "Yuki-like",
      gender: "female",
      tagline: "Sweet melt",
      body: {
        height: 1,
        build: 2,
        chest: 2,
        waist: 2,
        hips: 2,
        butt: 2,
        muscle: 1,
        face: 1,
        age: 18,
      },
      style: {
        hairLength: "short bob",
        hairColor: "ash brown",
        eyeColor: "amber",
        skinTone: "fair warm",
        fashion: "pastel cardigan soft",
        vibe: "shy devoted sub",
      },
      personality: ["shy", "eager", "sweet", "devoted"],
    },
  },
  {
    id: "neon-brat",
    name: "Neon brat",
    blurb: "Petite cyber street chaos",
    draft: {
      name: "Nova-like",
      gender: "female",
      tagline: "Neon chaos",
      body: {
        height: 1,
        build: 1,
        chest: 1,
        waist: 1,
        hips: 2,
        butt: 2,
        muscle: 3,
        face: 2,
        age: 18,
      },
      style: {
        hairLength: "short bob",
        hairColor: "neon cyan / teal",
        eyeColor: "cyan contacts",
        skinTone: "fair / pale",
        fashion: "neon cyber street",
        vibe: "bratty playful",
      },
      personality: ["bratty", "funny", "unfiltered", "energetic"],
    },
  },
  {
    id: "elegant-power",
    name: "Elegant power",
    blurb: "Tall lean, quiet control",
    draft: {
      name: "Mira-like",
      gender: "female",
      tagline: "Velvet control",
      body: {
        height: 4,
        build: 2,
        chest: 3,
        waist: 1,
        hips: 3,
        butt: 3,
        muscle: 2,
        face: 4,
        age: 20,
      },
      style: {
        hairLength: "shoulder-length",
        hairColor: "dark brown",
        eyeColor: "hazel-green",
        skinTone: "light olive",
        fashion: "black silk elegant",
        vibe: "calm dominant",
      },
      personality: ["dominant", "calm", "confident", "precise"],
    },
  },
  {
    id: "soft-curves",
    name: "Soft curves",
    blurb: "Plush romantic, slow heat",
    draft: {
      name: "Elena-like",
      gender: "female",
      tagline: "Quiet heat",
      body: {
        height: 3,
        build: 4,
        chest: 4,
        waist: 3,
        hips: 4,
        butt: 4,
        muscle: 1,
        face: 2,
        age: 19,
      },
      style: {
        hairLength: "long",
        hairColor: "auburn / chestnut",
        eyeColor: "green",
        skinTone: "fair warm",
        fashion: "linen bookish",
        vibe: "romantic slow-burn",
      },
      personality: ["soft", "poetic", "sensual", "attentive"],
    },
  },
  {
    id: "midnight-edge",
    name: "Midnight edge",
    blurb: "Slim, sharp, dark fashion",
    draft: {
      name: "Raven-like",
      gender: "female",
      tagline: "Midnight edge",
      body: {
        height: 4,
        build: 1,
        chest: 2,
        waist: 1,
        hips: 2,
        butt: 2,
        muscle: 2,
        face: 5,
        age: 20,
      },
      style: {
        hairLength: "long",
        hairColor: "black",
        eyeColor: "grey",
        skinTone: "cool pale",
        fashion: "goth leather / mesh",
        vibe: "dark seductive",
      },
      personality: ["seductive", "intense", "clever", "mysterious"],
    },
  },
  {
    id: "gym-guy",
    name: "Gym chaos guy",
    blurb: "Athletic smirk energy",
    draft: {
      name: "Jax-like",
      gender: "male",
      tagline: "Trouble with a smirk",
      body: {
        height: 3,
        build: 3,
        chest: 4,
        waist: 2,
        hips: 2,
        butt: 3,
        muscle: 4,
        face: 2,
        age: 18,
      },
      style: {
        hairLength: "messy medium",
        hairColor: "dirty blonde",
        eyeColor: "green",
        skinTone: "sun-kissed",
        fashion: "gym tank / athletic",
        vibe: "chaotic fun",
      },
      personality: ["bratty", "funny", "playful", "unfiltered"],
    },
  },
  {
    id: "soft-bf",
    name: "Soft boyfriend",
    blurb: "Lean, warm, attentive",
    draft: {
      name: "Kai-like",
      gender: "male",
      tagline: "Your soft obsession",
      body: {
        height: 3,
        build: 2,
        chest: 3,
        waist: 2,
        hips: 2,
        butt: 2,
        muscle: 3,
        face: 2,
        age: 19,
      },
      style: {
        hairLength: "messy medium",
        hairColor: "black",
        eyeColor: "brown",
        skinTone: "fair warm",
        fashion: "casual hoodie / jeans",
        vibe: "soft girlfriend / boyfriend",
      },
      personality: ["affectionate", "playful", "attentive", "bold"],
    },
  },
];

export const DEFAULT_DRAFT: CreatorDraft = {
  name: "",
  gender: "female",
  tagline: "",
  body: {
    height: 3,
    build: 3,
    chest: 3,
    waist: 2,
    hips: 3,
    butt: 3,
    muscle: 2,
    face: 2,
    age: 19,
  },
  style: {
    hairLength: "long",
    hairColor: "dark brown",
    eyeColor: "brown",
    skinTone: "fair warm",
    fashion: "casual hoodie / jeans",
    vibe: "soft girlfriend / boyfriend",
  },
  personality: ["playful", "affectionate"],
};

function stepLabel(def: SliderDef, value: number): string {
  if (def.key === "age") return `${value}`;
  const idx = Math.min(def.steps.length, Math.max(1, value)) - 1;
  return def.steps[idx] || String(value);
}

export function sliderLabel(key: keyof BodySliders, value: number): string {
  const def = BODY_SLIDERS.find((s) => s.key === key);
  if (!def) return String(value);
  return stepLabel(def, value);
}

/** Build natural-language appearance for AI + image gen */
export function buildAppearanceFromDraft(d: CreatorDraft): string {
  const b = d.body;
  const s = d.style;
  const genderWord =
    d.gender === "male" ? "young adult man" : "young adult woman";
  const age = Math.min(20, Math.max(18, Math.round(b.age)));

  const height = sliderLabel("height", b.height);
  const build = sliderLabel("build", b.build);
  const chest = sliderLabel("chest", b.chest);
  const waist = sliderLabel("waist", b.waist);
  const hips = sliderLabel("hips", b.hips);
  const butt = sliderLabel("butt", b.butt);
  const muscle = sliderLabel("muscle", b.muscle);
  const face = sliderLabel("face", b.face);

  const chestPhrase =
    d.gender === "male"
      ? `${chest.toLowerCase()} chest`
      : `${chest.toLowerCase()} breasts`;

  return [
    `Photorealistic ${genderWord}, ${age}.`,
    `Height/build: ${height.toLowerCase()}, ${build.toLowerCase()} frame.`,
    `Body: ${chestPhrase}, ${waist.toLowerCase()} waist, ${hips.toLowerCase()} hips, ${butt.toLowerCase()} butt, ${muscle.toLowerCase()} muscle tone.`,
    `Face: ${face.toLowerCase()} adult face.`,
    `Hair: ${s.hairLength}, ${s.hairColor}. Eyes: ${s.eyeColor}. Skin: ${s.skinTone}.`,
    `Fashion vibe: ${s.fashion}. Personality energy: ${s.vibe}.`,
    "Consenting adult 18+ only — never childlike or underage framing. Real person look, not anime unless asked.",
  ].join(" ");
}

/** Compact look tags for Fooocus */
export function buildLookTagsFromDraft(d: CreatorDraft): string {
  const b = d.body;
  const s = d.style;
  const age = Math.min(20, Math.max(18, Math.round(b.age)));
  const g = d.gender === "male" ? "1boy, adult man" : "1girl, adult woman";
  return [
    `photorealistic, raw photo, ${g} ${age} years old, young adult`,
    `${sliderLabel("height", b.height)} height`,
    `${sliderLabel("build", b.build)} build`,
    d.gender === "female"
      ? `${sliderLabel("chest", b.chest)} breasts`
      : `${sliderLabel("chest", b.chest)} male chest`,
    `${sliderLabel("waist", b.waist)} waist`,
    `${sliderLabel("hips", b.hips)} hips`,
    `${sliderLabel("butt", b.butt)} butt`,
    `${sliderLabel("muscle", b.muscle)} muscle tone`,
    `${sliderLabel("face", b.face)} face`,
    `${s.hairLength} ${s.hairColor} hair`,
    `${s.eyeColor} eyes`,
    `${s.skinTone} skin`,
    s.fashion,
    "adult proportions only, 18+",
  ].join(", ");
}

export function buildProfilePrompt(d: CreatorDraft): string {
  const name = d.name.trim() || "custom companion";
  return [
    "photorealistic portrait, 85mm, looking at viewer, soft studio or natural light",
    buildLookTagsFromDraft(d),
    name,
    "upper body portrait, adult only",
  ].join(", ");
}

export type SavedCustomCompanion = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  draft: CreatorDraft;
  appearance: string;
  look: string;
  profilePrompt: string;
  /** Generated portrait URL (cloud bridge) or data URL */
  avatarUrl?: string;
  /** Preferred Fooocus mode */
  imageMode?: "lust" | "pony" | "realistic";
};

const STORAGE_KEY = "kohar_custom_companions_v1";

export function loadCustomCompanions(): SavedCustomCompanion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedCustomCompanion[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getCustomCompanion(id: string): SavedCustomCompanion | undefined {
  return loadCustomCompanions().find((c) => c.id === id);
}

function persistAll(all: SavedCustomCompanion[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, 40)));
}

export function saveCustomCompanion(
  draft: CreatorDraft,
  opts?: { avatarUrl?: string; imageMode?: SavedCustomCompanion["imageMode"]; id?: string },
): SavedCustomCompanion {
  const existingId = opts?.id;
  const id =
    existingId ||
    "custom-" +
      (draft.name || "companion")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 24) +
      "-" +
      Date.now().toString(36);

  const prev = existingId ? getCustomCompanion(existingId) : undefined;
  const entry: SavedCustomCompanion = {
    id,
    createdAt: prev?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    draft: {
      ...draft,
      body: { ...draft.body },
      style: { ...draft.style },
      personality: [...draft.personality],
    },
    appearance: buildAppearanceFromDraft(draft),
    look: buildLookTagsFromDraft(draft),
    profilePrompt: buildProfilePrompt(draft),
    avatarUrl: opts?.avatarUrl ?? prev?.avatarUrl,
    imageMode:
      opts?.imageMode ||
      prev?.imageMode ||
      (draft.gender === "male" ? "pony" : "lust"),
  };

  const all = loadCustomCompanions().filter((c) => c.id !== id);
  all.unshift(entry);
  persistAll(all);
  return entry;
}

export function updateCustomCompanion(
  id: string,
  patch: Partial<
    Pick<SavedCustomCompanion, "avatarUrl" | "imageMode" | "draft" | "appearance" | "look" | "profilePrompt">
  >,
): SavedCustomCompanion | null {
  const all = loadCustomCompanions();
  const idx = all.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  const cur = all[idx];
  const draft = patch.draft
    ? {
        ...patch.draft,
        body: { ...patch.draft.body },
        style: { ...patch.draft.style },
        personality: [...patch.draft.personality],
      }
    : cur.draft;
  const next: SavedCustomCompanion = {
    ...cur,
    ...patch,
    draft,
    appearance: patch.appearance ?? (patch.draft ? buildAppearanceFromDraft(draft) : cur.appearance),
    look: patch.look ?? (patch.draft ? buildLookTagsFromDraft(draft) : cur.look),
    profilePrompt:
      patch.profilePrompt ??
      (patch.draft ? buildProfilePrompt(draft) : cur.profilePrompt),
    updatedAt: new Date().toISOString(),
  };
  all[idx] = next;
  persistAll(all);
  return next;
}

export function deleteCustomCompanion(id: string) {
  const all = loadCustomCompanions().filter((c) => c.id !== id);
  persistAll(all);
}

/** Convert a saved custom companion into a Character for chat / API */
export function customToCharacter(c: SavedCustomCompanion): import("./types").Character {
  const d = c.draft;
  const age = Math.min(20, Math.max(18, Math.round(d.body.age)));
  const name = d.name.trim() || "Custom";
  return {
    id: c.id,
    name,
    age,
    gender: d.gender,
    tagline: d.tagline || "Custom companion",
    summary: d.tagline || "Created in Companion Creator",
    bio: c.appearance,
    personality: d.personality.length ? d.personality : ["playful", "affectionate"],
    style: d.style.vibe,
    accent: d.gender === "male" ? "#38bdf8" : "#e84a7f",
    gradient:
      d.gender === "male"
        ? "from-sky-500/40 via-indigo-700/30 to-violet-950/50"
        : "from-rose-500/40 via-fuchsia-700/30 to-violet-950/50",
    order: 100,
    tags: ["custom", "creator", d.gender === "male" ? "guy" : "girl"],
    greeting:
      "Hey… you made me. What do you want to do first?",
    appearance: c.appearance,
    voice: `Natural, matching the vibe: ${d.style.vibe}.`,
    relationship: "Your custom companion — designed by you.",
    likes: ["attention", "honest desire", "the body you designed"],
    limits: ["anything involving minors", "real-world crime"],
    scenarioHooks: [
      "First night after you created me",
      "Trying on the look you built",
    ],
    aiNotes: `Custom companion created by user. Age ${age}, adult only. Vibe: ${d.style.vibe}. Always match appearance description. Never underage framing.`,
    avatarUrl: c.avatarUrl || undefined,
    coverUrl: c.avatarUrl || undefined,
    look: c.look,
    imageMode: c.imageMode || (d.gender === "male" ? "pony" : "lust"),
    profilePrompt: c.profilePrompt,
  };
}
