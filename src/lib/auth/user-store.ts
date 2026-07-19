/**
 * User persistence for email/password accounts.
 *
 * - If DATABASE_URL is set → Postgres (Neon / Vercel Postgres / any PG)
 * - Else → local JSON file at data/users.json (dev / single-server)
 *
 * For production on Vercel you MUST set DATABASE_URL (free Neon is fine).
 */

import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type { MembershipTier } from "@/lib/types";
import { isOwnerEmail } from "@/lib/access";
import type { StoredUser } from "./types";
import { applyOwnerTier } from "./session";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

let pgReady: Promise<void> | null = null;

function usePostgres(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

async function getSql() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  const postgres = (await import("postgres")).default;
  const g = globalThis as unknown as {
    __kohar_sql?: ReturnType<typeof postgres>;
  };
  if (!g.__kohar_sql) {
    const needsSsl =
      /neon\.tech|sslmode=require|amazonaws\.com/i.test(url) ||
      process.env.PGSSL === "1";
    g.__kohar_sql = postgres(url, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 15,
      ...(needsSsl ? { ssl: "require" as const } : {}),
    });
  }
  return g.__kohar_sql;
}

async function ensurePgSchema() {
  if (pgReady) return pgReady;
  pgReady = (async () => {
    const sql = await getSql();
    if (!sql) return;
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        tier TEXT NOT NULL DEFAULT 'free',
        age_verified BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT
      )
    `;
    // Migrations for older tables
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT`;
    await sql`CREATE INDEX IF NOT EXISTS users_email_idx ON users (email)`;
    await sql`CREATE INDEX IF NOT EXISTS users_stripe_customer_idx ON users (stripe_customer_id)`;
  })();
  return pgReady;
}

function rowToUser(r: Record<string, unknown>): StoredUser {
  return {
    id: String(r.id),
    email: String(r.email).toLowerCase(),
    displayName: String(r.display_name ?? r.displayName ?? "Member"),
    passwordHash: String(r.password_hash ?? r.passwordHash ?? ""),
    tier: (String(r.tier || "free") as MembershipTier) || "free",
    ageVerified: Boolean(r.age_verified ?? r.ageVerified ?? true),
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : String(r.created_at ?? r.createdAt ?? new Date().toISOString()),
    updatedAt:
      r.updated_at instanceof Date
        ? r.updated_at.toISOString()
        : String(r.updated_at ?? r.updatedAt ?? new Date().toISOString()),
    stripeCustomerId: (r.stripe_customer_id ??
      r.stripeCustomerId ??
      null) as string | null,
    stripeSubscriptionId: (r.stripe_subscription_id ??
      r.stripeSubscriptionId ??
      null) as string | null,
  };
}

