"use client";

import { useCallback, useState } from "react";

/**
 * Web video player that detects "audio only" cases
 * (e.g. HEVC/H.265 or 8K files Chrome can't paint).
 */
export function VaultVideo({
  src,
  title,
  className = "",
  autoPlay = false,
  poster,
}: {
  src: string;
  title?: string;
  className?: string;
  autoPlay?: boolean;
  poster?: string;
}) {
  const [hint, setHint] = useState<string | null>(null);

  const checkTracks = useCallback(
    (el: HTMLVideoElement | null) => {
      if (!el) return;
      // After metadata: no dimensions = browser can't decode video track
      if (el.videoWidth === 0 && el.duration > 0 && !el.paused) {
        setHint(
          "This browser can only play the audio track. Re-export the file as H.264 MP4 (1080p) for picture + sound on all devices.",
        );
      } else if (el.videoWidth > 0) {
        setHint(null);
      }
    },
    [],
  );

  return (
    <div className="relative w-full">
      <video
        src={src}
        controls
        playsInline
        preload="metadata"
        autoPlay={autoPlay}
        poster={poster}
        title={title}
        className={`w-full bg-black ${className}`}
        onLoadedMetadata={(e) => {
          const el = e.currentTarget;
          if (el.videoWidth === 0 && el.duration > 0) {
            setHint(
              "Video track not supported here (often iPhone HEVC/H.265 or 8K). Audio may still play. Convert to H.264 1080p MP4 for full video.",
            );
          }
        }}
        onPlay={(e) => checkTracks(e.currentTarget)}
        onTimeUpdate={(e) => {
          // Catch late decoder failure
          const el = e.currentTarget;
          if (
            el.currentTime > 0.5 &&
            el.videoWidth === 0 &&
            !el.paused
          ) {
            setHint(
              "Picture not showing — codec issue. Convert with: scripts\\convert-video-for-web.bat",
            );
          }
        }}
        onError={() =>
          setHint(
            "Could not play this file. Use MP4 with H.264 video + AAC audio.",
          )
        }
      />
      {hint && (
        <div className="mt-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          <p className="font-medium">Playback issue</p>
          <p className="mt-1 opacity-90">{hint}</p>
          <p className="mt-2 opacity-80">
            Try another device or open the file again. If it keeps failing,
            re-upload as a standard phone-friendly MP4.
          </p>
        </div>
      )}
    </div>
  );
}
