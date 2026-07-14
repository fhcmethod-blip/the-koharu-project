# The Koharu Project

NSFW AI companion chat app with a **locked IRL media vault** (photos & video).
Domain: [thekoharuproject.com](https://thekoharuproject.com)

## What's included

| Area | Description |
|------|-------------|
| Marketing | Home, Features, Pricing, About, Signup/Login |
| Chat | Multi-persona companions — **Koharu** is the star |
| Mock AI | Local replies + placeholder images (plug in your API later) |
| IRL Vault | Members-only photos/video with Free / Plus / VIP locks |
| Age gate | 18+ entry wall |
| Auth | Demo browser sessions (localStorage) — replace with real auth later |

## Run locally

```bash
cd path/to/kohar
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo vault access

1. Sign up  
2. Open **Account**  
3. Switch tier to **Plus** or **VIP** to unlock vault items  

## Cloudflare domain

You already manage DNS on Cloudflare. Typical production path:

### Option A — Cloudflare Pages (recommended start)

1. Push this repo to GitHub  
2. Cloudflare Dashboard → **Workers & Pages** → **Create** → connect the repo  
3. Build command: `npx @cloudflare/next-on-pages@1` *or* use OpenNext (`@opennextjs/cloudflare`) — follow current Cloudflare Next.js docs  
4. Output / deploy per that adapter  
5. **Custom domains** → add your domain (Cloudflare will use existing zone DNS)

### Option B — Any host + Cloudflare DNS only

1. Deploy to Vercel/Node host  
2. In Cloudflare DNS, add **CNAME** `@` or `www` → your host  
3. Proxy orange-cloud if you want Cloudflare CDN/WAF  

### IRL media storage (later)

- Put private files in **Cloudflare R2** (private bucket)  
- Serve with **short-lived signed URLs** only after membership check  
- Never put raw exclusive URLs in the public repo  

## Plug in your AI API later

Chat uses `src/lib/mock-ai.ts`. Replace `generateReply` with your provider.

If you use **xAI / SpaceXAI** (OpenAI-compatible):

- Env: `XAI_API_KEY` (server-side only)  
- Base URL: `https://api.x.ai/v1`  
- Docs: https://docs.x.ai  

## Legal / content notes

- 18+ only  
- IRL vault content must be material you have rights to distribute (consensual adult content)  
- Add real ToS, privacy policy, and payment provider terms before charging  

## Project layout

```
src/app/           # pages (marketing + /app/*)
src/components/    # UI
src/lib/           # auth, characters, vault, mock AI
```
