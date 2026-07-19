import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { listPpvItems, getUserPurchases, canUserViewPpv } from "@/lib/ppv-store";
import { findUserById } from "@/lib/auth/user-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    const items = await listPpvItems();

    if (!session?.sub) {
      // Not logged in - show all items as locked
      return NextResponse.json({
        items: items.map((item) => ({
          ...item,
          canView: false,
          purchased: false,
        })),
      });
    }

    const user = await findUserById(session.sub);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const purchases = await getUserPurchases(user.id);
    const purchasedIds = new Set(purchases.map((p) => p.ppvItemId));

    const itemsWithAccess = await Promise.all(
      items.map(async (item) => {
        const purchased = purchasedIds.has(item.id);
        const canView = await canUserViewPpv(user.id, user.tier, item);
        return {
          ...item,
          canView,
          purchased,
        };
      })
    );

    return NextResponse.json({ items: itemsWithAccess });
  } catch (error) {
    console.error("PPV list error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list PPV items" },
      { status: 500 }
    );
  }
}
