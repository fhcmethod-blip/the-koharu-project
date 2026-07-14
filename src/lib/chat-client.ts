import type { Character, ChatMessage } from "./types";

export type ChatReply = {
  content: string;
  imageUrl?: string;
  imageSource?: string;
  imageError?: string;
  source?: "openrouter" | "xai" | "local" | "mock";
  model?: string;
  note?: string;
};

/**
 * Client helper — always talks to our server route so keys stay server-side
 * and hard-baked rules are applied there.
 */
export async function generateReply(
  character: Character,
  history: ChatMessage[],
  userText: string,
): Promise<ChatReply> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ character, history, userText }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error || `Chat failed (${res.status})`,
    );
  }

  return (await res.json()) as ChatReply;
}
