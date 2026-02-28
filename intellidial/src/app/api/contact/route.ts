import { NextRequest, NextResponse } from "next/server";
import { sendContactEmail } from "@/lib/email/resend";

/**
 * POST /api/contact
 * Landing page contact form — sends to growth@Intellidial.co.za via Resend
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : undefined;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    await sendContactEmail(
      email,
      message || "No message provided.",
      name || undefined
    );

    return NextResponse.json({
      success: true,
      message: "Thanks! We'll get back to you within 2 hours.",
    });
  } catch (err) {
    console.error("[Contact API]", err);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send message. Please try hello@intellidial.co.za directly.",
      },
      { status: 500 }
    );
  }
}
