import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { email, role } = body;

  if (!email || !role) {
    return NextResponse.json(
      { error: "Email and role are required" },
      { status: 400 }
    );
  }

  // Mock invite — replace with actual email sending + Firestore
  console.log(`Sending invite to ${email} as ${role}`);

  return NextResponse.json({
    success: true,
    message: `Invite sent to ${email}`,
  });
}
