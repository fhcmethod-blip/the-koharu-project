import type { ChatMessage } from "./types";

function key(characterId: string) {
  return `kohar_chat_${characterId}`;
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
  localStorage.setItem(key(characterId), JSON.stringify(messages));
}

export function clearChat(characterId: string) {
  localStorage.removeItem(key(characterId));
}
