/**
 * PPV (Pay-Per-View) content persistence
 * 
 * - If DATABASE_URL is set → Postgres (Neon)
 * - Else → local JSON file at data/ppv.json (dev)
 * 
 * Two tables:
 * - ppv_items: the content itself (videos/photos with prices)
 * - ppv_purchases: who bought what (one-time unlocks)
 */

import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import * as path from "path";
import type { MembershipTier } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const PPV_FILE = path.join(DATA_DIR, "ppv.json");

export type PpvTierRequirement = "any" | "plus" | "vip";

export interface PpvItem {
  id: string;
  title: string;
  description: string;
  mediaUrl: string;
  thumbnailUrl: string;
  priceCents: number;
  tierRequired: PpvTierRequirement;
  createdAt: string;
}

export interface PpvPurchase {
  id: string;
  userId: string;
  ppvItemId: string;
  stripePaymentId: string;
  amountCents: number;
  purchasedAt: string;
}

let pgReady: Promise<void> | null = null;

function usePostgres(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

async function getSql() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  const postgres = (await import("postgres")).default;
  const g = globalThis as unknown as {
    __kohar_ppv_sql?: ReturnType<typeof postgres>;
  };
  if (!g.__kohar_ppv_sql) {
    const needsSsl =
      /neon\.tech|sslmode=require|amazonaws\.com/i.test(url) ||
      process.env.PGSSL === "1";
    g.__kohar_ppv_sql = postgres(url, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 15,
      ...(needsSsl ? { ssl: "require" as const } : {}),
    });
  }
  return g.__kohar_ppv_sql;
}

