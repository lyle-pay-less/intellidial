/**
 * Email sending via Resend
 * Best practice for production SaaS - professional, reliable, free tier generous
 */

import { Resend } from "resend";

// Create Resend client (singleton)
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (resendClient) return resendClient;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY must be set in environment variables");
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

/**
 * Send team invitation email via Resend
 */
export async function sendInvitationEmail(
  to: string,
  inviteUrl: string,
  inviterName: string,
  orgName: string,
  role: string
): Promise<void> {
  try {
    const resend = getResendClient();
    
    // Use your domain email if RESEND_FROM_EMAIL is set, otherwise use Resend's default
    const fromEmail = process.env.RESEND_FROM_EMAIL || "Intellidial <onboarding@resend.dev>";

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #14b8a6; font-size: 28px; margin: 0;">You're Invited!</h1>
  </div>
  
  <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
    <p style="font-size: 16px; margin: 0 0 20px 0;">
      <strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on Intellidial as a <strong>${role}</strong>.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${inviteUrl}" style="display: inline-block; background: #14b8a6; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Accept Invitation
      </a>
    </div>
    
    <p style="font-size: 14px; color: #64748b; margin: 20px 0 0 0;">
      This invitation expires in 7 days.
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e2e8f0; margin-top: 30px;">
    <p style="font-size: 12px; color: #94a3b8; margin: 0;">
      If you didn't expect this invitation, you can safely ignore this email.
    </p>
    <p style="font-size: 12px; color: #94a3b8; margin: 10px 0 0 0;">
      Intellidial — AI-Powered Phone Research
    </p>
  </div>
</body>
</html>
    `;

    console.log(`[Email] Attempting to send invitation email to ${to}`);
    console.log(`[Email] From: ${fromEmail}`);
    console.log(`[Email] Subject: You're invited to join ${orgName} on Intellidial`);

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: `You're invited to join ${orgName} on Intellidial`,
      html,
    });

    if (error) {
      console.error("[Email] Resend error:", error);
      console.error("[Email] Error details:", JSON.stringify(error, null, 2));
      throw new Error(`Resend API error: ${JSON.stringify(error)}`);
    }

    console.log(`[Email] Invitation sent successfully to ${to}: ${data?.id}`);
  } catch (error) {
    console.error("[Email] Failed to send invitation:", error);
    throw error;
  }
}

const CONTACT_TO_EMAIL = "growth@Intellidial.co.za";

/**
 * Send contact form submission to growth@Intellidial.co.za via Resend
 */
export async function sendContactEmail(
  fromEmail: string,
  message: string,
  fromName?: string
): Promise<void> {
  const resend = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL || "Intellidial <onboarding@resend.dev>";

  const subject = fromName
    ? `Contact from ${fromName} (${fromEmail})`
    : `Contact from ${fromEmail}`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
  <p style="font-size: 14px; color: #64748b;">Landing page contact form — hello@intellidial.co.za</p>
  <p><strong>From:</strong> ${fromName ? `${fromName} &lt;${fromEmail}&gt;` : fromEmail}</p>
  <p><strong>Message:</strong></p>
  <p style="white-space: pre-wrap; background: #f1f5f9; padding: 12px; border-radius: 8px;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
  <p style="font-size: 12px; color: #94a3b8;">Sent at ${new Date().toISOString()}</p>
</body>
</html>
  `;

  const { data, error } = await resend.emails.send({
    from,
    to: [CONTACT_TO_EMAIL],
    replyTo: fromEmail,
    subject,
    html,
  });

  if (error) {
    console.error("[Email] Resend contact error:", error);
    throw new Error(`Resend API error: ${JSON.stringify(error)}`);
  }
  console.log(`[Email] Contact form sent to ${CONTACT_TO_EMAIL}: ${data?.id}`);
}
