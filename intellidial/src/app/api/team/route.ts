import { NextRequest, NextResponse } from "next/server";
import { getTeamMembers, getUserOrganization } from "@/lib/data/store";

/**
 * GET /api/team
 * Returns team members for the authenticated user's organization.
 * Requires x-user-id header.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 401 });
    }

    const orgId = await getUserOrganization(userId);
    if (!orgId) {
      return NextResponse.json({ members: [] });
    }

    const members = await getTeamMembers(orgId, {
      requestorEmail: req.headers.get("x-user-email") ?? undefined,
      requestorDisplayName: req.headers.get("x-user-display-name") ?? undefined,
      requestorId: userId,
    });
    return NextResponse.json({ members });
  } catch (error) {
    console.error("Team fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch team" },
      { status: 500 }
    );
  }
}
