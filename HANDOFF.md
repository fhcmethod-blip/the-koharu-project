# The Koharu Project — Master Handoff

**Single source of truth for the next agent (Hermes / Grok / Claude).**  
**Updated:** 2026-07-18 (late — current session)  
**Use this file only.** Desktop pointer: `C:\Users\Rob_k\OneDrive\Desktop\Koharu-HANDOFF.md` → this file.

| | |
|--|--|
| **Project** | `C:\Users\Rob_k\OneDrive\Desktop\kohar` |
| **Live** | https://thekoharuproject.com |
| **Owner machine** | Windows PC (almost always on) |
| **Deploy host** | Vercel project `the-koharu-project` |
| **Tunnel** | `fooocus.thekoharuproject.com` → home PC (bridge + media) |

Also useful (not handoffs): `AGENTS.md`, `docs/AUTH.md`, `docs/NEON-AND-STRIPE.md`, `docs/VERCEL-FOOOCUS.md`, `docs/MEDIA-CDN-SETUP.md`.

---

## 1. Product

**thekoharuproject.com** — 18+ NSFW subscription product, three layers on one domain:

| Layer | Role | Status |
|-------|------|--------|
| **AI companions** (chat + on-demand images) | Retention | Text OK; images when PC stack up |
| **IRL vault** (tier photos/videos) | Premium sell | PC Media CDN / vault folders |
| **Private vault** | Owner-only | `private/` — not sold to subscribers |
| **Creator** (`/app/create`) | Custom companions | Device `localStorage` (not server yet) |

**Framing:** AI companions ≠ IRL “wife” narrative — same domain, separate product stories.

| Display | Internal | Price | Unlock |
|---------|----------|-------|--------|
| **Tease** | `free` | $0 | Teasers + limited chat |
| **Touch** | `plus` | **$15/mo** | Photos + unlimited AI chat (no videos) |
| **Claimed** | `vip` | **$35/mo** | Photos + videos + stronger image privileges |

**Do not rename** internal `free` / `plus` / `vip`.

---

## 2. Stack status (2026-07-18)

| System | Port / where | Status |
|--------|----------------|--------|
| Next.js 16 | Vercel | ✅ Live |
| Auth | Neon + JWT | ✅ |
| Stripe LIVE | Vercel env | ✅ $15 / $35 aligned |
| OpenRouter chat | Vercel | ✅ |
| Fooocus UI | `:7865` | ✅ Start via `run_koharu_lust.bat` |
| **Koharu Fooocus API** | **`:7867`** | ✅ **Required for site gens** |
| Bridge | `:8888` | ✅ Use **bridge-venv only** |
| Media CDN | `:8890` | ✅ Serves `media/` |
| Tunnel | `fooocus.thekoharuproject.com` | ✅ When cloudflared up |
| Private vault | disk + API | ✅ Owner emails only |
| PPV | Neon + incomplete UI | 🟡 DB yes; checkout/UI partial |
| R2 | — | ⏸ Deferred (more users later) |

### Health checks
```text
https://thekoharuproject.com/api/auth/health
http://127.0.0.1:8888/health
http://127.0.0.1:7867/health
https://fooocus.thekoharuproject.com/health
```

Bridge health should include:
- `"bridge":"koharu-fooocus-bridge"`
- `"fooocus_ok": true`
- **`"koharu_api_ok": true`** ← if false, site gens fail even if UI is open
- `"auto_save": true`

Auth: `store: postgres`, `stripe: true`, `stripePrices.plus/vip: true`.

---

## 3. Stripe (done — do not revert)

| Env | Price ID | Amount |
|-----|----------|--------|
| `STRIPE_PRICE_PLUS` | `price_1Tu1K6JBSgGqOg2plGnSBbRj` | $15 Touch |
| `STRIPE_PRICE_VIP` | `price_1Tu1K7JBSgGqOg2ppzBUWk8J` | $35 Claimed |

- Local `.env.local` + Vercel Production set  
- Old $12/$29 (`price_1Ttug9…`) deactivated  
- **Live = real money**

---

## 4. Companions

**14 roster IDs** in `companions/json/{id}.json` + `src/lib/companion-registry.ts`:

`koharu`, **`alina`**, `mira`, `nova`, `elena`, `raven`, `yuki`, `kai`, `cassian`, `jax`, `theo`, `damon`, `ren`

Portraits: `public/companions/{id}.jpg` must match JSON appearance.

### Alina (chat-trained persona)

| | |
|--|--|
| ID | `alina` |
| Chat | `/app/chat/alina` |
| JSON | `companions/json/alina.json` |
| Look | **18**, **Russian**, **petite**, **dyed** cherry/copper red hair (not natural), blue-grey eyes |
| Voice | IRL-texting GF (day talk, pet names, soft jealousy) |
| Training source | Desktop `creator 1.txt` — **offline only, never commit** |

---

