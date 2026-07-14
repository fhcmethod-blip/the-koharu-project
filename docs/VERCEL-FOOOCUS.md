# Fooocus on the live Vercel site

Vercel cannot see `127.0.0.1`. You expose the **bridge** with Cloudflare Tunnel.

```
Visitor → Vercel (site/chat)
              │
              │ short poll requests
              ▼
   https://fooocus.thekoharuproject.com   ← Cloudflare Tunnel
              │
              ▼
   Your PC :8888 bridge → :7865 Fooocus GPU
```

## On your PC (always for image gen)

1. Start **Fooocus** (`run_koharu_lust.bat`)
2. Start **bridge** (`scripts\start-fooocus-bridge.bat`)
3. Cloudflared service already runs (tunnel)

## Cloudflare — public hostname

Zero Trust → **Networks → Tunnels → Ashley (or your tunnel)** → **Public Hostname** → Add:

| Field | Value |
|--------|--------|
| Subdomain | `fooocus` |
| Domain | `thekoharuproject.com` |
| Path | *(empty)* |
| Type | **HTTP** |
| URL | `localhost:8888` |

Full hostname: **`https://fooocus.thekoharuproject.com`**

Test:
- https://fooocus.thekoharuproject.com/health  
  Should show `"ok": true` when Fooocus + bridge are running.

## Vercel environment variables

| Name | Value |
|------|--------|
| `OPENROUTER_API_KEY` | your key |
| `OPENROUTER_MODEL` | `nousresearch/hermes-3-llama-3.1-70b` |
| `IMAGE_PROVIDER` | `fooocus` |
| `FOOOCUS_API_URL` | `https://fooocus.thekoharuproject.com` |
| `FOOOCUS_BRIDGE_SECRET` | (optional) long random string — also set on the PC bridge |

Redeploy after saving env vars.

## Chat flow (timeout-safe)

1. User types `show`
2. Browser starts **async job** on bridge (via Vercel proxy)
3. Browser **polls** every 2.5s (short requests — no 100s Cloudflare kill)
4. When image ready → chat text from OpenRouter + image shown

## Security note

Anyone who finds `fooocus.thekoharuproject.com` could try to burn your GPU.  
Set `FOOOCUS_BRIDGE_SECRET` on both the bridge and Vercel.
