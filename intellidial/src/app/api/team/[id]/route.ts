import { NextRequest, NextResponse } from "next/server";
import { getUserOrganization, getOrganization, updateTeamMemberRole, removeTeamMember, suspendTeamMember } from "@/lib/data/store";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 401 });
  }

  const { id: memberId } = await params;
  const body = await request.json();
  const { role } = body;

  if (!role || !["admin", "operator", "viewer"].includes(role)) {
    return NextResponse.json({ error: "Valid role is required" }, { status: 400 });
  }

  const orgId = await getUserOrganization(userId);
  if (!orgId) {
    return NextResponse.json({ error: "Not part of an organization" }, { status: 403 });
  }

  const org = await getOrganization(orgId);
  if (org?.ownerId === memberId) {
    return NextResponse.json({ error: "Cannot change owner role" }, { status: 400 });
  }

  const ok = await updateTeamMemberRole(orgId, memberId, role);
  if (!ok) {
    return NextResponse.json({ error: "Failed to update role" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 401 });
  }

  const { id: memberId } = await params;
  const body = await request.json();
  const { action } = body; // "suspend" or "unsuspend"

  if (!action || !["suspend", "unsuspend"].includes(action)) {
    return NextResponse.json({ error: "Valid action (suspend/unsuspend) is required" }, { status: 400 });
  }

  const orgId = await getUserOrganization(userId);
  if (!orgId) {
    return NextResponse.json({ error: "Not part of an organization" }, { status: 403 });
  }

  const org = await getOrganization(orgId);
  if (org?.ownerId === memberId) {
    return NextResponse.json({ error: "Cannot suspend owner" }, { status: 400 });
  }

  const ok = await suspendTeamMember(orgId, memberId, action === "suspend");
  if (!ok) {
    return NextResponse.json({ error: "Failed to update member status" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(
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

  const org = await getOrganization(orgId);
  if (org?.ownerId === memberId) {
    return NextResponse.json({ error: "Cannot remove owner" }, { status: 400 });
  }

  const ok = await removeTeamMember(orgId, memberId);
  if (!ok) {
    return NextResponse.json({ error: "Failed to remove member" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
