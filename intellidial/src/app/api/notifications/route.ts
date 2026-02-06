import { NextRequest, NextResponse } from "next/server";
import { getNotifications, getUserOrganization } from "@/lib/data/store";

/**
 * GET /api/notifications
 * Returns notifications for the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as "call_completed" | "call_failed" | "data_missing" | "project_complete" | "usage_warning" | null;
    const readParam = searchParams.get("read");
    const read = readParam === "true" ? true : readParam === "false" ? false : undefined;
    const limit = parseInt(searchParams.get("limit") ?? "100", 10);

    const notifications = await getNotifications(userId, {
      limit,
      type: type ?? undefined,
      read,
    });

    const unreadCount = notifications.filter((n) => !n.read).length;

    return NextResponse.json({
      notifications,
      unreadCount,
      total: notifications.length,
    });
  } catch (error) {
    console.error("[Notifications API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
