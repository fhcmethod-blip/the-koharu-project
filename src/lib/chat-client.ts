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
  token?: string;
};

function publicFooocusBase(): string {
  return (process.env.NEXT_PUBLIC_FOOOCUS_API_URL || "").replace(/\/$/, "");
}

function bridgeAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const secret = process.env.NEXT_PUBLIC_FOOOCUS_BRIDGE_SECRET || "";
  if (secret) headers["x-bridge-secret"] = secret;
  return headers;
}

async function startJobDirect(
  bridgeBody: Record<string, unknown>,
  base: string,
  mode?: string,
): Promise<ImageJobStatus> {
  const res = await fetch(`${base}/v1/jobs`, {
    method: "POST",
    headers: bridgeAuthHeaders(),
    body: JSON.stringify(bridgeBody),
  });
  const data = (await res.json().catch(() => ({}))) as {
    id?: string;
    token?: string;
    status?: string;
    error?: string;
    detail?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || data.detail || `Bridge HTTP ${res.status}`);
  }
  return {
    ok: true,
    id: data.id,
    token: data.token,
    status: data.status || "queued",
    mode,
  };
}

/** Start async Fooocus job (returns quickly). */
export async function startImageJob(
  companionId: string,
  prompt: string,
): Promise<ImageJobStatus> {
  // Try Vercel API first (builds full NSFW prompt)
  const res = await fetch("/api/image/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companionId, prompt }),
  });
  const data = (await res.json().catch(() => ({}))) as ImageJobStatus & {
    error?: string;
    hint?: string;
    bridgeBody?: Record<string, unknown>;
    publicBridgeUrl?: string;
  };

  if (res.ok && data.id) return data;

  // Fallback: browser → home tunnel (Vercel often cannot reach your PC)
  const base = data.publicBridgeUrl || publicFooocusBase();
  if (base && data.bridgeBody) {
    return startJobDirect(data.bridgeBody, base, data.mode);
  }

  // Last resort: prepare payload then direct
  if (base) {
    const prep = await fetch("/api/image/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companionId, prompt, prepareOnly: true }),
    });
    const p = (await prep.json().catch(() => ({}))) as {
      bridgeBody?: Record<string, unknown>;
      mode?: string;
      publicBridgeUrl?: string;
    };
    const b = p.publicBridgeUrl || base;
    if (p.bridgeBody) {
      return startJobDirect(p.bridgeBody, b, p.mode);
    }
  }

  throw new Error(
    data.error ||
      data.hint ||
      `Image job failed (${res.status}). Is Fooocus + bridge running?`,
  );
}

/** Poll until done/error/timeout (default 4 min). */
export async function waitForImageJob(
  jobId: string,
  opts?: { timeoutMs?: number; onTick?: (status: string) => void; token?: string },
): Promise<ImageJobStatus> {
  const timeoutMs = opts?.timeoutMs ?? 240_000;
  const start = Date.now();
  const publicBase = publicFooocusBase();

  while (Date.now() - start < timeoutMs) {
    // Prefer browser → public bridge poll
    if (publicBase && typeof window !== "undefined") {
      try {
        const headers: Record<string, string> = {};
        const secret = process.env.NEXT_PUBLIC_FOOOCUS_BRIDGE_SECRET || "";
        if (secret) headers["x-bridge-secret"] = secret;

        const res = await fetch(
          `${publicBase}/v1/jobs/${encodeURIComponent(jobId)}`,
          { headers, cache: "no-store" },
        );
        const data = (await res.json().catch(() => ({}))) as {
          status?: string;
          error?: string;
          image_url?: string;
          token?: string;
        };
        if (!res.ok) throw new Error(data.error || `Poll failed (${res.status})`);

        opts?.onTick?.(data.status || "running");

        if (data.status === "done") {
          const tok = data.token || opts?.token || "";
          let imageUrl: string | undefined;
          if (data.image_url) {
            imageUrl = data.image_url.startsWith("http")
              ? data.image_url
              : `${publicBase}${data.image_url.startsWith("/") ? "" : "/"}${data.image_url}`;
          } else if (tok) {
            imageUrl = `${publicBase}/v1/jobs/${encodeURIComponent(jobId)}/image?t=${encodeURIComponent(tok)}`;
          }
          if (imageUrl) {
            return { ok: true, status: "done", imageUrl, id: jobId };
          }
        }
        if (data.status === "error") {
          throw new Error(data.error || "Image generation failed");
        }
        await new Promise((r) => setTimeout(r, 2500));
        continue;
      } catch {
        // fall through to server poll
      }
    }

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
