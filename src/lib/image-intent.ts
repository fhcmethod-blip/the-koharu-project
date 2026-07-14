/** Client + server safe: detect image requests (no Node fs). */

export function wantsImage(text: string): boolean {
  const t = text.trim();
  if (/\bshow\b/i.test(t)) return true;
  return (
    /\b(pic|pics|photo|photos|image|images|selfie|selfies|picture|visual|ai art)\b/i.test(
      t,
    ) ||
    /\b(send me|send a|snap)\b/i.test(t) ||
    /\b(nude|nudes|naked)\b/i.test(t) ||
    /\b(generate|draw|render)\b.*\b(pic|photo|image|selfie|nude|body)\b/i.test(
      t,
    ) ||
    /\b(pic|photo|image|selfie|nude).*\b(generate|draw|render)\b/i.test(t)
  );
}

/** Prefer Fooocus gen. "show" always starts generation. */
export function wantsGenerated(text: string): boolean {
  const t = text.trim();
  if (/\bshow\b/i.test(t)) return true;
  return (
    /\b(generate|ai |draw|render|imagine|txt2img|pony|fooocus)\b/i.test(t) ||
    /\b(fantasy (pic|image|photo)|make (me )?(a |an )?(pic|image|photo|selfie))\b/i.test(
      t,
    ) ||
    /\b(nude selfie|naked selfie|nsfw (pic|photo|image))\b/i.test(t)
  );
}
