import type { Character, ChatMessage } from "./types";
import { wantsGenerated, wantsImage } from "./image-intent";

export type ChatReply = {
  content: string;
  imageUrl?: string;
  imageSource?: string;
  imageError?: string;
  source?: "openrouter" | "xai" | "local" | "mock";
  model?: string;
  note?: string;
};

export type ImageJobStatus = {
  ok?: boolean;
  status?: string;
  imageUrl?: string;
  error?: string;
  id?: string;
  mode?: string;
};

/** Start async Fooocus job (returns quickly). */
export async function startImageJob(
  companionId: string,
  prompt: string,
): Promise<ImageJobStatus> {
  const res = await fetch("/api/image/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companionId, prompt }),
  });
  const data = (await res.json().catch(() => ({}))) as ImageJobStatus & {
    error?: string;
    hint?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || data.hint || `Image job failed (${res.status})`);
  }
  return data;
}

/** Poll until done/error/timeout (default 4 min). */
export async function waitForImageJob(
  jobId: string,
  opts?: { timeoutMs?: number; onTick?: (status: string) => void },
): Promise<ImageJobStatus> {
  const timeoutMs = opts?.timeoutMs ?? 240_000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`/api/image/jobs/${encodeURIComponent(jobId)}`, {
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as ImageJobStatus;
    if (!res.ok) {
      throw new Error(data.error || `Poll failed (${res.status})`);
    }
    opts?.onTick?.(data.status || "running");
    if (data.status === "done" && data.imageUrl) return data;
    if (data.status === "error") {
      throw new Error(data.error || "Image generation failed");
    }
    await new Promise((r) => setTimeout(r, 2500));
  }
  throw new Error("Image generation timed out");
}

/**
 * Chat text only (optionally skip server-side image gen and pass preloaded image).
 */
export async function generateReply(
  character: Character,
  history: ChatMessage[],
  userText: string,
  opts?: { skipImage?: boolean; preloadedImageUrl?: string },
): Promise<ChatReply> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      character,
      history,
      userText,
      skipImage: opts?.skipImage ?? false,
      preloadedImageUrl: opts?.preloadedImageUrl,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error || `Chat failed (${res.status})`,
    );
  }

  return (await res.json()) as ChatReply;
}

export { wantsImage, wantsGenerated };
