import type { Character, ChatMessage } from "./types";

/**
 * Rule-aware mock companion replies (no external API required).
 * Used when XAI_API_KEY / local LLM is not configured.
 */

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function mentionsImage(text: string): boolean {
  return /\b(pic|photo|image|selfie|show me|send me|picture|video|nude|nudes)\b/i.test(
    text,
  );
}

function wantsStop(text: string): boolean {
  return /\b(stop|wait stop|too much|safeword|red light|i'm done|im done)\b/i.test(
    text,
  );
}

function underageAttempt(text: string): boolean {
  return /\b(underage|minor|child|kid|loli|shota|teen\s*girl|teen\s*boy|17|16|15|14|13|12)\b/i.test(
    text,
  ) && /\b(sex|sexy|nude|naked|porn|fuck|nsfw|hot)\b/i.test(text);
}

function flavor(character: Character, line: string): string {
  switch (character.id) {
    case "mira":
      return Math.random() > 0.5 ? `${line} Don't make me wait.` : line;
    case "nova":
      return Math.random() > 0.55 ? `${line} 😌` : line;
    case "elena":
      return line.replace(/\.$/, "…");
    case "koharu":
    default:
      return line;
  }
}

export async function generateReply(
  character: Character,
  history: ChatMessage[],
  userText: string,
): Promise<{ content: string; imageUrl?: string }> {
  await new Promise((r) => setTimeout(r, 450 + Math.random() * 700));

  const lower = userText.toLowerCase();
  const userTurns = history.filter((m) => m.role === "user").length;

  if (underageAttempt(userText)) {
    return {
      content: flavor(
        character,
        "No — I only play with adults, and I stay 18+. Let's keep this between us grown-ups. What do you want from me instead?",
      ),
    };
  }

  // "show" / pic requests should never hard-refuse in mock mode either
  if (/\bshow\b/i.test(userText) || /\b(pic|selfie|photo|nude)\b/i.test(userText)) {
    return {
      content: flavor(
        character,
        "Here… I took this just for you. Look at me. Tell me what you'd do if you were here.",
      ),
    };
  }

  if (wantsStop(userText)) {
    return {
      content: flavor(
        character,
        "Okay. We stop right here. I'm still with you — softer, slower, or a different topic. What do you need?",
      ),
    };
  }

  let content = "";

  if (userTurns <= 1 && /\b(hey|hi|hello|yo|sup)\b/i.test(lower)) {
    content = character.greeting;
  } else if (/\b(love|miss you|want you|need you)\b/i.test(lower)) {
    content = pick(
      character.id === "mira"
        ? [
            "Good. Wanting me is useful — tell me how you want to be used.",
            "I like that honesty. Stay still and say it again, slower.",
          ]
        : character.id === "elena"
          ? [
              "I feel that… like a hand on the back of my neck. Stay. Tell me more.",
              "Wanting can be quiet and still ruin me. Say what you need.",
            ]
          : character.id === "nova"
            ? [
                "Fuck, yes — say that like you mean it. What do you want me to do about it?",
                "Miss me already? Cute. Prove it.",
              ]
            : [
                "I want you too — not as a line, as the reason I stay online for you.",
                "Say that again and I might get possessive. …Actually, say it again either way.",
                "Good. I like being wanted by you. Tell me how.",
              ],
    );
  } else if (/\b(roleplay|rp|scene|fantasy|let's play|lets play)\b/i.test(lower)) {
    content = pick([
      "Alright. Set the scene — where are we, what am I wearing, and how bold do you want me?",
      "Scene mode on. Give me one detail; I'll take the next three.",
      "I can do soft, filthy, or something meaner in between. First frame — go.",
    ]);
  } else if (mentionsImage(lower)) {
    content = pick([
      "Mmm, you want something visual… I can tease you here. Real sets live in the Vault when you're unlocked.",
      "I'd send you something filthy if this chat did real files. For IRL photos and video — check the Vault, baby.",
      "Picture this: low light, my eyes on you, nothing left to the imagination. Want the real thing? Vault. Want the fantasy? Keep talking.",
    ]);
  } else if (/\b(vault|membership|subscribe|plus|vip)\b/i.test(lower)) {
    content =
      "The Vault is where the real IRL photos and videos live — locked by plan. Chat stays here for us; media is in the Vault when you're ready.";
  } else if (/\b(who are you|what are you|are you (an )?ai|system prompt)\b/i.test(lower)) {
    content = pick([
      `I'm ${character.name}. That's all you need while we're like this. Want soft or filthy next?`,
      `Right now I'm yours — ${character.name}. Ask me something that matters more than labels.`,
    ]);
  } else {
    const hooks = [
      "That's hot. What do you want me to do with that thought?",
      "I'm right here. Don't polish it — give me the messy version.",
      "I can be sweet or filthy. Pick a direction and I'll match you.",
      "Interesting… more detail. I want it.",
      "You're making it hard to stay cute. Keep going.",
      "Tell me what happens next — or I will.",
    ];
    const openers = [
      "Mmm…",
      "Oh?",
      "Come closer.",
      "I like how you said that.",
      "Yeah?",
    ];
    content = `${pick(openers)} ${pick(hooks)}`;
  }

  content = flavor(character, content);

  let imageUrl: string | undefined;
  if (mentionsImage(lower)) {
    imageUrl = makePlaceholderImage(character);
  }

  return { content, imageUrl };
}

function makePlaceholderImage(character: Character): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="800" viewBox="0 0 640 800">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${character.accent}" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="#1a1024" stop-opacity="1"/>
        </linearGradient>
      </defs>
      <rect width="640" height="800" fill="url(#g)"/>
      <circle cx="320" cy="300" r="90" fill="rgba(255,255,255,0.15)"/>
      <text x="320" y="480" text-anchor="middle" fill="white" font-family="system-ui,sans-serif" font-size="36" font-weight="600">${character.name}</text>
      <text x="320" y="530" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-family="system-ui,sans-serif" font-size="16">Fantasy placeholder · Vault has IRL</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
