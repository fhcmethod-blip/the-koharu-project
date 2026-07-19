/**
 * Real-person chat store — "chat with the real me" feature.
 * Subscribers chat with patchy83 (Rob) instead of AI companions.
 * Messages are stored until Rob responds via the desktop admin app.
 *
 * Postgres (Neon) when DATABASE_URL is set, else JSON file fallback.
 */

import { promises as fs } from "fs";
import * as path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const REAL_CHAT_FILE = path.join(DATA_DIR, "real-chat.json");

export type RealMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  direction: "incoming" | "outgoing"; // incoming = from subscriber, outgoing = from Rob
  read: boolean;
  createdAt: string;
};

export type RealConversation = {
  id: string;
  subscriberId: string;
  subscriberName: string;
  subscriberEmail: string;
  lastMessage: string;
  unreadCount: number;
  updatedAt: string;
  createdAt: string;
};

type RealChatDb = {
  conversations: RealConversation[];
  messages: RealMessage[];
};

let pgReady: Promise<void> | null = null;

function usePostgres(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

async function getSql() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  const postgres = (await import("postgres")).default;
  const g = globalThis as unknown as {
    __kohar_realchat_sql?: ReturnType<typeof postgres>;
  };
  if (!g.__kohar_realchat_sql) {
    const needsSsl =
      /neon\.tech|sslmode=require|amazonaws\.com/i.test(url) ||
      process.env.PGSSL === "1";
    g.__kohar_realchat_sql = postgres(url, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 15,
      ...(needsSsl ? { ssl: "require" as const } : {}),
    });
  }
  return g.__kohar_realchat_sql;
}

async function ensurePgSchema() {
  if (pgReady) return pgReady;
  pgReady = (async () => {
    const sql = await getSql();
    if (!sql) return;

    await sql`
      CREATE TABLE IF NOT EXISTS real_chat_conversations (
        id TEXT PRIMARY KEY,
        subscriber_id TEXT NOT NULL,
        subscriber_name TEXT NOT NULL,
        subscriber_email TEXT NOT NULL,
        last_message TEXT NOT NULL DEFAULT '',
        unread_count INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS real_chat_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        content TEXT NOT NULL,
        direction TEXT NOT NULL DEFAULT 'incoming',
        read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS rc_conv_sub_idx ON real_chat_conversations (subscriber_id)`;
    await sql`CREATE INDEX IF NOT EXISTS rc_conv_updated_idx ON real_chat_conversations (updated_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS rc_msg_conv_idx ON real_chat_messages (conversation_id)`;
    await sql`CREATE INDEX IF NOT EXISTS rc_msg_created_idx ON real_chat_messages (created_at ASC)`;
  })();
  return pgReady;
}

// --- JSON fallback ---

async function readDb(): Promise<RealChatDb> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(REAL_CHAT_FILE, "utf8");
    return JSON.parse(raw) as RealChatDb;
  } catch {
    return { conversations: [], messages: [] };
  }
}

async function writeDb(db: RealChatDb): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(REAL_CHAT_FILE, JSON.stringify(db, null, 2), "utf8");
}

function nowUtc(): string {
  return new Date().toISOString();
}

// --- Public API ---

