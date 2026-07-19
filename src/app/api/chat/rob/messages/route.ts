import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import {
  getOrCreateConversation,
  sendSubscriberMessage,
  getConversationMessages,
} from "@/lib/real-chat-store";

export const runtime = "nodejs";

/**
 * GET /api/chat/rob/messages
 * Subscriber fetches their conversation with Rob.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Not logged in." }, { status: 401 });
    }

    // Require at least Plus tier to chat with real Rob
    const tier = session.tier || "free";
    if (tier === "free") {
      return NextResponse.json(
        { error: "Chat with Rob requires a Touch or Claimed membership." },
        { status: 403 },
      );
    }

    const conv = await getOrCreateConversation({
      subscriberId: session.sub,
      subscriberName: session.displayName || session.email,
      subscriberEmail: session.email,
    });

    const messages = await getConversationMessages(conv.id, session.sub);

    return NextResponse.json({
      ok: true,
      conversation: conv,
      messages,
    });
  } catch (e) {
    console.error("chat/rob/get", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not load messages." }, { status: 500 });
  }
}

/**
 * POST /api/chat/rob/messages
 * Subscriber sends a message to Rob.
 * Body: { content: string }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Not logged in." }, { status: 401 });
    }

    const tier = session.tier || "free";
    if (tier === "free") {
      return NextResponse.json(
        { error: "Chat with Rob requires a Touch or Claimed membership." },
        { status: 403 },
      );
    }

    const body = (await req.json()) as { content?: string };
    const content = (body.content || "").trim();
    if (!content || content.length > 2000) {
      return NextResponse.json(
        { error: "Message must be 1-2000 characters." },
        { status: 400 },
      );
    }

    const msg = await sendSubscriberMessage({
      subscriberId: session.sub,
      subscriberName: session.displayName || session.email,
      content,
    });

    return NextResponse.json({ ok: true, message: msg });
  } catch (e) {
    console.error("chat/rob/send", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: "Could not send message." },
      { status: 500 },
    );
  }
}