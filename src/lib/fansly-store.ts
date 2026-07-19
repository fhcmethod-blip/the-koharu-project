/**
 * Fansly verification store
 *
 * Two flows:
 * A) Fan-request: user gets a code on site → DMs you → admin Approves
 * B) Admin-issue: you create a code → DM fan on Fansly → they redeem on signup/account
 *
 * Both grant site tier for 30 days (CODE_TTL_MS).
 *
 * Postgres (Neon) when DATABASE_URL set, else JSON file fallback.
 */

import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import * as path from "path";
import type { MembershipTier } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const FANSLY_FILE = path.join(DATA_DIR, "fansly.json");

/** How long an approved code grants access (ms). */
export const CODE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** How long an unapproved code waits before expiring (ms). */
export const PENDING_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

export type FanslyVerification = {
  id: string;
  /** Empty until an issued code is redeemed */
  userId: string;
  fanslyUsername: string;
  requestedTier: MembershipTier;
  code: string;
  /** issued = admin-created, waiting for fan to redeem */
  status: "pending" | "issued" | "approved" | "expired" | "revoked";
  createdAt: string;
  expiresAt: string;
  approvedAt?: string | null;
  activatedTier?: MembershipTier | null;
};

type FanslyDb = { verifications: FanslyVerification[] };

let pgReady: Promise<void> | null = null;

function usePostgres(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

async function getSql() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  const postgres = (await import("postgres")).default;
  const g = globalThis as unknown as {
    __kohar_fansly_sql?: ReturnType<typeof postgres>;
  };
  if (!g.__kohar_fansly_sql) {
    const needsSsl =
      /neon\.tech|sslmode=require|amazonaws\.com/i.test(url) ||
      process.env.PGSSL === "1";
    g.__kohar_fansly_sql = postgres(url, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 15,
      ...(needsSsl ? { ssl: "require" as const } : {}),
    });
  }
  return g.__kohar_fansly_sql;
}

async function ensurePgSchema() {
  if (pgReady) return pgReady;
  pgReady = (async () => {
    const sql = await getSql();
    if (!sql) return;
    await sql`
      CREATE TABLE IF NOT EXISTS fansly_verifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT '',
        fansly_username TEXT NOT NULL DEFAULT '',
        requested_tier TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        approved_at TIMESTAMPTZ,
        activated_tier TEXT
      )
    `;
    // Allow empty user_id for admin-issued codes awaiting redeem
    try {
      await sql`ALTER TABLE fansly_verifications ALTER COLUMN user_id SET DEFAULT ''`;
    } catch {
      /* ignore */
    }
    await sql`CREATE INDEX IF NOT EXISTS fansly_ver_user_idx ON fansly_verifications (user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS fansly_ver_status_idx ON fansly_verifications (status)`;
    await sql`CREATE INDEX IF NOT EXISTS fansly_ver_code_idx ON fansly_verifications (code)`;
  })();
  return pgReady;
}

/** Upgrade user tier for a Fansly grant. Never downgrades VIP. */
async function applyTierUpgrade(
  userId: string,
  requestedTier: MembershipTier,
): Promise<void> {
  if (!userId) return;
  if (requestedTier !== "plus" && requestedTier !== "vip") return;
  const { updateUserTier, findUserById } = await import("./auth/user-store");
  const user = await findUserById(userId);
  if (!user) return;
  // Keep VIP; otherwise set to requested paid tier (free→plus/vip, plus→vip)
  if (user.tier === "vip") return;
  if (user.tier === requestedTier) return;
  const rank = { free: 0, plus: 1, vip: 2 } as const;
  if (rank[requestedTier] > rank[user.tier]) {
    await updateUserTier(userId, requestedTier);
  }
}

// --- JSON file fallback ---

async function readDb(): Promise<FanslyDb> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(FANSLY_FILE, "utf8");
    return JSON.parse(raw) as FanslyDb;
  } catch {
    return { verifications: [] };
  }
}

async function writeDb(db: FanslyDb): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FANSLY_FILE, JSON.stringify(db, null, 2), "utf8");
}

// --- Helpers ---

function nowUtc(): string {
  return new Date().toISOString();
}

function addMs(iso: string, ms: number): string {
  return new Date(new Date(iso).getTime() + ms).toISOString();
}

