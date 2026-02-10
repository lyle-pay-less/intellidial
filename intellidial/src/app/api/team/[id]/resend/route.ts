import { NextRequest, NextResponse } from "next/server";
import { getUserOrganization, getInvitation, getOrganization } from "@/lib/data/store";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { sendInvitationEmail } from "@/lib/email/resend";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 401 });
  }

  const { id: memberId } = await params;
  const orgId = await getUserOrganization(userId);
  if (!orgId) {
    return NextResponse.json({ error: "Not part of an organization" }, { status: 403 });
  }

  // memberId for invited users is the invitation token
  const token = memberId.startsWith("inv_") ? memberId : null;
  if (!token) {
    return NextResponse.json({ error: "Invalid invite" }, { status: 400 });
  }

  const invitation = await getInvitation(token);
  if (!invitation || invitation.accepted) {
    return NextResponse.json({ error: "Invitation not found or already accepted" }, { status: 404 });
  }

  // Generate invitation URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteUrl = `${baseUrl}/invite/${token}`;

  // Get organization name and inviter info
  const org = await getOrganization(invitation.orgId);
  const orgName = org?.name || "your organization";
  
  let inviterName = "A team member";
  if (invitation.invitedBy) {
    try {
      const auth = getFirebaseAdminAuth();
      const inviterUser = await auth.getUser(invitation.invitedBy);
      inviterName = inviterUser.displayName || inviterUser.email || inviterName;
    } catch (error) {
      console.warn("[Resend] Could not get inviter info:", error);
    }
  }

  // Send email (if SMTP is configured, otherwise log)
  try {
    await sendInvitationEmail(invitation.email, inviteUrl, inviterName, orgName, invitation.role);
  } catch (error) {
    console.error("[Resend] Email sending failed:", error);
    console.log(`[Resend] Manual invite URL: ${inviteUrl}`);
  }

  return NextResponse.json({ success: true });
}
