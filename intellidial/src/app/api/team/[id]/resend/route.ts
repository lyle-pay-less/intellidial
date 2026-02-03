import { NextRequest, NextResponse } from "next/server";
import { getUserOrganization, getInvitation } from "@/lib/data/store";

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

  // TODO: Send actual email (see docs/backlog/EMAIL_SENDING.md)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteUrl = `${baseUrl}/invite/${token}`;
  console.log(`[Resend invite] ${invitation.email} -> ${inviteUrl}`);

  return NextResponse.json({ success: true });
}