async function readFileUsers(): Promise<StoredUser[]> {
  try {
    const raw = await fs.readFile(USERS_FILE, "utf8");
    const parsed = JSON.parse(raw) as StoredUser[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeFileUsers(users: StoredUser[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${USERS_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(users, null, 2), "utf8");
  await fs.rename(tmp, USERS_FILE);
}

export async function findUserByEmail(
  email: string,
): Promise<StoredUser | null> {
  const normalized = email.trim().toLowerCase();
  if (usePostgres()) {
    await ensurePgSchema();
    const sql = await getSql();
    if (!sql) return null;
    const rows = await sql`
      SELECT * FROM users WHERE lower(email) = ${normalized} LIMIT 1
    `;
    if (!rows[0]) return null;
    return rowToUser(rows[0] as Record<string, unknown>);
  }
  const all = await readFileUsers();
  return all.find((u) => u.email === normalized) ?? null;
}

export async function findUserById(id: string): Promise<StoredUser | null> {
  if (usePostgres()) {
    await ensurePgSchema();
    const sql = await getSql();
    if (!sql) return null;
    const rows = await sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
    if (!rows[0]) return null;
    return rowToUser(rows[0] as Record<string, unknown>);
  }
  const all = await readFileUsers();
  return all.find((u) => u.id === id) ?? null;
}

export async function findUserByStripeCustomerId(
  customerId: string,
): Promise<StoredUser | null> {
  if (!customerId) return null;
  if (usePostgres()) {
    await ensurePgSchema();
    const sql = await getSql();
    if (!sql) return null;
    const rows = await sql`
      SELECT * FROM users WHERE stripe_customer_id = ${customerId} LIMIT 1
    `;
    if (!rows[0]) return null;
    return rowToUser(rows[0] as Record<string, unknown>);
  }
  const all = await readFileUsers();
  return all.find((u) => u.stripeCustomerId === customerId) ?? null;
}

export async function createUser(input: {
  email: string;
  displayName: string;
  passwordHash: string;
  ageVerified?: boolean;
}): Promise<StoredUser> {
  const email = input.email.trim().toLowerCase();
  const now = new Date().toISOString();
  const tier: MembershipTier = isOwnerEmail(email) ? "vip" : "free";
  const user: StoredUser = {
    id: randomUUID(),
    email,
    displayName: input.displayName.trim() || email.split("@")[0] || "Member",
    passwordHash: input.passwordHash,
    tier,
    ageVerified: input.ageVerified ?? true,
    createdAt: now,
    updatedAt: now,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
  };

  if (usePostgres()) {
    await ensurePgSchema();
    const sql = await getSql();
    if (!sql) throw new Error("Database unavailable");
    try {
      const stripeCust: string | null = user.stripeCustomerId ?? null;
      const stripeSub: string | null = user.stripeSubscriptionId ?? null;
      await sql`
        INSERT INTO users (
          id, email, display_name, password_hash, tier, age_verified,
          created_at, updated_at, stripe_customer_id, stripe_subscription_id
        )
        VALUES (
          ${user.id},
          ${user.email},
          ${user.displayName},
          ${user.passwordHash},
          ${user.tier},
          ${user.ageVerified},
          ${user.createdAt},
          ${user.updatedAt},
          ${stripeCust},
          ${stripeSub}
        )
      `;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/unique|duplicate/i.test(msg)) {
        throw new Error("EMAIL_TAKEN");
      }
      throw e;
    }
    return user;
  }

  const all = await readFileUsers();
  if (all.some((u) => u.email === email)) {
    throw new Error("EMAIL_TAKEN");
  }
  all.push(user);
  await writeFileUsers(all);
  return user;
}

export async function updateUserTier(
  userId: string,
  tier: MembershipTier,
): Promise<StoredUser | null> {
  const user = await findUserById(userId);
  if (!user) return null;
  const nextTier = applyOwnerTier(user.email, tier);
  const updatedAt = new Date().toISOString();

  if (usePostgres()) {
    await ensurePgSchema();
    const sql = await getSql();
    if (!sql) return null;
    await sql`
      UPDATE users SET tier = ${nextTier}, updated_at = ${updatedAt}
      WHERE id = ${userId}
    `;
    return { ...user, tier: nextTier, updatedAt };
  }

  const all = await readFileUsers();
  const idx = all.findIndex((u) => u.id === userId);
  if (idx < 0) return null;
  all[idx] = { ...all[idx], tier: nextTier, updatedAt };
  await writeFileUsers(all);
  return all[idx];
}

export async function updateUserBilling(
  userId: string,
  patch: {
    tier?: MembershipTier;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
  },
): Promise<StoredUser | null> {
  const user = await findUserById(userId);
  if (!user) return null;
  const updatedAt = new Date().toISOString();
  const tier =
    patch.tier !== undefined
      ? applyOwnerTier(user.email, patch.tier)
      : user.tier;
  const stripeCustomerId =
    patch.stripeCustomerId !== undefined
      ? patch.stripeCustomerId
      : user.stripeCustomerId;
  const stripeSubscriptionId =
    patch.stripeSubscriptionId !== undefined
      ? patch.stripeSubscriptionId
      : user.stripeSubscriptionId;

  if (usePostgres()) {
    await ensurePgSchema();
    const sql = await getSql();
    if (!sql) return null;
    const sc: string | null = stripeCustomerId ?? null;
    const ss: string | null = stripeSubscriptionId ?? null;
    await sql`
      UPDATE users SET
        tier = ${tier},
        stripe_customer_id = ${sc},
        stripe_subscription_id = ${ss},
        updated_at = ${updatedAt}
      WHERE id = ${userId}
    `;
    return {
      ...user,
      tier,
      stripeCustomerId,
      stripeSubscriptionId,
      updatedAt,
    };
  }

  const all = await readFileUsers();
  const idx = all.findIndex((u) => u.id === userId);
  if (idx < 0) return null;
  all[idx] = {
    ...all[idx],
    tier,
    stripeCustomerId,
    stripeSubscriptionId,
    updatedAt,
  };
  await writeFileUsers(all);
  return all[idx];
}

export function authStoreMode(): "postgres" | "file" {
  return usePostgres() ? "postgres" : "file";
}

/** Probe DB connectivity (for health). */
export async function probeAuthStore(): Promise<{
  mode: "postgres" | "file";
  ok: boolean;
  error?: string;
}> {
  const mode = authStoreMode();
  if (mode === "file") {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      return { mode, ok: true };
    } catch (e) {
      return {
        mode,
        ok: false,
        error: e instanceof Error ? e.message : "file store error",
      };
    }
  }
  try {
    await ensurePgSchema();
    const sql = await getSql();
    if (!sql) return { mode, ok: false, error: "no connection" };
    await sql`SELECT 1 as ok`;
    return { mode, ok: true };
  } catch (e) {
    return {
      mode,
      ok: false,
      error: e instanceof Error ? e.message : "postgres error",
    };
  }
}
