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

export type CallSummaryEmailParams = {
  to: string;
  projectName: string;
  isBooking: boolean;
  clientName: string;
  clientPhone: string;
  clientEmail?: string | null;
  durationSeconds?: number;
  transcript?: string | null;
  recordingUrl?: string | null;
  whyNotBooked?: string | null;
};

/**
 * Send call summary email to dealer when a call concludes.
 * Subject: "Congratulations another viewing booked!" or "Successful call made client serviced"
 */
export async function sendCallSummaryEmail(params: CallSummaryEmailParams): Promise<void> {
  const {
    to,
    projectName,
    isBooking,
    clientName,
    clientPhone,
    clientEmail,
    durationSeconds = 0,
    transcript,
    recordingUrl,
    whyNotBooked,
  } = params;

  const subject = isBooking
    ? "Congratulations another viewing booked!"
    : "Successful call made client serviced";

  const durationStr =
    durationSeconds > 0
      ? `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`
      : "—";

  const transcriptSnippet =
    transcript && transcript.trim()
      ? transcript.length > 1500
        ? transcript.slice(0, 1500) + "\n\n[... transcript truncated ...]"
        : transcript
      : "No transcript available.";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="color: #14b8a6; font-size: 24px; margin: 0;">${isBooking ? "🎉 Viewing booked!" : "✓ Client serviced"}</h1>
  </div>
  <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
    <h2 style="font-size: 16px; margin: 0 0 12px 0; color: #0f172a;">Contact details</h2>
    <p style="margin: 4px 0;"><strong>Name:</strong> ${(clientName || "—").replace(/</g, "&lt;")}</p>
    <p style="margin: 4px 0;"><strong>Phone:</strong> ${(clientPhone || "—").replace(/</g, "&lt;")}</p>
    <p style="margin: 4px 0;"><strong>Email:</strong> ${(clientEmail && clientEmail.trim()) ? clientEmail.replace(/</g, "&lt;") : "—"}</p>
    <p style="margin: 4px 0;"><strong>Duration:</strong> ${durationStr}</p>
    <p style="margin: 4px 0;"><strong>Project:</strong> ${(projectName || "—").replace(/</g, "&lt;")}</p>
    ${whyNotBooked && !isBooking ? `<p style="margin: 4px 0;"><strong>Why test drive not booked:</strong> ${String(whyNotBooked).replace(/</g, "&lt;")}</p>` : ""}
  </div>
  <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
    <h2 style="font-size: 16px; margin: 0 0 12px 0; color: #0f172a;">Call summary</h2>
    <pre style="white-space: pre-wrap; font-family: inherit; font-size: 13px; margin: 0; max-height: 300px; overflow-y: auto;">${transcriptSnippet.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
  </div>
  ${recordingUrl ? `<p style="margin: 0 0 8px 0;"><a href="${recordingUrl.replace(/"/g, "&quot;")}" style="color: #14b8a6;">Listen to recording</a></p>` : ""}
  <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">Intellidial — AI-powered call follow-up</p>
</body>
</html>
  `;

  const resend = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL || "Intellidial <onboarding@resend.dev>";

  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    html,
  });

  if (error) {
    console.error("[Email] Call summary error:", error);
    throw new Error(`Resend API error: ${JSON.stringify(error)}`);
  }
  console.log(`[Email] Call summary sent to ${to}: ${data?.id}`);
}
