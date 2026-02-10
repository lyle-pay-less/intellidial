import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

/**
 * POST /api/test-email
 * Test endpoint to verify Resend email configuration
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "RESEND_API_KEY is not set in environment variables" },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL || "Intellidial <onboarding@resend.dev>";

    console.log(`[Test Email] Attempting to send test email to ${email}`);
    console.log(`[Test Email] From: ${fromEmail}`);
    console.log(`[Test Email] API Key present: ${apiKey ? "Yes" : "No"}`);

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: "Test Email from Intellidial",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #14b8a6;">Test Email</h1>
          <p>This is a test email from Intellidial to verify Resend email configuration.</p>
          <p>If you received this email, your Resend setup is working correctly!</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Sent at: ${new Date().toISOString()}
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("[Test Email] Resend error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to send email",
          details: error,
        },
        { status: 500 }
      );
    }

    console.log(`[Test Email] Email sent successfully: ${data?.id}`);

    return NextResponse.json({
      success: true,
      message: "Test email sent successfully",
      emailId: data?.id,
      to: email,
      from: fromEmail,
    });
  } catch (error) {
    console.error("[Test Email] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        details: error,
      },
      { status: 500 }
    );
  }
}
