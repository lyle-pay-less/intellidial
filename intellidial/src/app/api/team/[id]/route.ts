import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { role } = body;

  if (!role) {
    return NextResponse.json({ error: "Role is required" }, { status: 400 });
  }

  // Mock update — replace with Firestore
  console.log(`Updating user ${id} role to ${role}`);

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Mock delete — replace with Firestore
  console.log(`Removing user ${id}`);

  return NextResponse.json({ success: true });
}