/** Generate code like KH-A1B2-C3D4 */
function makeCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/1/I ambiguity
  const bytes = randomBytes(8);
  let out = "KH-";
  for (let i = 0; i < 8; i++) {
    if (i === 4) out += "-";
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

function rowToVer(r: Record<string, unknown>): FanslyVerification {
  return {
    id: String(r.id),
    userId: String(r.user_id ?? r.userId),
    fanslyUsername: String(r.fansly_username ?? r.fanslyUsername),
    requestedTier: (String(
      r.requested_tier ?? r.requestedTier,
    ) as MembershipTier) as MembershipTier,
    code: String(r.code),
    status: (String(r.status) as FanslyVerification["status"]) as FanslyVerification["status"],
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : String(r.created_at ?? r.createdAt ?? nowUtc()),
    expiresAt:
      r.expires_at instanceof Date
        ? r.expires_at.toISOString()
        : String(r.expires_at ?? r.expiresAt ?? nowUtc()),
    approvedAt:
      r.approved_at instanceof Date
        ? r.approved_at.toISOString()
        : r.approved_at
          ? String(r.approved_at)
          : r.approvedAt
            ? String(r.approvedAt)
            : null,
    activatedTier: (String(r.activated_tier ?? r.activatedTier ?? "") as MembershipTier) || null,
  };
}

// --- Public API ---

/**
 * Request a new Fansly verification code.
 * Fails if the user already has a pending (unexpired) code.
 */
export async function requestCode(params: {
  userId: string;
  fanslyUsername: string;
  tier: MembershipTier;
}): Promise<
  | { ok: true; verification: FanslyVerification }
  | { ok: false; error: string }
> {
  if (params.tier !== "plus" && params.tier !== "vip") {
    return { ok: false, error: "Fansly verification is only for Plus or VIP tiers." };
  }

  const now = nowUtc();

  if (usePostgres()) {
    await ensurePgSchema();
    const sql = await getSql();
    if (!sql) return { ok: false, error: "DB connection failed." };

    // Expire any stale pending codes for this user
    await sql`
      UPDATE fansly_verifications
      SET status = 'expired'
      WHERE user_id = ${params.userId}
        AND status = 'pending'
        AND expires_at < ${now}
    `;

    // Check for existing active/pending codes
    const existing = await sql`
      SELECT * FROM fansly_verifications
      WHERE user_id = ${params.userId}
        AND status = 'pending'
        AND expires_at >= ${now}
      LIMIT 1
    `;
    if (existing.length > 0) {
      const v = rowToVer(existing[0]);
      return {
        ok: false,
        error: `You already have a pending code: ${v.code}. DM it to @Rob on Fansly first.`,
      };
    }

    const id = crypto.randomUUID();
    const code = makeCode();
    const pendingExpiry = addMs(now, PENDING_TTL_MS);

    await sql`
      INSERT INTO fansly_verifications
        (id, user_id, fansly_username, requested_tier, code, status, created_at, expires_at)
      VALUES
        (${id}, ${params.userId}, ${params.fanslyUsername.toLowerCase()},
         ${params.tier}, ${code}, 'pending', ${now}, ${pendingExpiry})
    `;

    const inserted = await sql`
      SELECT * FROM fansly_verifications WHERE id = ${id}
    `;
    return { ok: true, verification: rowToVer(inserted[0]) };
  }

  // JSON fallback
  const db = await readDb();

  // Expire stale pending
  for (const v of db.verifications) {
    if (
      v.userId === params.userId &&
      v.status === "pending" &&
      new Date(v.expiresAt) < new Date(now)
    ) {
      v.status = "expired";
    }
  }

  const existingPending = db.verifications.find(
    (v) =>
      v.userId === params.userId &&
      v.status === "pending" &&
      new Date(v.expiresAt) >= new Date(now),
  );
  if (existingPending) {
    return {
      ok: false,
      error: `You already have a pending code: ${existingPending.code}. DM it to @Rob on Fansly first.`,
    };
  }

  const ver: FanslyVerification = {
    id: crypto.randomUUID(),
    userId: params.userId,
    fanslyUsername: params.fanslyUsername.toLowerCase(),
    requestedTier: params.tier,
    code: makeCode(),
    status: "pending",
    createdAt: now,
    expiresAt: addMs(now, PENDING_TTL_MS),
  };
  db.verifications.push(ver);
  await writeDb(db);
  return { ok: true, verification: ver };
}

/** Get user's current (active + most recent pending) Fansly verifications. */
export async function getUserVerifications(
  userId: string,
): Promise<FanslyVerification[]> {
  if (usePostgres()) {
    await ensurePgSchema();
    const sql = await getSql();
    if (!sql) return [];
    const rows = await sql`
      SELECT * FROM fansly_verifications
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 20
    `;
    return rows.map(rowToVer);
  }
  const db = await readDb();
  return db.verifications
    .filter((v) => v.userId === userId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 20);
}

/** Get the user's active Fansly tier (from an unexpired approved code). */
export async function getUserActiveFanslyTier(
  userId: string,
): Promise<MembershipTier | null> {
  const now = nowUtc();
  if (usePostgres()) {
    await ensurePgSchema();
    const sql = await getSql();
    if (!sql) return null;
    const rows = await sql`
      SELECT * FROM fansly_verifications
      WHERE user_id = ${userId}
        AND status = 'approved'
        AND expires_at >= ${now}
      ORDER BY expires_at DESC
      LIMIT 1
    `;
    if (rows.length === 0) return null;
    const v = rowToVer(rows[0]);
    return v.activatedTier ?? v.requestedTier;
  }
  const db = await readDb();
  const active = db.verifications
    .filter(
      (v) =>
        v.userId === userId &&
        v.status === "approved" &&
        new Date(v.expiresAt) >= new Date(now),
    )
    .sort((a, b) => (a.expiresAt < b.expiresAt ? 1 : -1))[0];
  if (!active) return null;
  return active.activatedTier ?? active.requestedTier;
}

/** Admin: list all pending verifications. */
export async function listPending(): Promise<FanslyVerification[]> {
  const now = nowUtc();
  if (usePostgres()) {
    await ensurePgSchema();
    const sql = await getSql();
    if (!sql) return [];
    // Auto-expire stale pending
    await sql`
      UPDATE fansly_verifications
      SET status = 'expired'
      WHERE status = 'pending' AND expires_at < ${now}
    `;
    const rows = await sql`
      SELECT v.*, u.email, u.display_name
      FROM fansly_verifications v
      LEFT JOIN users u ON u.id = v.user_id
      WHERE v.status = 'pending'
      ORDER BY v.created_at ASC
    `;
    return rows.map((r) => ({
      ...rowToVer(r),
      // Attach user info via spread (cast needed for admin display)
      ...(typeof r.email === "string" ? { userEmail: r.email } : {}),
      ...(typeof r.display_name === "string"
        ? { userDisplayName: r.display_name }
        : {}),
    })) as (FanslyVerification & {
      userEmail?: string;
      userDisplayName?: string;
    })[];
  }
  const db = await readDb();
  for (const v of db.verifications) {
    if (v.status === "pending" && new Date(v.expiresAt) < new Date(now)) {
      v.status = "expired";
    }
  }
  await writeDb(db);
  return db.verifications
    .filter((v) => v.status === "pending")
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

/** Admin: approve a code. Sets the user's tier + resets expiry to 30 days. */
export async function approveCode(params: {
  code: string;
  adminUserId: string;
}): Promise<
  | { ok: true; verification: FanslyVerification }
  | { ok: false; error: string }
> {
  const now = nowUtc();
  const grantsUntil = addMs(now, CODE_TTL_MS);

  if (usePostgres()) {
    await ensurePgSchema();
    const sql = await getSql();
    if (!sql) return { ok: false, error: "DB connection failed." };

    const rows = await sql`
      SELECT * FROM fansly_verifications WHERE code = ${params.code}
    `;
    if (rows.length === 0) return { ok: false, error: "Code not found." };

    const v = rowToVer(rows[0]);
    if (v.status !== "pending") {
      return { ok: false, error: `Code already ${v.status}.` };
    }
    if (new Date(v.expiresAt) < new Date(now)) {
      await sql`
        UPDATE fansly_verifications SET status = 'expired' WHERE id = ${v.id}
      `;
      return { ok: false, error: "Code expired." };
    }

    await sql`
      UPDATE fansly_verifications SET
        status = 'approved',
        approved_at = ${now},
        expires_at = ${grantsUntil},
        activated_tier = ${v.requestedTier}
      WHERE id = ${v.id}
    `;

    // Update the user's tier in users table
    // Only upgrade, never downgrade (user might have Stripe active too)
    const userRows = await sql`
      SELECT tier FROM users WHERE id = ${v.userId}
    `;
    const currentTier = userRows.length
      ? (String(userRows[0].tier) as MembershipTier)
      : "free";

    // Upgrade rule: free→anything, plus→vip only
    const shouldUpgrade =
      currentTier === "free" ||
      (currentTier === "plus" && v.requestedTier === "vip");

    if (shouldUpgrade) {
      await sql`
        UPDATE users
        SET tier = ${v.requestedTier}, updated_at = ${now}
        WHERE id = ${v.userId}
      `;
    }

    const updated = await sql`
      SELECT * FROM fansly_verifications WHERE id = ${v.id}
    `;
    return { ok: true, verification: rowToVer(updated[0]) };
  }

  // JSON fallback
  const db = await readDb();
  const v = db.verifications.find((x) => x.code === params.code);
  if (!v) return { ok: false, error: "Code not found." };
  if (v.status !== "pending") {
    return { ok: false, error: `Code already ${v.status}.` };
  }
  if (new Date(v.expiresAt) < new Date(now)) {
    v.status = "expired";
    await writeDb(db);
    return { ok: false, error: "Code expired." };
  }

  v.status = "approved";
  v.approvedAt = now;
  v.expiresAt = grantsUntil;
  v.activatedTier = v.requestedTier;
  await writeDb(db);
  await applyTierUpgrade(v.userId, v.requestedTier);
  return { ok: true, verification: v };
}

/** Admin: revoke an approved verification (immediate tier downgrade check). */
export async function revokeCode(params: {
  code: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (usePostgres()) {
    await ensurePgSchema();
    const sql = await getSql();
    if (!sql) return { ok: false, error: "DB connection failed." };
    const rows = await sql`
      UPDATE fansly_verifications
      SET status = 'revoked'
      WHERE code = ${params.code} AND status IN ('approved', 'issued')
      RETURNING *
    `;
    if (rows.length === 0) {
      return { ok: false, error: "No active approval found for this code." };
    }
    return { ok: true };
  }
  const db = await readDb();
  const v = db.verifications.find(
    (x) =>
      x.code === params.code &&
      (x.status === "approved" || x.status === "issued"),
  );
  if (!v) return { ok: false, error: "No active approval found." };
  v.status = "revoked";
  await writeDb(db);
  return { ok: true };
}

/** How long an admin-issued code can sit unused before it expires (ms). */
export const ISSUED_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days to redeem

/**
 * Admin: create a grant code to DM on Fansly.
 * Fan redeems it on signup or Account → gets tier for 30 days.
 */
export async function issueGrantCode(params: {
  tier: MembershipTier;
  fanslyUsername?: string;
}): Promise<
  | { ok: true; verification: FanslyVerification }
  | { ok: false; error: string }
> {
  if (params.tier !== "plus" && params.tier !== "vip") {
    return { ok: false, error: "Tier must be Plus or VIP." };
  }

  const now = nowUtc();
  const id = crypto.randomUUID();
  const code = makeCode();
  const expiresAt = addMs(now, ISSUED_TTL_MS);
  const fanslyUsername = (params.fanslyUsername || "").trim().toLowerCase();

  if (usePostgres()) {
    await ensurePgSchema();
    const sql = await getSql();
    if (!sql) return { ok: false, error: "DB connection failed." };

    await sql`
      INSERT INTO fansly_verifications
        (id, user_id, fansly_username, requested_tier, code, status, created_at, expires_at)
      VALUES
        (${id}, ${""}, ${fanslyUsername}, ${params.tier}, ${code}, 'issued',
         ${now}, ${expiresAt})
    `;
    const inserted = await sql`
      SELECT * FROM fansly_verifications WHERE id = ${id}
    `;
    return { ok: true, verification: rowToVer(inserted[0]) };
  }

  const db = await readDb();
  const ver: FanslyVerification = {
    id,
    userId: "",
    fanslyUsername,
    requestedTier: params.tier,
    code,
    status: "issued",
    createdAt: now,
    expiresAt,
  };
  db.verifications.push(ver);
  await writeDb(db);
  return { ok: true, verification: ver };
}

/** Admin: list unredeemed issued codes (not yet claimed by a user). */
export async function listIssued(): Promise<FanslyVerification[]> {
  const now = nowUtc();
  if (usePostgres()) {
    await ensurePgSchema();
    const sql = await getSql();
    if (!sql) return [];
    await sql`
      UPDATE fansly_verifications
      SET status = 'expired'
      WHERE status = 'issued' AND expires_at < ${now}
    `;
    const rows = await sql`
      SELECT * FROM fansly_verifications
      WHERE status = 'issued'
      ORDER BY created_at DESC
      LIMIT 50
    `;
    return rows.map(rowToVer);
  }
  const db = await readDb();
  let dirty = false;
  for (const v of db.verifications) {
    if (v.status === "issued" && new Date(v.expiresAt) < new Date(now)) {
      v.status = "expired";
      dirty = true;
    }
  }
  if (dirty) await writeDb(db);
  return db.verifications
    .filter((v) => v.status === "issued")
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 50);
}

/** Normalize fan-typed codes: spaces stripped, uppercased, hyphens fixed. */
export function normalizeGrantCode(raw: string): string {
  let c = (raw || "").trim().toUpperCase().replace(/\s+/g, "");
  // Allow KH3V925LXF → KH-3V92-5LXF
  if (/^KH[A-Z0-9]{8}$/.test(c)) {
    c = `KH-${c.slice(2, 6)}-${c.slice(6, 10)}`;
  }
  return c;
}

/**
 * Fan redeems an admin-issued code (or any unused issued code).
 * Binds to their account and grants tier for 30 days.
 */
export async function redeemGrantCode(params: {
  code: string;
  userId: string;
}): Promise<
  | { ok: true; verification: FanslyVerification; tier: MembershipTier }
  | { ok: false; error: string }
> {
  const code = normalizeGrantCode(params.code);
  const now = nowUtc();
  const grantsUntil = addMs(now, CODE_TTL_MS);

  if (!code) return { ok: false, error: "Enter a code." };
  if (!params.userId) return { ok: false, error: "Not logged in." };

  if (usePostgres()) {
    await ensurePgSchema();
    const sql = await getSql();
    if (!sql) return { ok: false, error: "DB connection failed." };

    const rows = await sql`
      SELECT * FROM fansly_verifications
      WHERE UPPER(TRIM(code)) = ${code}
      LIMIT 1
    `;
    if (rows.length === 0) {
      return { ok: false, error: "Code not found. Check and try again." };
    }

    const v = rowToVer(rows[0]);
    if (v.status === "approved") {
      return { ok: false, error: "This code was already used." };
    }
    if (v.status === "revoked" || v.status === "expired") {
      return { ok: false, error: `Code is ${v.status}. Ask for a new one.` };
    }
    if (v.status === "pending") {
      return {
        ok: false,
        error:
          "That code is waiting for admin approval on Fansly, not a signup grant. DM it to @Rob if you haven’t.",
      };
    }
    if (v.status !== "issued") {
      return { ok: false, error: "Code cannot be redeemed." };
    }
    if (new Date(v.expiresAt) < new Date(now)) {
      await sql`
        UPDATE fansly_verifications SET status = 'expired' WHERE id = ${v.id}
      `;
      return { ok: false, error: "Code expired. Ask for a new one." };
    }

    await sql`
      UPDATE fansly_verifications SET
        status = 'approved',
        user_id = ${params.userId},
        approved_at = ${now},
        expires_at = ${grantsUntil},
        activated_tier = ${v.requestedTier}
      WHERE id = ${v.id}
    `;

    await applyTierUpgrade(params.userId, v.requestedTier);

    const updated = await sql`
      SELECT * FROM fansly_verifications WHERE id = ${v.id}
    `;
    return {
      ok: true,
      verification: rowToVer(updated[0]),
      tier: v.requestedTier,
    };
  }

  // JSON fallback
  const db = await readDb();
  const v = db.verifications.find((x) => x.code === code);
  if (!v) return { ok: false, error: "Code not found. Check and try again." };
  if (v.status === "approved") {
    return { ok: false, error: "This code was already used." };
  }
  if (v.status === "revoked" || v.status === "expired") {
    return { ok: false, error: `Code is ${v.status}. Ask for a new one.` };
  }
  if (v.status === "pending") {
    return {
      ok: false,
      error:
        "That code is waiting for admin approval, not a signup grant. DM it to @Rob if you haven’t.",
    };
  }
  if (v.status !== "issued") {
    return { ok: false, error: "Code cannot be redeemed." };
  }
  if (new Date(v.expiresAt) < new Date(now)) {
    v.status = "expired";
    await writeDb(db);
    return { ok: false, error: "Code expired. Ask for a new one." };
  }

  v.status = "approved";
  v.userId = params.userId;
  v.approvedAt = now;
  v.expiresAt = grantsUntil;
  v.activatedTier = v.requestedTier;
  await writeDb(db);
  await applyTierUpgrade(params.userId, v.requestedTier);
  return { ok: true, verification: v, tier: v.requestedTier };
}
