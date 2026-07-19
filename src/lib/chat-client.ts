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

/** Filled from prepareOnly response when NEXT_PUBLIC secret missing from bundle. */
let runtimeBridgeSecret = "";
let runtimeBridgeBase = "";

function publicFooocusBase(): string {
  return (
    runtimeBridgeBase ||
    process.env.NEXT_PUBLIC_FOOOCUS_API_URL ||
    ""
  ).replace(/\/$/, "");
}

function bridgeSecret(): string {
  return (
    runtimeBridgeSecret ||
    process.env.NEXT_PUBLIC_FOOOCUS_BRIDGE_SECRET ||
    ""
  );
}

/** Secret in query string — avoids custom-header CORS preflight issues on mobile Safari. */
function withSecret(url: string, secretOverride?: string): string {
  const secret = secretOverride || bridgeSecret();
  if (!secret) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}secret=${encodeURIComponent(secret)}`;
}

async function startJobDirect(
  bridgeBody: Record<string, unknown>,
  base: string,
  mode?: string,
  secret?: string,
): Promise<ImageJobStatus> {
  const url = withSecret(`${base}/v1/jobs`, secret);
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

/** Overrides for custom companions / Creator (not on disk roster). */
export type StartImageJobOpts = {
  look?: string;
  appearance?: string;
  gender?: "female" | "male";
  profilePrompt?: string;
  companionName?: string;
  mode?: "lust" | "pony" | "realistic";
  defaultScene?: string;
};

/**
 * Mobile-first image jobs:
 * 1) Get full prompt + bridge secret from same-origin prepareOnly
 * 2) Browser → public tunnel with secret in query
 * 3) Fall back to server job start if direct fails
 */
export async function startImageJob(
  companionId: string,
  prompt: string,
  overrides?: StartImageJobOpts,
): Promise<ImageJobStatus> {
  const publicBase = publicFooocusBase();
  const payload = {
    companionId,
    prompt,
    ...(overrides || {}),
  };

  const prepRes = await fetch("/api/image/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, prepareOnly: true }),
  });
  const prep = (await prepRes.json().catch(() => ({}))) as {
    bridgeBody?: Record<string, unknown>;
    mode?: string;
    publicBridgeUrl?: string;
    bridgeSecret?: string;
    error?: string;
  };

  if (prep.bridgeSecret) runtimeBridgeSecret = prep.bridgeSecret;
  if (prep.publicBridgeUrl) {
    runtimeBridgeBase = prep.publicBridgeUrl.replace(/\/$/, "");
  }

  const base = (prep.publicBridgeUrl || publicBase || "").replace(/\/$/, "");
  const bridgeBody = prep.bridgeBody;
  const secret = prep.bridgeSecret || bridgeSecret();

  if (base && bridgeBody && typeof window !== "undefined") {
    // One automatic retry — bridge may have just been restarted by watchdog
    let lastDirect: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 1500));
        }
        return await startJobDirect(bridgeBody, base, prep.mode, secret);
      } catch (directErr) {
        lastDirect = directErr;
        console.warn(
          `Direct bridge job failed (attempt ${attempt + 1}):`,
          directErr,
        );
      }
    }
    console.warn("Direct bridge job failed, trying server:", lastDirect);
  }

  const res = await fetch("/api/image/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as ImageJobStatus & {
    error?: string;
    hint?: string;
    bridgeBody?: Record<string, unknown>;
    publicBridgeUrl?: string;
    bridgeSecret?: string;
  };

  if (data.bridgeSecret) runtimeBridgeSecret = data.bridgeSecret;
  if (data.publicBridgeUrl) {
    runtimeBridgeBase = data.publicBridgeUrl.replace(/\/$/, "");
  }

  if (res.ok && data.id) return data;

  const fallbackBase = (data.publicBridgeUrl || base || "").replace(/\/$/, "");
  const fallbackSecret = data.bridgeSecret || secret;
  if (fallbackBase && (data.bridgeBody || bridgeBody)) {
    return startJobDirect(
      data.bridgeBody || bridgeBody!,
      fallbackBase,
      data.mode || prep.mode,
      fallbackSecret,
    );
  }

  throw new Error(
    data.error ||
      prep.error ||
      "Photo generation is temporarily unavailable. Please try again in a moment.",
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
          media_url?: string;
          token?: string;
        };
        if (!res.ok) throw new Error(data.error || `Poll failed (${res.status})`);

        opts?.onTick?.(data.status || "running");

        if (data.status === "done") {
          const tok = data.token || opts?.token || "";
          let imageUrl: string | undefined;
          // Prefer permanent media-cdn URL (file already on PC library)
          if (data.media_url && /^https?:\/\//i.test(data.media_url)) {
            imageUrl = data.media_url;
          } else if (data.image_url) {
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
  throw new Error("Photo is taking too long — try again.");
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