## 5. Image generation (critical)

### Architecture (current — 2026-07-18)
```
Browser
  → POST /api/image/jobs  prepareOnly (+ companionId, prompt)
  → browser POST https://fooocus.thekoharuproject.com/v1/jobs?secret=…
  → PC bridge :8888
  → PC Koharu API :7867  (inside Fooocus process — koharu_api.py)
  → Fooocus worker / GPU
  → file in Fooocus outputs/
  → bridge copies to media/{companionId}/generated/
  → job returns media_url (CDN) + image_url
  → chat shows image via media_url preferred
```

### Why “sending a pic” with no UI progress / pipeline failed
| Symptom | Cause | Fix |
|---------|--------|-----|
| Site says sending, Fooocus UI idle | Gens go through **:7867 worker**, not Gradio UI | Expected; watch GPU / `outputs/` |
| Files in `media/` but chat never shows pic | Job stayed `running` after disk write; client timed out | Fixed: disk-stable return + **prefer `media_url`** |
| `koharu_api_ok: false` | Fooocus started without helper | Restart `run_koharu_lust.bat`; need `[Koharu] Fooocus API helper started on :7867` |
| Double images / two files per gen | Defaults `image_number=2` + job+watcher double-copy | Fixed: defaults=1, dedupe, mark-after-copy |
| Two bridge processes | System Python + bridge-venv | Kill all; start only via `ensure-fooocus-bridge.ps1` (**bridge-venv only**) |

### Fooocus install paths
| What | Path |
|------|------|
| Fooocus root | `D:\Fooocus_win64_2-5-0\Fooocus_win64_2-5-0\` |
| Start Lust | `run_koharu_lust.bat` (or `python_embeded\python.exe -s Fooocus\entry_with_update.py --preset koharu_lust`) |
| **Koharu gen API** | `Fooocus\koharu_api.py` — started from `webui.py` before `launch()` |
| Outputs | `Fooocus\outputs\` |
| Pinned deps (broken if upgraded blindly) | `gradio==3.41.2`, `fastapi==0.101.0`, `starlette==0.27.0`, `pydantic==2.4.2` |

### Bridge paths
| What | Path |
|------|------|
| Bridge code | `scripts/fooocus_bridge.py` |
| Start / repair | `scripts\ensure-fooocus-bridge.ps1` or `scripts\restart-fooocus-bridge.bat` |
| Python | **`bridge-venv\Scripts\python.exe` only** (never system Python310) |
| Media root | `C:\Users\Rob_k\OneDrive\Desktop\kohar\media\` |
| Auto-save layout | `media/{companionId}/generated/` |
| Public media URL | `https://fooocus.thekoharuproject.com/media-cdn/{companion}/generated/{file}` |

### Restart recipe (if gens fail)
```bat
:: 1) Fooocus (user) — must print Koharu API line
cd /d D:\Fooocus_win64_2-5-0\Fooocus_win64_2-5-0
run_koharu_lust.bat

:: 2) Bridge
cd /d C:\Users\Rob_k\OneDrive\Desktop\kohar
scripts\restart-fooocus-bridge.bat
```

Verify:
```bat
curl http://127.0.0.1:7867/health
curl http://127.0.0.1:8888/health
```
Need both `ok:true` and bridge `koharu_api_ok:true`.

### Client image URL preference
`src/lib/chat-client.ts` + `src/app/api/image/jobs/[id]/route.ts`:
1. Prefer **`media_url`** (CDN permanent file)
2. Else job `/v1/jobs/{id}/image?t=…`

### Chat failure copy
If gen fails, chat may say image pipeline lagged — see `src/app/api/chat/route.ts` system inject. Product UI uses soft messages in `ChatWindow.tsx`.

---

## 6. Private vault (owner only)

**Not** VIP/Claimed — **owner email only** (`src/lib/access.ts`):
- `fhcmethod@gmail.com`
- `rob@` / `admin@` / `owner@thekoharuproject.com`

| Location | Use |
|----------|-----|
| `D:\koharu-server\vault\private\photos\` | Private photos |
| `D:\koharu-server\vault\private\videos\` | Private videos |
| `media\_private\library\` + `videos\` | Mirror for CDN secret list |

- UI: gold block on `/app/vault` when `isOwner`
- API: `/api/vault` + `/api/vault/file?tier=private…` → 403 for non-owners
- Media CDN: `_private` requires `x-media-secret`; excluded from public `index.json`
- Secret catalog: `GET …/media-cdn/private-index.json` with secret (Vercel owner list)

**Public tiers:** `vault/free|plus|vip/{photos,videos}/`

---

## 7. Auth & env (Vercel Production)

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Neon |
| `AUTH_SECRET` | Sessions |
| `STRIPE_SECRET_KEY` | `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | Live `whsec_…` |
| `STRIPE_PRICE_PLUS` / `VIP` | IDs above |
| `NEXT_PUBLIC_APP_URL` | `https://thekoharuproject.com` |
| `OPENROUTER_API_KEY` | Chat |
| `IMAGE_PROVIDER` | `fooocus` |
| `FOOOCUS_API_URL` / `NEXT_PUBLIC_FOOOCUS_API_URL` | `https://fooocus.thekoharuproject.com` |
| `FOOOCUS_BRIDGE_SECRET` | **Must match PC bridge** |
| `MEDIA_PUBLIC_BASE` / `NEXT_PUBLIC_…` | Media CDN public base |
| `MEDIA_CDN_SECRET` | Optional; private index/proxy |

