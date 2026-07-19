import { NextRequest, NextResponse } from "next/server";
import { isOwnerEmail } from "@/lib/access";
import { getSessionFromCookies } from "@/lib/auth/session";
import {
  listAllConversations,
  getMessagesForAdmin,
  sendRobReply,
  getTotalUnread,
} from "@/lib/real-chat-store";

export const runtime = "nodejs";

/**
 * GET /api/admin/chat
 * List all conversations (owner only).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session || !isOwnerEmail(session.email)) {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }

    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversationId");

    if (conversationId) {
      const messages = await getMessagesForAdmin(conversationId);
      return NextResponse.json({ ok: true, messages });
    }

    const [conversations, totalUnread] = await Promise.all([
      listAllConversations(),
      getTotalUnread(),
    ]);

    return NextResponse.json({
      ok: true,
      totalUnread,
      conversations,
    });
  } catch (e) {
    console.error("admin/chat", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not load." }, { status: 500 });
  }
}

/**
 * POST /api/admin/chat
 * Rob sends a reply to a conversation.
 * Body: { conversationId: string, content: string }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session || !isOwnerEmail(session.email)) {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }

    const body = (await req.json()) as {
      conversationId?: string;
      content?: string;
    };
    const conversationId = (body.conversationId || "").trim();
    const content = (body.content || "").trim();

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversationId." }, { status: 400 });
    }
    if (!content || content.length > 2000) {
      return NextResponse.json(
        { error: "Message must be 1-2000 characters." },
        { status: 400 },
      );
    }

    const msg = await sendRobReply({ conversationId, content });
    return NextResponse.json({ ok: true, message: msg });
  } catch (e) {
    console.error("admin/chat/reply", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not send." }, { status: 500 });
  }
}