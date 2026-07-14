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
  const [source, setSource] = useState<string | null>(null);
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
    setSource(null);
    setImageNote(null);
    setStatusLine(null);
  }, [character.id, character.greeting]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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
      let imageSourceNote: string | undefined;

      // Async image path: avoids Cloudflare/Vercel killing long requests
      if (wantsImage(content) && wantsGenerated(content)) {
        setStatusLine(`${character.name} is generating a pic… (1–2 min)`);
        try {
          const job = await startImageJob(character.id, content);
          if (!job.id) throw new Error("No job id from server");
          const done = await waitForImageJob(job.id, {
            timeoutMs: 240_000,
            onTick: (s) =>
              setStatusLine(
                `${character.name} is generating a pic… (${s || "working"})`,
              ),
          });
          preloadedImageUrl = done.imageUrl;
          imageSourceNote = job.mode
            ? `fooocus:${job.mode}`
            : "fooocus";
          setStatusLine(`${character.name} is typing…`);
        } catch (imgErr) {
          const msg =
            imgErr instanceof Error ? imgErr.message : "Image gen failed";
          setImageNote(`No image — ${msg}`);
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
      if (reply.source) setSource(reply.source);

      const finalImg = assistantMsg.imageUrl;
      if (finalImg) {
        const src = reply.imageSource || imageSourceNote || "";
        setImageNote(
          src.startsWith("fooocus") || src === "generated"
            ? `Image: Fooocus${src.includes(":") ? ` (${src.split(":")[1]})` : ""}`
            : src === "library"
              ? "Image: library"
              : "Image attached",
        );
      } else if (reply.imageError) {
        setImageNote(`No image — ${reply.imageError}`);
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
    setSource(null);
    setImageNote(null);
    setStatusLine(null);
  }

  const sourceLabel =
    source === "openrouter"
      ? "Live AI (OpenRouter)"
      : source === "xai"
        ? "Live AI (xAI)"
        : source === "local"
          ? "Local LLM"
          : source === "mock"
            ? "Demo AI (rules on)"
            : null;

  return (
    <div className="flex h-[calc(100vh-0px)] min-h-[520px] flex-col md:h-screen">
      <div className="flex items-center justify-between border-b border-card-border px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${character.gradient} text-lg font-semibold`}
          >
            {character.name[0]}
          </div>
          <div>
            <h1 className="font-semibold leading-tight">{character.name}</h1>
            <p className="text-xs text-muted">{character.tagline}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={reset}
          className="text-xs text-muted hover:text-foreground"
        >
          Reset chat
        </button>
      </div>

      <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-6">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[min(100%,28rem)] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "rounded-br-md bg-accent text-white"
                  : "rounded-bl-md border border-card-border bg-card"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.imageUrl}
                  alt="Tease"
                  className="mt-3 max-h-72 w-full rounded-xl object-cover"
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

      <div className="border-t border-card-border p-4 sm:px-6">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <input
            className="input-field"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${character.name}… (try “show”)`}
            disabled={busy}
            autoComplete="off"
          />
          <button
            type="submit"
            className="btn-primary shrink-0 !px-5"
            disabled={busy || !input.trim()}
          >
            Send
          </button>
        </form>
        <p className="prose-muted mt-2 text-center text-[11px]">
          {error ? (
            <span className="text-accent-soft">{error}</span>
          ) : (
            <>
              {sourceLabel ? `${sourceLabel} · rules on` : "18+ companion chat"}
              {imageNote ? ` · ${imageNote}` : ""}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
