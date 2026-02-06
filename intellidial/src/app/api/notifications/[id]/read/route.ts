import { NextRequest, NextResponse } from "next/server";
import { markNotificationRead } from "@/lib/data/store";

/**
 * PATCH /api/notifications/[id]/read
 * Mark a notification as read.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 401 });
    }

    const { id } = await params;
    const ok = await markNotificationRead(id, userId);

    if (!ok) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Notifications API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}