async function ensurePgSchema() {
  if (pgReady) return pgReady;
  pgReady = (async () => {
    const sql = await getSql();
    if (!sql) return;
    
    // PPV items table
    await sql`
      CREATE TABLE IF NOT EXISTS ppv_items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        media_url TEXT NOT NULL,
        thumbnail_url TEXT NOT NULL,
        price_cents INTEGER NOT NULL,
        tier_required TEXT NOT NULL DEFAULT 'any',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS ppv_items_created_idx ON ppv_items (created_at DESC)`;
    
    // PPV purchases table
    await sql`
      CREATE TABLE IF NOT EXISTS ppv_purchases (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        ppv_item_id TEXT NOT NULL,
        stripe_payment_id TEXT NOT NULL UNIQUE,
        amount_cents INTEGER NOT NULL,
        purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS ppv_purchases_user_idx ON ppv_purchases (user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS ppv_purchases_item_idx ON ppv_purchases (ppv_item_id)`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS ppv_purchases_user_item_idx ON ppv_purchases (user_id, ppv_item_id)`;
  })();
  return pgReady;
}

function rowToPpvItem(r: Record<string, unknown>): PpvItem {
  return {
    id: String(r.id),
    title: String(r.title),
    description: String(r.description),
    mediaUrl: String(r.media_url),
    thumbnailUrl: String(r.thumbnail_url),
    priceCents: Number(r.price_cents),
    tierRequired: (String(r.tier_required || "any") as PpvTierRequirement) || "any",
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : String(r.created_at ?? new Date().toISOString()),
  };
}

function rowToPpvPurchase(r: Record<string, unknown>): PpvPurchase {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    ppvItemId: String(r.ppv_item_id),
    stripePaymentId: String(r.stripe_payment_id),
    amountCents: Number(r.amount_cents),
    purchasedAt:
      r.purchased_at instanceof Date
        ? r.purchased_at.toISOString()
        : String(r.purchased_at ?? new Date().toISOString()),
  };
}

// File-based fallback (dev mode)
async function readPpvFile(): Promise<{ items: PpvItem[]; purchases: PpvPurchase[] }> {
  try {
    const raw = await fs.readFile(PPV_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      purchases: Array.isArray(parsed.purchases) ? parsed.purchases : [],
    };
  } catch {
    return { items: [], purchases: [] };
  }
}

async function writePpvFile(data: { items: PpvItem[]; purchases: PpvPurchase[] }) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${PPV_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, PPV_FILE);
}

// === Public API ===

export async function createPpvItem(input: {
  title: string;
  description: string;
  mediaUrl: string;
  thumbnailUrl: string;
  priceCents: number;
  tierRequired?: PpvTierRequirement;
}): Promise<PpvItem> {
  const item: PpvItem = {
    id: randomUUID(),
    title: input.title.trim(),
    description: input.description.trim(),
    mediaUrl: input.mediaUrl.trim(),
    thumbnailUrl: input.thumbnailUrl.trim(),
    priceCents: input.priceCents,
    tierRequired: input.tierRequired || "any",
    createdAt: new Date().toISOString(),
  };

  if (usePostgres()) {
    await ensurePgSchema();
    const sql = await getSql();
    if (!sql) throw new Error("Database unavailable");
    await sql`
      INSERT INTO ppv_items (id, title, description, media_url, thumbnail_url, price_cents, tier_required, created_at)
      VALUES (${item.id}, ${item.title}, ${item.description}, ${item.mediaUrl}, ${item.thumbnailUrl}, ${item.priceCents}, ${item.tierRequired}, ${item.createdAt})
    `;
    return item;
  }

  const data = await readPpvFile();
  data.items.push(item);
  await writePpvFile(data);
  return item;
}

export async function listPpvItems(): Promise<PpvItem[]> {
  if (usePostgres()) {
    await ensurePgSchema();
    const sql = await getSql();
    if (!sql) return [];
    const rows = await sql`SELECT * FROM ppv_items ORDER BY created_at DESC`;
    return rows.map(rowToPpvItem);
  }
  const data = await readPpvFile();
  return data.items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getPpvItem(id: string): Promise<PpvItem | null> {
  if (usePostgres()) {
    await ensurePgSchema();
    const sql = await getSql();
    if (!sql) return null;
    const rows = await sql`SELECT * FROM ppv_items WHERE id = ${id} LIMIT 1`;
    return rows[0] ? rowToPpvItem(rows[0] as Record<string, unknown>) : null;
  }
  const data = await readPpvFile();
  return data.items.find((i) => i.id === id) ?? null;
}

export async function recordPpvPurchase(input: {
  userId: string;
  ppvItemId: string;
  stripePaymentId: string;
  amountCents: number;
}): Promise<PpvPurchase> {
  const purchase: PpvPurchase = {
    id: randomUUID(),
    userId: input.userId,
    ppvItemId: input.ppvItemId,
    stripePaymentId: input.stripePaymentId,
    amountCents: input.amountCents,
    purchasedAt: new Date().toISOString(),
  };

  if (usePostgres()) {
    await ensurePgSchema();
    const sql = await getSql();
    if (!sql) throw new Error("Database unavailable");
    await sql`
      INSERT INTO ppv_purchases (id, user_id, ppv_item_id, stripe_payment_id, amount_cents, purchased_at)
      VALUES (${purchase.id}, ${purchase.userId}, ${purchase.ppvItemId}, ${purchase.stripePaymentId}, ${purchase.amountCents}, ${purchase.purchasedAt})
    `;
    return purchase;
  }

  const data = await readPpvFile();
  // Check for duplicate (idempotency)
  if (data.purchases.some((p) => p.stripePaymentId === purchase.stripePaymentId)) {
    return purchase; // Already recorded
  }
  data.purchases.push(purchase);
  await writePpvFile(data);
  return purchase;
}

export async function getUserPurchases(userId: string): Promise<PpvPurchase[]> {
  if (usePostgres()) {
    await ensurePgSchema();
    const sql = await getSql();
    if (!sql) return [];
    const rows = await sql`SELECT * FROM ppv_purchases WHERE user_id = ${userId}`;
    return rows.map(rowToPpvPurchase);
  }
  const data = await readPpvFile();
  return data.purchases.filter((p) => p.userId === userId);
}

export async function hasUserPurchased(userId: string, ppvItemId: string): Promise<boolean> {
  if (usePostgres()) {
    await ensurePgSchema();
    const sql = await getSql();
    if (!sql) return false;
    const rows = await sql`SELECT 1 FROM ppv_purchases WHERE user_id = ${userId} AND ppv_item_id = ${ppvItemId} LIMIT 1`;
    return rows.length > 0;
  }
  const data = await readPpvFile();
  return data.purchases.some((p) => p.userId === userId && p.ppvItemId === ppvItemId);
}

/**
 * Check if a user can view a PPV item (either they purchased it, or it's free/included in their tier)
 */
export async function canUserViewPpv(
  userId: string,
  userTier: MembershipTier,
  item: PpvItem
): Promise<boolean> {
  // Already purchased?
  if (await hasUserPurchased(userId, item.id)) {
    return true;
  }

  // Check tier requirement (internally: plus=Touch, vip=Claimed)
  if (item.tierRequired === "vip" && userTier !== "vip") {
    return false;
  }
  if (item.tierRequired === "plus" && userTier !== "plus" && userTier !== "vip") {
    return false;
  }

  return false; // Must purchase
}

export async function probePpvStore(): Promise<{
  mode: "postgres" | "file";
  ok: boolean;
  error?: string;
}> {
  const mode = usePostgres() ? "postgres" : "file";
  if (mode === "file") {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      return { mode, ok: true };
    } catch (e) {
      return { mode, ok: false, error: e instanceof Error ? e.message : "file store error" };
    }
  }
  try {
    await ensurePgSchema();
    const sql = await getSql();
    if (!sql) return { mode, ok: false, error: "no connection" };
    await sql`SELECT 1 as ok`;
    return { mode, ok: true };
  } catch (e) {
    return { mode, ok: false, error: e instanceof Error ? e.message : "postgres error" };
  }
}