Local: `.env.local` (never commit).

### Deploy
```bat
cd C:\Users\Rob_k\OneDrive\Desktop\kohar
cmd /c "%LOCALAPPDATA%\hermes\node\vercel.cmd" deploy --prod --yes --non-interactive
```
PowerShell blocks `vercel.ps1` — always `vercel.cmd` via `cmd /c`.

---

## 8. PPV

**Done:** `src/lib/ppv-store.ts` (Postgres tables / file fallback).  
**Not done:** polished admin upload, one-time Stripe Checkout, webhook unlock, vault locked UI, $1 E2E test.

---

## 9. Training context (owner)

- Attempt #2 after data loss (prior LoRA wiped)  
- `creator 1.txt` → Alina persona patterns (not raw dump in product)  
- ~200 anime images for LoRA — not rebuilt yet  
- Prefer prompt JSON (`voice` / `aiNotes`) over fine-tunes for soft launch  

---

## 10. Non-negotiables

1. 18+ only; companions 18–20; never underage framing  
2. No infra dumps in consumer UI  
3. Internal tiers `free` / `plus` / `vip` only  
4. Bridge via **`bridge-venv` only**  
5. Site gens require **`:7867` koharu_api** + `:8888` bridge + tunnel  
6. No Fooocus window spam; don’t auto-kill Fooocus unless asked  
7. No `?v=` on Next/Image static companion srcs  
8. Portrait ↔ JSON appearance consistency  
9. Don’t commit secrets or `creator 1.txt`  
10. Update **this file only** for handoffs — no parallel GROK/HERMES handoff docs  

---

## 11. Priority queue

| # | Task | Notes |
|---|------|--------|
| 1 | Gen reliability in production | Tunnel + secrets + `koharu_api_ok`; chat shows CDN URL |
| 2 | Finish PPV | Admin + Stripe payment + webhook + vault UI |
| 3 | Git clean commit | Many uncommitted local changes |
| 4 | Password reset + Sentry | |
| 5 | Creator → server roster | Customs still device-only |
| 6 | Optional later | R2; more chat logs; LoRA |

**Done recently:** Stripe $15/$35 · Alina · private vault · auto-save to media · double-image fix · koharu_api + disk-stable finish · media_url in chat · bridge ensure/venv discipline  

---

## 12. First 10 minutes for next agent

1. Read **this file only**.  
2. `curl http://127.0.0.1:7867/health` and `curl http://127.0.0.1:8888/health` — both need `ok`; bridge needs `koharu_api_ok`.  
3. If API down: restart Fooocus Lust bat; confirm console line about `:7867`.  
4. If bridge down: `scripts\restart-fooocus-bridge.bat` (ensure uses bridge-venv).  
5. Smoke: hard refresh site → chat → `show` → wait 1–2 min; check `media\{id}\generated\`.  
6. Do not invent new handoff files — edit `HANDOFF.md`.  

---

## 13. Key paths

| What | Path |
|------|------|
| This handoff | `HANDOFF.md` |
| Agent short notes | `AGENTS.md` |
| Bridge | `scripts/fooocus_bridge.py` |
| Ensure bridge | `scripts/ensure-fooocus-bridge.ps1` |
| Koharu Fooocus API | `D:\…\Fooocus\koharu_api.py` |
| Fooocus webui hook | `D:\…\Fooocus\webui.py` (starts koharu_api) |
| Companions | `companions/json/*.json` |
| Registry | `src/lib/companion-registry.ts` |
| Chat client / poll | `src/lib/chat-client.ts` |
| Job poll API | `src/app/api/image/jobs/[id]/route.ts` |
| Vault | `src/app/app/vault/page.tsx`, `src/app/api/vault/*` |
| Access / owners | `src/lib/access.ts` |
| Media on PC | `media/{companion}/{library,generated,videos}/` |

---

## 14. Owner / ops

| | |
|--|--|
| Support mail | `lustaiplaything@gmail.com` |
| Primary admin | `fhcmethod@gmail.com` |
| Stripe | Adult category; US (MO) |
| Keepalive tasks | `KoharuFooocus`, `KoharuFooocusBridge`, `KoharuMediaCDN` (Task Scheduler) |

---

**End of master handoff.**  
When state changes, update **this file only**.
