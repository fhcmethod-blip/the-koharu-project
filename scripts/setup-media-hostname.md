# Fix multi-device media (5 minutes)

**Problem:** `media.thekoharuproject.com` does not exist in DNS.  
**Fooocus already works:** `fooocus.thekoharuproject.com` → PC `:8888`  
**Media CDN already runs on PC:** `http://127.0.0.1:8890`

## Add public hostname (Cloudflare dashboard)

1. Open: https://one.dash.cloudflare.com/  
2. **Networks** → **Tunnels** → tunnel **Ashley** (or your Koharu tunnel)  
3. **Public Hostname** → **Add a public hostname**

| Field | Value |
|--------|--------|
| Subdomain | `media` |
| Domain | `thekoharuproject.com` |
| Type | **HTTP** |
| URL | `http://127.0.0.1:8890` |

4. **Save**

## Test

```
https://media.thekoharuproject.com/health
https://media.thekoharuproject.com/index.json
```

Both should work while your PC is on (Media CDN task running).

## Already set on Vercel

- `MEDIA_PUBLIC_BASE=https://media.thekoharuproject.com`
- `NEXT_PUBLIC_MEDIA_PUBLIC_BASE=...`

After DNS works, vault on phones will use the same files as the PC.
