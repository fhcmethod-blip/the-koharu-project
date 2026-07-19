# Agent notes — The Koharu Project

**ONE handoff only:** [`HANDOFF.md`](./HANDOFF.md) (master, detailed — updated 2026-07-18).  
Do not create extra handoff files. Update `HANDOFF.md` when state changes.

**Site gens need:** Fooocus (`run_koharu_lust.bat` → must log Koharu API `:7867`) + bridge (`scripts\ensure-fooocus-bridge.ps1`, bridge-venv only). Health: `koharu_api_ok: true`.

**Also:** `docs/AUTH.md`, `docs/NEON-AND-STRIPE.md`, `docs/VERCEL-FOOOCUS.md`, `docs/MEDIA-CDN-SETUP.md`

## Non-negotiables

- 18+ NSFW only; companions 18–20; never underage content.
- Companions: `companions/json/{id}.json` + `companion-registry.ts`; portraits `public/companions/{id}.jpg` match appearance.
- Deploy: `cmd /c "%LOCALAPPDATA%\hermes\node\vercel.cmd deploy --prod --yes --non-interactive"` (PowerShell blocks `vercel.ps1`).
- Image gen needs home PC: Fooocus `:7865`, bridge `:8888`, media `:8890` + tunnel `fooocus.thekoharuproject.com`.
- Bridge only via `bridge-venv` + matching `FOOOCUS_BRIDGE_SECRET`.
- No Fooocus window spam; no auto-kill Fooocus unless user asks.
- No `?v=` on Next/Image static srcs.
- Consumer UI: product language only (no tunnel/GPU/OpenRouter dumps).
- Internal tiers: `free` / `plus` / `vip` only.

## Snapshot

| System | Notes |
|--------|--------|
| Live | https://thekoharuproject.com |
| Auth | Neon + email/password |
| Stripe | LIVE Touch $15 / Claimed $35 (IDs in HANDOFF.md) |
| Alina | `alina` — 18 Russian petite dyed red hair |
| R2 | Optional later — PC usually on |

## If gen fails

```bat
cd C:\Users\Rob_k\OneDrive\Desktop\kohar
scripts\restart-fooocus-bridge.bat
```

Then hard-refresh site → chat → `show`.
