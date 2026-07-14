# Handoff: The Koharu Project → Hermes

**Date:** 2026-07-14  
**From:** Grok (this session)  
**Project path:** `C:\Users\Rob_k\OneDrive\Desktop\kohar`  
**Live site:** https://thekoharuproject.com  

---

## What this is

**The Koharu Project** — NSFW AI companion web app (Next.js + Tailwind):

- Marketing site (home, features, pricing, about, signup/login)
- App area: multi-persona chat, IRL vault (membership-locked), account tiers
- Star companion: **Koharu** (also Mira, Nova, Elena)
- Brand name: **The Koharu Project** (not “Kohar”)
- Domain: `thekoharuproject.com` / `www.thekoharuproject.com`

---

## How it’s running right now

| Piece | Detail |
|--------|--------|
| App | Next.js 16, `src/` App Router |
| Local | `npm run dev -- -p 8000 -H 127.0.0.1` (must stay on **port 8000**) |
| Tunnel | Windows service **Cloudflared** → healthy tunnel **Ashley** (`a0b18abb-4ce3-41ef-8a64-d91e879a821c`) |
| DNS | Apex + www CNAME → that tunnel (proxied) |
| Auth | Demo only — `localStorage` (`src/lib/auth.tsx`) |
| Chat AI | **Mock** — `src/lib/mock-ai.ts` (no real LLM yet) |
| Vault | Placeholder locks Free / Plus / VIP — `src/lib/vault.ts` |

### Run locally

```powershell
cd C:\Users\Rob_k\OneDrive\Desktop\kohar
npm install
npm run dev -- -p 8000 -H 127.0.0.1
```

Keep Cloudflared service running for the public domain.

---

## Key files

```
src/app/                 # pages (marketing + /app/*)
src/components/          # UI (ChatWindow, AgeGate, VaultGrid, AppShell…)
src/lib/characters.ts    # companion definitions
src/lib/mock-ai.ts       # mock replies (replace with real API)
src/lib/auth.tsx         # demo auth + tiers
src/lib/vault.ts         # IRL vault catalog + access checks
src/lib/chat-store.ts    # localStorage chat history
src/lib/types.ts         # shared types
```

---

## What’s done

- [x] Next.js marketing + app shell
- [x] 18+ age gate
- [x] Signup/login (browser demo)
- [x] Characters + Koharu-focused chat UI
- [x] Mock AI + placeholder images in chat
- [x] Locked IRL vault by tier
- [x] Cloudflare Tunnel + DNS live
- [x] Brand rename to **The Koharu Project**

---

## What’s next (priority)

1. **Hard-baked AI system rules** (user asked for this next)  
   - Global rules: 18+ only, no minors, stay in character, NSFW allowed for adults, vault vs chat boundaries, etc.  
   - Per-character personality overlays (Koharu first)  
   - File suggestion: `src/lib/ai-rules.ts` + `buildSystemPrompt(character)`

2. **Wire real AI**  
   - User interest: local LLM / uncensored companion models; also xAI/SpaceXAI path documented in mock-ai  
   - Prefer server route so keys never hit the browser  

3. **Real vault media** (Cloudflare R2 + signed URLs)  

4. **Real auth + payments** later  

---

## Cloudflare notes

- Account owns zone `thekoharuproject.com`
- Tunnel name: **Ashley** (healthy) — old **botx** / **koharu** tunnels were down
- API was used once to set ingress + DNS; user keeps their API token
- Do **not** route path `^/blog` — broke the whole site before

---

## User preferences (from prior Hermes memory + this session)

- Domain-driven naming: thekoharuproject.com / Koharu
- Wants real chatbot, not endless copy-paste
- Cloudflare tunnel to localhost is the deployment model (PC as origin)
- NSFW companion product with locked IRL pics/video for members
- Next focus: **hard-baked rules for the AI to follow**, then working chat

---

## Starter prompt for Hermes

```
Continue The Koharu Project at C:\Users\Rob_k\OneDrive\Desktop\kohar
Read HANDOFF-TO-HERMES.md fully.
Live site: https://thekoharuproject.com via Cloudflare Tunnel → localhost:8000
Next task: implement hard-baked AI rules (system prompt + per-character) in src/lib/,
then improve chat so rules are applied. Brand is "The Koharu Project"; star is Koharu.
```
