import { NextRequest, NextResponse } from "next/server";
import { createInvitation, getInvitationByEmail, getUserOrganization } from "@/lib/data/store";

/**
 * POST /api/team/invite
 * Creates an invitation and sends email (mock for now).
 * Requires: user to be authenticated and have orgId
 */
export async function POST(req: NextRequest) {
  try {
    const { email, role } = await req.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 401 }
      );
    }

    // Get user's organization
    const orgId = await getUserOrganization(userId);
    if (!orgId) {
      return NextResponse.json(
        { error: "User is not part of an organization" },
        { status: 403 }
      );
    }

    // Check if invitation already exists
    const existing = getInvitationByEmail(email);
    if (existing && !existing.accepted) {
      return NextResponse.json(
        { error: "An invitation has already been sent to this email" },
        { status: 400 }
      );
    }

    // Create invitation (persists to Firestore if configured)
    const token = await createInvitation({
      email: email.trim(),
      role: role as "admin" | "operator" | "viewer",
      orgId,
      invitedBy: userId,
    });

    // Generate invitation URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteUrl = `${baseUrl}/invite/${token}`;

    // TODO: Send email (mock for now)
    // In production: await sendInvitationEmail(email, inviteUrl, role);
    console.log(`[MOCK EMAIL] Invitation sent to ${email}`);
    console.log(`[MOCK EMAIL] Invite URL: ${inviteUrl}`);
    console.log(`[MOCK EMAIL] Role: ${role}`);

    return NextResponse.json({
      success: true,
      message: `Invite sent to ${email}`,
      token, // For testing - remove in production
    });
  } catch (error) {
    console.error("Invite error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send invitation" },
      { status: 500 }
    );
  }
}
