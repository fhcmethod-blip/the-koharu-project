import type { ChatMessage } from "./types";

function key(characterId: string) {
  return `kohar_chat_${characterId}`;
}

/** Drop giant data-URL images so mobile Safari localStorage (~5MB) does not throw. */
function slimMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m) => {
    if (!m.imageUrl) return m;
    if (m.imageUrl.startsWith("data:") && m.imageUrl.length > 4000) {
      return { ...m, imageUrl: undefined };
    }
    return m;
  });
}

export function loadChat(characterId: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key(characterId));
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

export function saveChat(characterId: string, messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key(characterId), JSON.stringify(messages));
  } catch {
    // QuotaExceededError is common on iPhone after a few base64 images
    try {
      localStorage.setItem(key(characterId), JSON.stringify(slimMessages(messages)));
    } catch {
      try {
        // Last resort: keep last 20 text-only turns
        const tiny = slimMessages(messages)
          .slice(-20)
          .map((m) => ({ ...m, imageUrl: undefined }));
        localStorage.setItem(key(characterId), JSON.stringify(tiny));
      } catch {
        // ignore — chat still works in memory this session
      }
    }
  }
}

export function clearChat(characterId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key(characterId));
  } catch {
    // ignore
  }
}
