import { NextRequest, NextResponse } from "next/server";
import { createInvitation, getInvitationByEmail, getUserOrganization, getOrganization } from "@/lib/data/store";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { sendInvitationEmail } from "@/lib/email/resend";

/**
 * POST /api/team/invite
 * Creates an invitation and sends email via SMTP (if configured).
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

    // Get organization name and inviter info
    const org = await getOrganization(orgId);
    const orgName = org?.name || "your organization";
    
    // Get inviter name/email from Firebase Auth
    let inviterName = "A team member";
    try {
      const auth = getFirebaseAdminAuth();
      const inviterUser = await auth.getUser(userId);
      inviterName = inviterUser.displayName || inviterUser.email || inviterName;
    } catch (error) {
      console.warn("[Invite] Could not get inviter info from Firebase Auth:", error);
    }

    // Send email (if Resend is configured, otherwise log)
    let emailSent = false;
    let emailError: string | null = null;
    try {
      await sendInvitationEmail(email, inviteUrl, inviterName, orgName, role);
      emailSent = true;
      console.log(`[Invite] Email successfully sent to ${email}`);
    } catch (error) {
      // If email fails, log but don't fail the invitation (invite URL can be shared manually)
      emailError = error instanceof Error ? error.message : String(error);
      console.error("[Invite] Email sending failed (invitation still created):", error);
      console.error("[Invite] Error details:", JSON.stringify(error, null, 2));
      console.log(`[Invite] Manual invite URL: ${inviteUrl}`);
    }

    return NextResponse.json({
      success: true,
      message: `Invite sent to ${email}`,
      emailSent,
      emailError: emailError || undefined,
      token, // For testing/debugging
    });
  } catch (error) {
    console.error("Invite error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send invitation" },
      { status: 500 }
    );
  }
}
