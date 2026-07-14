"use client";

import { useEffect } from "react";

export type LightboxItem = {
  id: string;
  name: string;
  url: string;
  mediaType: "image" | "video";
};

export function VaultLightbox({
  items,
  index,
  onClose,
  onChange,
}: {
  items: LightboxItem[];
  index: number;
  onClose: () => void;
  onChange: (i: number) => void;
}) {
  const item = items[index];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index < items.length - 1) onChange(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onChange(index - 1);
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [index, items.length, onChange, onClose]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/92 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <p className="truncate text-sm text-white/90">
          {item.name}{" "}
          <span className="text-white/40">
            · {index + 1}/{items.length}
          </span>
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/20 px-3 py-1 text-sm text-white hover:bg-white/10"
        >
          Close
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center p-4">
        {index > 0 && (
          <button
            type="button"
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-white hover:bg-white/20 sm:left-4"
            onClick={() => onChange(index - 1)}
            aria-label="Previous"
          >
            ‹
          </button>
        )}
        {index < items.length - 1 && (
          <button
            type="button"
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-white hover:bg-white/20 sm:right-4"
            onClick={() => onChange(index + 1)}
            aria-label="Next"
          >
            ›
          </button>
        )}

        {item.mediaType === "video" ? (
          <video
            key={item.id}
            src={item.url}
            controls
            autoPlay
            playsInline
            className="max-h-[80vh] max-w-full rounded-xl bg-black"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={item.id}
            src={item.url}
            alt={item.name}
            className="max-h-[80vh] max-w-full rounded-xl object-contain"
          />
        )}
      </div>
    </div>
  );
}
