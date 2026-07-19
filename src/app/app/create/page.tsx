"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BODY_SLIDERS,
  DEFAULT_DRAFT,
  EXAMPLE_PRESETS,
  EYE_COLORS,
  FASHIONS,
  HAIR_COLORS,
  HAIR_LENGTHS,
  SKIN_TONES,
  VIBES,
  buildAppearanceFromDraft,
  buildLookTagsFromDraft,
  buildProfilePrompt,
  deleteCustomCompanion,
  loadCustomCompanions,
  saveCustomCompanion,
  sliderLabel,
  type CreatorDraft,
  type SavedCustomCompanion,
} from "@/lib/companion-creator";
import { startImageJob, waitForImageJob } from "@/lib/chat-client";

function SliderRow({
  label,
  value,
  min,
  max,
  steps,
  example,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  steps: string[];
  example: string;
  onChange: (n: number) => void;
}) {
  const stepText =
    min >= 18
      ? String(value)
      : steps[Math.min(steps.length, Math.max(1, value)) - 1] || String(value);

  return (
    <div className="rounded-2xl border border-card-border bg-black/25 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <span className="badge bg-accent/25 text-accent-soft">{stepText}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 w-full accent-[var(--accent)]"
      />
      <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wide text-muted/80">
        <span>{steps[0]}</span>
        <span>{steps[steps.length - 1]}</span>
      </div>
      <p className="prose-muted mt-1.5 text-xs">{example}</p>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
      <select
        className="input-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

type GenPhase = "idle" | "queued" | "running" | "done" | "error";

export default function CompanionCreatorPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<CreatorDraft>(DEFAULT_DRAFT);
  const [saved, setSaved] = useState<SavedCustomCompanion[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [activeExample, setActiveExample] = useState<string | null>(null);
  const [portraitUrl, setPortraitUrl] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [genPhase, setGenPhase] = useState<GenPhase>("idle");
  const [genStatus, setGenStatus] = useState<string | null>(null);
  const genAbort = useRef(0);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSaved(loadCustomCompanions());
  }, []);

  const appearance = useMemo(() => buildAppearanceFromDraft(draft), [draft]);
  const look = useMemo(() => buildLookTagsFromDraft(draft), [draft]);
  const profilePrompt = useMemo(() => buildProfilePrompt(draft), [draft]);
  /** Chat NSFW gens: lust women / pony men. Portraits use realistic for cleaner face shots. */
  const chatImageMode = draft.gender === "male" ? "pony" : "lust";
  const portraitMode = draft.gender === "male" ? "pony" : "realistic";
  const generating = genPhase === "queued" || genPhase === "running";

  const setBody = useCallback((key: keyof CreatorDraft["body"], n: number) => {
    setDraft((d) => ({ ...d, body: { ...d.body, [key]: n } }));
    setActiveExample(null);
  }, []);

  const setStyle = useCallback((key: keyof CreatorDraft["style"], v: string) => {
    setDraft((d) => ({ ...d, style: { ...d.style, [key]: v } }));
    setActiveExample(null);
  }, []);

  const applyExample = (id: string) => {
    const ex = EXAMPLE_PRESETS.find((p) => p.id === id);
    if (!ex) return;
    setDraft({
      name: ex.draft.name,
      gender: ex.draft.gender,
      tagline: ex.draft.tagline,
      body: { ...ex.draft.body },
      style: { ...ex.draft.style },
      personality: [...ex.draft.personality],
    });
    setActiveExample(id);
    setPortraitUrl(null);
    setSavedId(null);
    setNote(`Loaded example: ${ex.name}`);
  };

  const onSave = (opts?: { avatarUrl?: string | null; thenChat?: boolean }) => {
    if (!draft.name.trim()) {
      setNote("Give your companion a name first.");
      return null;
    }
    const avatar = opts?.avatarUrl !== undefined ? opts.avatarUrl : portraitUrl;
    const entry = saveCustomCompanion(draft, {
      id: savedId || undefined,
      avatarUrl: avatar || undefined,
      imageMode: chatImageMode,
    });
    setSavedId(entry.id);
    setSaved(loadCustomCompanions());
    setNote(`Saved “${entry.draft.name}”. Ready to chat.`);
    if (opts?.thenChat) {
      router.push(`/app/chat/${entry.id}`);
    }
    return entry;
  };

  const onChat = () => {
    const entry = onSave({ thenChat: false });
    if (!entry) return;
    router.push(`/app/chat/${entry.id}`);
  };

  const onDelete = (id: string) => {
    deleteCustomCompanion(id);
    setSaved(loadCustomCompanions());
    if (savedId === id) setSavedId(null);
    setNote("Removed from your saved companions.");
  };

  const generatePortrait = async () => {
    if (generating) return;
    const ticket = ++genAbort.current;
    setGenPhase("queued");
    setGenStatus("Starting portrait…");
    setNote(null);

    // Scroll preview into view on phone
    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });

    try {
      const companionId = savedId || `custom-draft-${Date.now().toString(36)}`;
      const job = await startImageJob(companionId, "creator portrait profile", {
        look,
        appearance,
        gender: draft.gender,
        profilePrompt,
        companionName: draft.name.trim() || "Custom",
        mode: portraitMode,
      });
      if (ticket !== genAbort.current) return;
      if (!job.id) throw new Error("unavailable");

      setGenPhase("running");
      setGenStatus("Creating your portrait…");

      const done = await waitForImageJob(job.id, {
        timeoutMs: 240_000,
        token: job.token,
        onTick: () => {
          if (ticket !== genAbort.current) return;
          setGenStatus("Creating your portrait…");
        },
      });
      if (ticket !== genAbort.current) return;

      if (!done.imageUrl) throw new Error("unavailable");
      setPortraitUrl(done.imageUrl);
      setGenPhase("done");
      setGenStatus(null);
      setNote("Portrait ready. Save them, then start chatting.");

      // Auto-save avatar if already named
      if (draft.name.trim()) {
        const entry = saveCustomCompanion(draft, {
          id: savedId || undefined,
          avatarUrl: done.imageUrl,
          imageMode: chatImageMode,
        });
        setSavedId(entry.id);
        setSaved(loadCustomCompanions());
      }
    } catch {
      if (ticket !== genAbort.current) return;
      setGenPhase("error");
      setGenStatus(null);
      setNote(
        "Portrait isn’t available right now. Try again in a moment — or save and chat first.",
      );
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pb-10 sm:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Companion Creator
          </h1>
          <p className="prose-muted mt-2 max-w-2xl text-sm">
            Design your own 18+ companion — body, look, and vibe — then generate
            their portrait and start chatting.
          </p>
        </div>
        <Link href="/app/characters" className="btn-secondary text-sm">
          ← Companions
        </Link>
      </div>

      {note && (
        <p className="mt-4 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent-soft">
          {note}
        </p>
      )}

      {/* Examples — horizontal scroll on mobile */}
      <section className="mt-6 sm:mt-8">
        <h2 className="text-lg font-semibold">Examples</h2>
        <p className="prose-muted mt-1 text-xs">
          Tap a card to load body + style — then fine-tune.
        </p>
        <div className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-thin sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3 xl:grid-cols-4">
          {EXAMPLE_PRESETS.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => applyExample(ex.id)}
              className={`min-w-[10.5rem] shrink-0 rounded-2xl border p-4 text-left transition sm:min-w-0 ${
                activeExample === ex.id
                  ? "border-accent bg-accent/15 shadow-lg shadow-accent/10"
                  : "border-card-border bg-card/60 hover:border-accent/40"
              }`}
            >
              <div className="text-sm font-semibold text-foreground">
                {ex.name}
              </div>
              <p className="prose-muted mt-1 text-xs">{ex.blurb}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                <span className="badge bg-white/10">
                  {ex.draft.gender === "male" ? "Man" : "Woman"}
                </span>
                <span className="badge bg-white/10">
                  {sliderLabel("height", ex.draft.body.height)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:mt-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
        {/* Left: identity + sliders */}
        <div className="space-y-5 sm:space-y-6">
          <section className="rounded-3xl border border-card-border bg-card/70 p-4 sm:p-6">
            <h2 className="text-lg font-semibold">Identity</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
                  Name
                </span>
                <input
                  className="input-field"
                  placeholder="e.g. Nova, or invent one"
                  value={draft.name}
                  onChange={(e) => {
                    setDraft((d) => ({ ...d, name: e.target.value }));
                    setActiveExample(null);
                  }}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
                  Tagline
                </span>
                <input
                  className="input-field"
                  placeholder="Short vibe line"
                  value={draft.tagline}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, tagline: e.target.value }))
                  }
                />
              </label>
              <div className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
                  Gender
                </span>
                <div className="flex gap-2">
                  {(["female", "male"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setDraft((d) => ({ ...d, gender: g }));
                        setActiveExample(null);
                      }}
                      className={`min-h-11 flex-1 rounded-xl px-3 py-2.5 text-sm font-medium ${
                        draft.gender === g
                          ? "bg-accent text-white"
                          : "border border-card-border text-muted hover:text-foreground"
                      }`}
                    >
                      {g === "female" ? "Woman" : "Man"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-card-border bg-card/70 p-4 sm:p-6">
            <h2 className="text-lg font-semibold">Body sliders</h2>
            <p className="prose-muted mt-1 text-xs">
              Adults only (18–20). Labels under each slider.
            </p>
            <div className="mt-4 space-y-3">
              {BODY_SLIDERS.map((s) => (
                <SliderRow
                  key={s.key}
                  label={
                    s.key === "chest"
                      ? draft.gender === "male"
                        ? "Chest"
                        : "Bust"
                      : s.label
                  }
                  value={draft.body[s.key]}
                  min={s.min}
                  max={s.max}
                  steps={s.steps}
                  example={s.example}
                  onChange={(n) => setBody(s.key, n)}
                />
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-card-border bg-card/70 p-4 sm:p-6">
            <h2 className="text-lg font-semibold">Look & style</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Hair length / style"
                value={draft.style.hairLength}
                options={HAIR_LENGTHS}
                onChange={(v) => setStyle("hairLength", v)}
              />
              <SelectField
                label="Hair color"
                value={draft.style.hairColor}
                options={HAIR_COLORS}
                onChange={(v) => setStyle("hairColor", v)}
              />
              <SelectField
                label="Eye color"
                value={draft.style.eyeColor}
                options={EYE_COLORS}
                onChange={(v) => setStyle("eyeColor", v)}
              />
              <SelectField
                label="Skin tone"
                value={draft.style.skinTone}
                options={SKIN_TONES}
                onChange={(v) => setStyle("skinTone", v)}
              />
              <SelectField
                label="Fashion"
                value={draft.style.fashion}
                options={FASHIONS}
                onChange={(v) => setStyle("fashion", v)}
              />
              <SelectField
                label="Vibe"
                value={draft.style.vibe}
                options={VIBES}
                onChange={(v) => setStyle("vibe", v)}
              />
            </div>
          </section>
        </div>

        {/* Right: portrait + preview + actions */}
        <div
          ref={previewRef}
          className="space-y-5 sm:space-y-6 lg:sticky lg:top-6 lg:self-start"
        >
          <section className="rounded-3xl border border-card-border bg-card/80 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Portrait</h2>
              <span className="badge bg-white/10 text-[10px]">AI portrait</span>
            </div>

            <div className="relative mt-3 aspect-[3/4] w-full overflow-hidden rounded-2xl border border-card-border bg-black/40">
              {portraitUrl ? (
                // Remote portrait URLs — skip Next Image domain allowlist
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={portraitUrl}
                  alt={draft.name || "Portrait"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                  <div className="text-4xl opacity-40">✦</div>
                  <p className="text-sm text-muted">
                    Generate a portrait from your design
                  </p>
                  <p className="text-[11px] text-muted/70">
                    Matches the body, hair, and vibe you chose
                  </p>
                </div>
              )}
              {generating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 p-4 text-center backdrop-blur-sm">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  <p className="mt-3 text-sm text-accent-soft">
                    {genStatus || "Working…"}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="badge bg-white/10">
                {draft.gender === "male" ? "Man" : "Woman"}
              </span>
              <span className="badge bg-white/10">
                Age {Math.min(20, Math.max(18, draft.body.age))}
              </span>
              <span className="badge bg-accent/25 text-accent-soft">
                {sliderLabel("height", draft.body.height)}
              </span>
              <span className="badge bg-white/10">
                {sliderLabel("build", draft.body.build)}
              </span>
              <span className="badge bg-white/10">
                {sliderLabel("chest", draft.body.chest)}{" "}
                {draft.gender === "male" ? "chest" : "bust"}
              </span>
            </div>

            <button
              type="button"
              className="btn-primary mt-4 w-full min-h-12"
              disabled={generating}
              onClick={generatePortrait}
            >
              {generating ? "Creating portrait…" : "Generate portrait"}
            </button>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="btn-secondary min-h-11 text-sm"
                onClick={() => onSave()}
              >
                Save
              </button>
              <button
                type="button"
                className="btn-secondary min-h-11 text-sm"
                onClick={onChat}
              >
                Save & chat
              </button>
            </div>

            <p className="prose-muted mt-3 text-center text-[11px]">
              Portraits usually take a minute. You can save and chat anytime.
            </p>
          </section>

          {saved.length > 0 && (
            <section className="rounded-3xl border border-card-border bg-card/70 p-4 sm:p-5">
              <h2 className="text-lg font-semibold">Your creations</h2>
              <ul className="mt-3 space-y-2">
                {saved.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-card-border bg-black/20 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {c.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.avatarUrl}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs text-muted">
                          ?
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {c.draft.name || "Unnamed"}
                        </div>
                        <div className="truncate text-[11px] text-muted">
                          {c.draft.gender} · age {c.draft.body.age} ·{" "}
                          {sliderLabel("height", c.draft.body.height)}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Link
                        href={`/app/chat/${c.id}`}
                        className="rounded-lg border border-accent/40 bg-accent/15 px-2 py-1 text-xs text-accent-soft"
                      >
                        Chat
                      </Link>
                      <button
                        type="button"
                        className="rounded-lg border border-card-border px-2 py-1 text-xs hover:border-accent/40"
                        onClick={() => {
                          setDraft({
                            ...c.draft,
                            body: { ...c.draft.body },
                            style: { ...c.draft.style },
                            personality: [...c.draft.personality],
                          });
                          setPortraitUrl(c.avatarUrl || null);
                          setSavedId(c.id);
                          setNote(`Loaded ${c.draft.name}`);
                        }}
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-card-border px-2 py-1 text-xs text-muted hover:text-red-300"
                        onClick={() => onDelete(c.id)}
                      >
                        Del
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {/* Mobile sticky action bar */}
      <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 border-t border-card-border bg-background/95 px-3 py-2 backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-lg gap-2">
          <button
            type="button"
            className="btn-primary min-h-11 flex-1 text-sm"
            disabled={generating}
            onClick={generatePortrait}
          >
            {generating ? "…" : "Portrait"}
          </button>
          <button
            type="button"
            className="btn-secondary min-h-11 flex-1 text-sm"
            onClick={onChat}
          >
            Chat
          </button>
        </div>
      </div>
    </div>
  );
}