/** Get or create a conversation for a subscriber. */
export async function getOrCreateConversation(params: {
  subscriberId: string;
  subscriberName: string;
  subscriberEmail: string;
}): Promise<RealConversation> {
  if (usePostgres()) {
    await ensurePgSchema();
    const sql = await getSql();
    if (!sql) throw new Error("DB unavailable");

    const existing = await sql`
      SELECT * FROM real_chat_conversations
      WHERE subscriber_id = ${params.subscriberId}
      LIMIT 1
    `;
    if (existing.length > 0) {
      const r = existing[0];
      return {
        id: String(r.id),
        subscriberId: String(r.subscriber_id),
        subscriberName: String(r.subscriber_name),
        subscriberEmail: String(r.subscriber_email),
        lastMessage: String(r.last_message),
        unreadCount: Number(r.unread_count),
        updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
        createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      };
    }

    const id = crypto.randomUUID();
    const now = nowUtc();
    await sql`
      INSERT INTO real_chat_conversations
        (id, subscriber_id, subscriber_name, subscriber_email, updated_at, created_at)
      VALUES (${id}, ${params.subscriberId}, ${params.subscriberName}, ${params.subscriberEmail}, ${now}, ${now})
    `;
    return {
      id,
      subscriberId: params.subscriberId,
      subscriberName: params.subscriberName,
      subscriberEmail: params.subscriberEmail,
      lastMessage: "",
      unreadCount: 0,
      updatedAt: now,
      createdAt: now,
    };
  }

  const db = await readDb();
  let conv = db.conversations.find((c) => c.subscriberId === params.subscriberId);
  if (!conv) {
    conv = {
      id: crypto.randomUUID(),
      subscriberId: params.subscriberId,
      subscriberName: params.subscriberName,
      subscriberEmail: params.subscriberEmail,
      lastMessage: "",
      unreadCount: 0,
      updatedAt: nowUtc(),
      createdAt: nowUtc(),
    };
    db.conversations.push(conv);
    await writeDb(db);
  }
  return conv;
}

/** Subscriber sends a message to Rob. */
export async function sendSubscriberMessage(params: {
  subscriberId: string;
  subscriberName: string;
  content: string;
}): Promise<RealMessage> {
  const conversation = await getOrCreateConversation({
    subscriberId: params.subscriberId,
    subscriberName: params.subscriberName,
    subscriberEmail: "",
  });

  const msg: RealMessage = {
    id: crypto.randomUUID(),
    conversationId: conversation.id,
    senderId: params.subscriberId,
    senderName: params.subscriberName,
    content: params.content.trim(),
    direction: "incoming",
    read: false,
    createdAt: nowUtc(),
  };

  if (usePostgres()) {
    await ensurePgSchema();
    const sql = await getSql();
    if (!sql) throw new Error("DB unavailable");

    await sql`
      INSERT INTO real_chat_messages
        (id, conversation_id, sender_id, sender_name, content, direction, read, created_at)
      VALUES (${msg.id}, ${msg.conversationId}, ${msg.senderId}, ${msg.senderName}, ${msg.content}, 'incoming', FALSE, ${msg.createdAt})
    `;
    await sql`
      UPDATE real_chat_conversations
      SET last_message = ${msg.content},
          unread_count = unread_count + 1,
          updated_at = ${msg.createdAt}
      WHERE id = ${msg.conversationId}
    `;
    return msg;
  }

  const db = await readDb();
  db.messages.push(msg);
  const conv = db.conversations.find((c) => c.id === msg.conversationId);
  if (conv) {
    conv.lastMessage = msg.content;
    conv.unreadCount++;
    conv.updatedAt = msg.createdAt;
  }
  await writeDb(db);
  return msg;
}

