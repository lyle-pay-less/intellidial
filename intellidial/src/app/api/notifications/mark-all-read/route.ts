import { NextRequest, NextResponse } from "next/server";
import { markAllNotificationsRead } from "@/lib/data/store";

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read for the authenticated user.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 401 });
    }

    const count = await markAllNotificationsRead(userId);

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("[Notifications API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to mark all notifications as read" },
      { status: 500 }
    );
  }
}
