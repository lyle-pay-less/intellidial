import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Mock resend invite — replace with actual email sending
  console.log(`Resending invite to user ${id}`);

  return NextResponse.json({ success: true });
}
