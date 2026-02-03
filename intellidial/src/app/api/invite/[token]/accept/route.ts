import { NextRequest, NextResponse } from "next/server";
import { acceptInvitation } from "@/lib/data/store";

/**
 * POST /api/invite/[token]/accept
 * Accepts an invitation and links user to organization.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const result = acceptInvitation(token, userId);
    if (!result) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      organizationId: result.orgId,
      role: result.role,
    });
  } catch (error) {
    console.error("Invite accept error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to accept invitation" },
      { status: 500 }
    );
  }
}
