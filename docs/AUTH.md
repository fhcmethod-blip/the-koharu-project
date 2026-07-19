# Email / password auth

The Koharu Project uses **server-backed** accounts:

- Signup / login: `POST /api/auth/signup`, `POST /api/auth/login`
- Session: signed HTTP-only cookie `kohar_session` (JWT via `jose`)
- Passwords: **bcrypt** (12 rounds) — never stored plain
- Helper cookies `kohar_tier` + `kohar_email` for vault media tags

## Env

| Variable | Required | Notes |
|----------|----------|--------|
| `AUTH_SECRET` | **Yes** | Long random string (`openssl rand -hex 32`) |
| `DATABASE_URL` | Prod | Postgres (Neon free). Without it → `data/users.json` |

## Local (default)

Users save to:

```
data/users.json
```

Gitignored. Fine for one PC / dev.

## Production (Vercel)

1. Create a free Postgres (e.g. [Neon](https://neon.tech)).
2. Set on Vercel:
   - `AUTH_SECRET` = same strong secret
   - `DATABASE_URL` = postgres connection string
3. Redeploy. Table `users` is created automatically on first signup.

## Owner VIP

Emails in `src/lib/access.ts` → always VIP.

## API

| Route | Purpose |
|-------|---------|
| `POST /api/auth/signup` | `{ email, password, displayName, ageConfirmed }` |
| `POST /api/auth/login` | `{ email, password }` |
| `POST /api/auth/logout` | Clear cookies |
| `GET /api/auth/me` | Current user or `null` |
| `POST /api/auth/tier` | Owner-only tier switch |

## Stripe + Neon

See **`docs/NEON-AND-STRIPE.md`** for production setup.

## Not yet

- Password reset email
- Email verification
- OAuth (Google etc.)