/** Rob sends a reply to a subscriber. */
export async function sendRobReply(params: {
  conversationId: string;
  content: string;
}): Promise<RealMessage> {
  const msg: RealMessage = {
    id: crypto.randomUUID(),
    conversationId: params.conversationId,
    senderId: "rob",
    senderName: "Rob",
    content: params.content.trim(),
    direction: "outgoing",
    read: true,
    createdAt: nowUtc(),
  };

  if (usePostgres()) {
    await ensurePgSchema();
    const sql = await getSql();
    if (!sql) throw new Error("DB unavailable");

    await sql`
      INSERT INTO real_chat_messages
        (id, conversation_id, sender_id, sender_name, content, direction, read, created_at)
      VALUES (${msg.id}, ${msg.conversationId}, ${msg.senderId}, ${msg.senderName}, ${msg.content}, 'outgoing', TRUE, ${msg.createdAt})
    `;
    // Mark incoming messages as read
    await sql`
      UPDATE real_chat_messages SET read = TRUE
      WHERE conversation_id = ${params.conversationId} AND direction = 'incoming' AND read = FALSE
    `;
    await sql`
      UPDATE real_chat_conversations
      SET last_message = ${msg.content},
          unread_count = 0,
          updated_at = ${msg.createdAt}
      WHERE id = ${params.conversationId}
    `;
    return msg;
  }

  const db = await readDb();
  db.messages.push(msg);
  for (const m of db.messages) {
    if (m.conversationId === params.conversationId && m.direction === "incoming") {
      m.read = true;
    }
  }
  const conv = db.conversations.find((c) => c.id === params.conversationId);
  if (conv) {
    conv.lastMessage = msg.content;
    conv.unreadCount = 0;
    conv.updatedAt = msg.createdAt;
  }
  await writeDb(db);
  return msg;
}

/** Get messages for a conversation (subscriber sees their own). */
export async function getConversationMessages(
  conversationId: string,
  subscriberId: string,
): Promise<RealMessage[]> {
  if (usePostgres()) {
    await ensurePgSchema();
    const sql = await getSql();
    if (!sql) return [];
    const rows = await sql`
      SELECT * FROM real_chat_messages
      WHERE conversation_id = ${conversationId}
      ORDER BY created_at ASC
      LIMIT 200
    `;
    return rows.map((r) => ({
      id: String(r.id),
      conversationId: String(r.conversation_id),
      senderId: String(r.sender_id),
      senderName: String(r.sender_name),
      content: String(r.content),
      direction: String(r.direction) as "incoming" | "outgoing",
      read: Boolean(r.read),
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    }));
  }

  const db = await readDb();
  return db.messages
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

/** Admin: list all conversations with unread counts. */
export async function listAllConversations(): Promise<RealConversation[]> {
  if (usePostgres()) {
    await ensurePgSchema();
    const sql = await getSql();
    if (!sql) return [];
    const rows = await sql`
      SELECT * FROM real_chat_conversations
      ORDER BY updated_at DESC
      LIMIT 50
    `;
    return rows.map((r) => ({
      id: String(r.id),
      subscriberId: String(r.subscriber_id),
      subscriberName: String(r.subscriber_name),
      subscriberEmail: String(r.subscriber_email),
      lastMessage: String(r.last_message),
      unreadCount: Number(r.unread_count),
      updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    }));
  }

  const db = await readDb();
  return [...db.conversations]
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 50);
}

/** Admin: get all messages for a conversation. */
export async function getMessagesForAdmin(
  conversationId: string,
): Promise<RealMessage[]> {
  if (usePostgres()) {
    await ensurePgSchema();
    const sql = await getSql();
    if (!sql) return [];
    const rows = await sql`
      SELECT * FROM real_chat_messages
      WHERE conversation_id = ${conversationId}
      ORDER BY created_at ASC
      LIMIT 200
    `;
    return rows.map((r) => ({
      id: String(r.id),
      conversationId: String(r.conversation_id),
      senderId: String(r.sender_id),
      senderName: String(r.sender_name),
      content: String(r.content),
      direction: String(r.direction) as "incoming" | "outgoing",
      read: Boolean(r.read),
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    }));
  }

  const db = await readDb();
  return db.messages
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

/** Admin: get total unread count across all conversations. */
export async function getTotalUnread(): Promise<number> {
  if (usePostgres()) {
    await ensurePgSchema();
    const sql = await getSql();
    if (!sql) return 0;
    const rows = await sql`
      SELECT COALESCE(SUM(unread_count), 0) as total
      FROM real_chat_conversations
    `;
    return Number(rows[0]?.total ?? 0);
  }
  const db = await readDb();
  return db.conversations.reduce((sum, c) => sum + c.unreadCount, 0);
}