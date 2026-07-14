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

function bridgeSecret(): string {
  return process.env.NEXT_PUBLIC_FOOOCUS_BRIDGE_SECRET || "";
}

/** Secret in query string — avoids custom-header CORS preflight issues on mobile Safari. */
function withSecret(url: string): string {
  const secret = bridgeSecret();
  if (!secret) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}secret=${encodeURIComponent(secret)}`;
}

async function startJobDirect(
  bridgeBody: Record<string, unknown>,
  base: string,
  mode?: string,
): Promise<ImageJobStatus> {
  const url = withSecret(`${base}/v1/jobs`);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bridgeBody),
    mode: "cors",
    credentials: "omit",
    cache: "no-store",
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

/**
 * Mobile-first image jobs:
 * 1) Get full prompt from same-origin (prepareOnly — works even if Vercel→PC is blocked)
 * 2) Browser → public tunnel with secret in query (phones work; custom headers often fail)
 * 3) Fall back to full server job start if direct fails
 */
export async function startImageJob(
  companionId: string,
  prompt: string,
): Promise<ImageJobStatus> {
  const publicBase = publicFooocusBase();

  // Always get the built NSFW prompt from our API (same-origin — works on phones)
  const prepRes = await fetch("/api/image/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companionId, prompt, prepareOnly: true }),
  });
  const prep = (await prepRes.json().catch(() => ({}))) as {
    bridgeBody?: Record<string, unknown>;
    mode?: string;
    publicBridgeUrl?: string;
    error?: string;
  };

  const base = (prep.publicBridgeUrl || publicBase || "").replace(/\/$/, "");
  const bridgeBody = prep.bridgeBody;

  // Prefer browser → tunnel (PC and phone both use this when PC GPU is on)
  if (base && bridgeBody && typeof window !== "undefined") {
    try {
      return await startJobDirect(bridgeBody, base, prep.mode);
    } catch (directErr) {
      console.warn("Direct bridge job failed, trying server:", directErr);
    }
  }

  // Server path (Vercel → home) — works if tunnel allows datacenter IPs
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

  // Last try: server returned bridgeBody on 502
  const fallbackBase = (data.publicBridgeUrl || base || "").replace(/\/$/, "");
  if (fallbackBase && (data.bridgeBody || bridgeBody)) {
    return startJobDirect(
      data.bridgeBody || bridgeBody!,
      fallbackBase,
      data.mode || prep.mode,
    );
  }

  throw new Error(
    data.error ||
      prep.error ||
      data.hint ||
      `Image job failed (${res.status}). On phone: keep PC awake with Fooocus + bridge.`,
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
    // Prefer browser → public bridge (query secret — mobile-safe, no custom headers)
    if (publicBase && typeof window !== "undefined") {
      try {
        const pollUrl = withSecret(
          `${publicBase}/v1/jobs/${encodeURIComponent(jobId)}`,
        );
        const res = await fetch(pollUrl, {
          mode: "cors",
          credentials: "omit",
          cache: "no-store",
        });
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
            // Keep external URL (small). Avoid data: URLs — they break mobile localStorage.
            return { ok: true, status: "done", imageUrl, id: jobId };
          }
        }
        if (data.status === "error") {
          throw new Error(data.error || "Image generation failed");
        }
        await new Promise((r) => setTimeout(r, 2500));
        continue;
      } catch {
        // fall through to same-origin server poll
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
  // Don't send huge data-URL images back to the server from phones
  let preloaded = opts?.preloadedImageUrl;
  if (preloaded && preloaded.startsWith("data:") && preloaded.length > 50_000) {
    preloaded = undefined;
  }

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      character,
      history: history.map((m) => ({
        ...m,
        // strip huge data URLs from history on mobile payloads
        imageUrl:
          m.imageUrl && m.imageUrl.startsWith("data:") && m.imageUrl.length > 8000
            ? undefined
            : m.imageUrl,
      })),
      userText,
      skipImage: opts?.skipImage ?? false,
      preloadedImageUrl: preloaded,
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
