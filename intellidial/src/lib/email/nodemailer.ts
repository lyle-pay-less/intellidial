/**
 * Email sending via Nodemailer + Gmail SMTP
 * Free, quick, and easy - uses your Gmail account
 */

import nodemailer from "nodemailer";

// Create transporter (singleton)
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;

  if (!smtpUser || !smtpPassword) {
    throw new Error("SMTP_USER and SMTP_PASSWORD must be set in environment variables");
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: smtpUser,
      pass: smtpPassword, // Gmail App Password (not regular password)
    },
  });

  return transporter;
}

/**
 * Send team invitation email
 */
export async function sendInvitationEmail(
  to: string,
  inviteUrl: string,
  inviterName: string,
  orgName: string,
  role: string
): Promise<void> {
  try {
    const smtpUser = process.env.SMTP_USER;
    if (!smtpUser) {
      throw new Error("SMTP_USER not configured");
    }

    const mailTransporter = getTransporter();

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

    const info = await mailTransporter.sendMail({
      from: `"Intellidial" <${smtpUser}>`,
      to,
      subject: `You're invited to join ${orgName} on Intellidial`,
      html,
      text: `${inviterName} has invited you to join ${orgName} on Intellidial as a ${role}.\n\nAccept invitation: ${inviteUrl}\n\nThis invitation expires in 7 days.`,
    });

    console.log(`[Email] Invitation sent to ${to}: ${info.messageId}`);
  } catch (error) {
    console.error("[Email] Failed to send invitation:", error);
    throw error;
  }
}
