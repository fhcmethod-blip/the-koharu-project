# Media CDN setup (multi-device vault)

Vercel free Blob hit its storage limit. Vault files are served from **your PC**
through Cloudflare Tunnel so **phones and computers** use the same files.

## One-time: Cloudflare public hostname

1. Open **Cloudflare Zero Trust** → **Networks** → **Tunnels** → your tunnel (Ashley)
2. **Public Hostname** → **Add**:

| Field | Value |
|--------|--------|
| Subdomain | `media` |
| Domain | `thekoharuproject.com` |
| Type | HTTP |
| URL | `localhost:8890` |

3. Save. DNS CNAME for `media` is created automatically.

## On your PC (already automated)

- Task **KoharuMediaCDN** starts `scripts\start-media-cdn.bat` on login
- Serves folder `media/` on port **8890**
- Catalog: http://127.0.0.1:8890/index.json

## Env (already set on Vercel)

- `MEDIA_PUBLIC_BASE=https://media.thekoharuproject.com`
- `NEXT_PUBLIC_MEDIA_PUBLIC_BASE=...`
- `MEDIA_CDN_SECRET` / `NEXT_PUBLIC_MEDIA_CDN_SECRET` (same as bridge secret)

## Test

```
https://media.thekoharuproject.com/index.json
https://media.thekoharuproject.com/koharu/videos/1958-web-h264.mp4
```

Then open IRL Vault as **VIP** — video should play without “this device only”.

## Note

Media is available while **this PC is on** (same as Fooocus). For always-on cloud
without the PC, enable **Cloudflare R2** later and we can move files there.
