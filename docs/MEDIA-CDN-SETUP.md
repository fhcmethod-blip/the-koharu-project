# Media CDN setup (multi-device vault)

Vercel free Blob hit its storage limit. Vault files are served from **your PC**
through Cloudflare Tunnel so **phones and computers** use the same files.

## Public URL (works now — no extra DNS)

Media is exposed on the **existing Fooocus tunnel** with a path prefix:

```
https://fooocus.thekoharuproject.com/media-cdn/health
https://fooocus.thekoharuproject.com/media-cdn/index.json
https://fooocus.thekoharuproject.com/media-cdn/koharu/videos/….mp4
```

Tunnel ingress (remote config + local `config.yml`):
1. `fooocus…/media-cdn*` → `http://127.0.0.1:8890`
2. `fooocus…` → `http://127.0.0.1:8888` (bridge)

Optional later: add DNS `media.thekoharuproject.com` CNAME → tunnel for a cleaner hostname
(requires Cloudflare zone DNS edit permission).

## On your PC (already automated)

- Task **KoharuMediaCDN** starts `scripts\start-media-cdn.bat` on login
- Serves folder `media/` on port **8890**
- Catalog: http://127.0.0.1:8890/index.json

## Env (Vercel + `.env.local`)

- `MEDIA_PUBLIC_BASE=https://fooocus.thekoharuproject.com/media-cdn`
- `NEXT_PUBLIC_MEDIA_PUBLIC_BASE=…` (same)
- `MEDIA_CDN_SECRET` / `NEXT_PUBLIC_MEDIA_CDN_SECRET` (optional)

## Test

```
https://fooocus.thekoharuproject.com/media-cdn/index.json
https://fooocus.thekoharuproject.com/media-cdn/koharu/videos/1958-web-h264.mp4
```

Then open IRL Vault as **VIP** — video should play without “this device only”.

## Note

Media is available while **this PC is on** (same as Fooocus). For always-on cloud
without the PC, enable **Cloudflare R2** later and we can move files there.
