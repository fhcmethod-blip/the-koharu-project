# Neon (Postgres) + Stripe setup

## 1. Neon — permanent accounts on Vercel

Without `DATABASE_URL`, accounts live in `data/users.json` (fine on your PC, **not** reliable on Vercel).

### Create free Neon project

1. Go to https://console.neon.tech and sign up  
2. **New project** → name e.g. `kohar` → region close to you  
3. Copy the **connection string** (pooled or direct). Looks like:

```
postgresql://user:password@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### Local `.env.local`

```env
DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"
AUTH_SECRET="your-long-random-secret"
NEXT_PUBLIC_APP_URL="https://thekoharuproject.com"
```

Restart the Next server. First signup creates the `users` table automatically.

### Vercel

Project → Settings → Environment Variables:

| Name | Value |
|------|--------|
| `DATABASE_URL` | Neon connection string |
| `AUTH_SECRET` | Same as local (or new long secret) |
| `NEXT_PUBLIC_APP_URL` | `https://thekoharuproject.com` |

Redeploy. Check: `https://thekoharuproject.com/api/auth/health`  
→ `"store":"postgres","ok":true`

---

## 2. Stripe — Plus / VIP subscriptions

### Stripe Dashboard

1. https://dashboard.stripe.com → enable **Test mode** first  
2. **Product catalog** → create two products:

| Product | Price | Billing |
|---------|-------|---------|
| Koharu Plus | $12 / month | Recurring |
| Koharu VIP | $29 / month | Recurring |

3. Copy each **Price ID** (`price_...`)  
4. **Developers → API keys** → Secret key (`sk_test_...` / later `sk_live_...`)  
5. **Developers → Webhooks → Add endpoint**

- URL: `https://thekoharuproject.com/api/stripe/webhook`  
- Events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Copy **Signing secret** (`whsec_...`)

6. **Settings → Billing → Customer portal** → enable (cancel / update payment)

### Env vars

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PLUS=price_...
STRIPE_PRICE_VIP=price_...
NEXT_PUBLIC_APP_URL=https://thekoharuproject.com
```

Same on Vercel Production + Preview (use test keys until go-live).

### Local webhook testing

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use the `whsec_...` that CLI prints as `STRIPE_WEBHOOK_SECRET`.

### Flow

1. User logs in  
2. Pricing → **Get Plus** / **Go VIP**  
3. Stripe Checkout  
4. Webhook sets `users.tier` to `plus` or `vip`  
5. Account → **Manage billing** opens Stripe Customer Portal  

---

## Health check

`GET /api/auth/health`

```json
{
  "ok": true,
  "store": "postgres",
  "databaseUrl": true,
  "stripe": true,
  "stripePrices": { "plus": true, "vip": true }
}
```

---

## Order of operations (recommended)

1. Neon + `DATABASE_URL` + redeploy (auth survives)  
2. Stripe test products + env + webhook  
3. Test full Plus purchase in test mode  
4. Switch to live Stripe keys when ready  
