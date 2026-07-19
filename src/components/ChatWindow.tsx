"use client";

import { useEffect, useRef, useState } from "react";
import type { Character, ChatMessage } from "@/lib/types";
import {
  generateReply,
  startImageJob,
  waitForImageJob,
  wantsImage,
  wantsGenerated,
} from "@/lib/chat-client";
import { clearChat, loadChat, saveChat } from "@/lib/chat-store";

export function ChatWindow({ character }: { character: Character }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageNote, setImageNote] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = loadChat(character.id);
    if (stored.length) {
      setMessages(stored);
    } else {
      const intro: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: character.greeting,
        createdAt: new Date().toISOString(),
      };
      setMessages([intro]);
      saveChat(character.id, [intro]);
    }
    setError(null);
    setImageNote(null);
    setStatusLine(null);
  }, [character.id, character.greeting]);

  // Only pin to bottom on new messages / typing — don't fight user scroll
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickToBottom.current = dist < 80;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!stickToBottom.current) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy, statusLine]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);
    setStatusLine(null);
    saveChat(character.id, next);

    try {
      let preloadedImageUrl: string | undefined;

      // Async image path: long jobs poll outside the chat request
      if (wantsImage(content) && wantsGenerated(content)) {
        setStatusLine(`${character.name} is sending a pic…`);
        try {
          const job = await startImageJob(character.id, content, {
            look: character.look,
            appearance: character.appearance,
            gender: character.gender,
            profilePrompt: character.profilePrompt,
            companionName: character.name,
            mode: character.imageMode,
          });
          if (!job.id) throw new Error("unavailable");
          const done = await waitForImageJob(job.id, {
            timeoutMs: 240_000,
            token: job.token,
            onTick: () =>
              setStatusLine(`${character.name} is sending a pic…`),
          });
          preloadedImageUrl = done.imageUrl;
          setStatusLine(`${character.name} is typing…`);
        } catch (imgErr) {
          const raw =
            imgErr instanceof Error ? imgErr.message : "Photo unavailable";
          // Keep product-safe but slightly more helpful
          const soft =
            /unauth|401|secret/i.test(raw)
              ? "Photo service auth failed — gen stack may need a restart."
              : /timeout|timed out/i.test(raw)
                ? "Photo took too long — try again."
                : /502|unreachable|fetch|network|Failed to fetch/i.test(raw)
                  ? "Photo service offline — PC gen stack may be down."
                  : "Photo unavailable right now — try again in a moment.";
          setImageNote(soft);
          console.warn("image gen failed:", raw);
          setStatusLine(`${character.name} is typing…`);
        }
      } else {
        setStatusLine(`${character.name} is typing…`);
      }

      const reply = await generateReply(character, next, content, {
        skipImage: true,
        preloadedImageUrl,
      });

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: reply.content,
        imageUrl: reply.imageUrl || preloadedImageUrl,
        createdAt: new Date().toISOString(),
      };
      const withReply = [...next, assistantMsg];
      setMessages(withReply);
      saveChat(character.id, withReply);

      const finalImg = assistantMsg.imageUrl;
      if (finalImg) {
        setImageNote("Photo ready");
      } else if (reply.imageError) {
        setImageNote(
          "Photo unavailable right now — try again in a moment.",
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Chat failed";
      setError(msg);
      const failMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "I lost the connection for a second… if you asked for a pic, try “show” again — generation can take a couple minutes.",
        createdAt: new Date().toISOString(),
      };
      const withFail = [...next, failMsg];
      setMessages(withFail);
      saveChat(character.id, withFail);
    } finally {
      setBusy(false);
      setStatusLine(null);
    }
  }

  function reset() {
    clearChat(character.id);
    const intro: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: character.greeting,
      createdAt: new Date().toISOString(),
    };
    setMessages([intro]);
    saveChat(character.id, [intro]);
    setError(null);
    setImageNote(null);
    setStatusLine(null);
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-card-border px-3 py-2.5 sm:px-6 sm:py-3">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black/30 sm:h-11 sm:w-11">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={character.avatarUrl || `/companions/${character.id}.jpg`}
              alt=""
              className="h-full w-full object-cover object-top"
            />
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-semibold leading-tight">
              {character.name}
            </h1>
            <p className="truncate text-xs text-muted">{character.tagline}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={reset}
          className="min-h-11 shrink-0 px-2 text-xs text-muted hover:text-foreground"
        >
          Reset
        </button>
      </div>

      <div
        ref={listRef}
        className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden overscroll-y-contain px-3 py-4 sm:space-y-4 sm:px-6 sm:py-6"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[min(100%,22rem)] rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed sm:max-w-[min(100%,28rem)] sm:px-4 sm:py-3 sm:text-sm ${
                m.role === "user"
                  ? "rounded-br-md bg-accent text-white"
                  : "rounded-bl-md border border-card-border bg-card"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
              {m.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.imageUrl}
                  alt="Generated"
                  loading="eager"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="mt-3 h-auto max-h-[55dvh] w-full rounded-xl bg-black/30 object-contain sm:max-h-[70vh]"
                  onError={(e) => {
                    const el = e.currentTarget;
                    el.style.display = "none";
                  }}
                />
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-card-border bg-card px-4 py-3 text-sm text-muted">
              {statusLine || `${character.name} is typing…`}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="safe-bottom shrink-0 border-t border-card-border bg-background/95 p-3 backdrop-blur-md sm:px-6 sm:py-4">
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <input
            className="input-field min-h-11"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${character.name}…`}
            disabled={busy}
            autoComplete="off"
            enterKeyHint="send"
            inputMode="text"
          />
          <button
            type="submit"
            className="btn-primary min-h-11 shrink-0 !px-5"
            disabled={busy || !input.trim()}
          >
            Send
          </button>
        </form>
        <p className="prose-muted mt-2 text-center text-[11px] leading-snug">
          {error ? (
            <span className="text-accent-soft">
              Connection hiccup — try again.
            </span>
          ) : (
            <>
              18+ private chat
              {imageNote ? ` · ${imageNote}` : ""}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
