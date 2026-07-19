# Companion JSON configs

Each companion has **one full JSON file**: `{id}.json`

## Fields

| Section | Purpose |
|--------|---------|
| Profile (`name`, `age`, `bio`, …) | UI + chat personality |
| `generation` | Fooocus image parameters for **this** companion only |

## `generation` knobs

| Key | Meaning |
|-----|---------|
| `mode` | `realistic` (default), `pony`, or `lust` |
| `model` | Checkpoint filename on the Fooocus PC |
| `styles` | Fooocus style list |
| `performance` | `Speed` / `Quality` / etc. |
| `cfg` | Guidance scale |
| `sharpness` | Fooocus sharpness |
| `aspect` | e.g. `896*1152` |
| `seed` | Fixed seed (`-1` = random) |
| `look` | Always-on visual fingerprint tags |
| `promptPrefix` / `promptSuffix` | Wrapped around every gen |
| `negative` | Negative prompt |
| `profilePrompt` | Used for portrait/profile gens |
| `defaultScene` | Used when user just says “show me” |

## Edit & deploy

1. Edit `companions/json/mira.json` (etc.)
2. Redeploy the Next app (Vercel) so chat/UI pick up profile text
3. Image gens read the same JSON on the next request

Roster is loaded in `src/lib/companion-registry.ts`.
