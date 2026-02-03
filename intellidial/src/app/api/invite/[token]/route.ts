import { NextRequest, NextResponse } from "next/server";
import { getInvitation, getOrganization } from "@/lib/data/store";

/**
 * GET /api/invite/[token]
 * Returns invitation details (public, no auth required).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    const invitation = await getInvitation(token);
    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date(invitation.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    // Check if already accepted
    if (invitation.accepted) {
      return NextResponse.json(
        { error: "Invitation has already been accepted" },
        { status: 400 }
      );
    }

    // Get organization name
    const org = await getOrganization(invitation.orgId);
    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      email: invitation.email,
      role: invitation.role,
      orgName: org.name,
      expiresAt: invitation.expiresAt,
    });
  } catch (error) {
    console.error("Invite fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch invitation" },
      { status: 500 }
    );
  }
}
