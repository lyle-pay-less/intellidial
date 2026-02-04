import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Mock: in production, generate or redirect to signed invoice PDF URL
  // For now return JSON so the client can show a message or open a placeholder
  return NextResponse.json({
    success: true,
    message: `Invoice ${id} download — connect to SA payment gateway (PayFast/PayGate) for real PDF`,
    invoiceId: id,
  });
}
