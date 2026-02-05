# Email Sending - Backlog

## Team Invitations

### Current Status
- ✅ Invitation system implemented (tokens, expiration, acceptance flow)
- ✅ Mock email logging in console
- ❌ **Real email sending not implemented**

### Task: Implement Email Sending for Team Invitations

**Location**: `src/app/api/team/invite/route.ts`

**Current Code** (lines ~50-55):
```typescript
// TODO: Send email (mock for now)
// In production: await sendInvitationEmail(email, inviteUrl, role);
console.log(`[MOCK EMAIL] Invitation sent to ${email}`);
console.log(`[MOCK EMAIL] Invite URL: ${inviteUrl}`);
console.log(`[MOCK EMAIL] Role: ${role}`);
```

**What needs to be done**:
1. Choose email service provider:

   **Recommended Options:**

   **🥇 Option 1: Resend** (Best for Next.js)
   - ✅ Modern, developer-friendly API
   - ✅ Free tier: 3,000 emails/month, 100 emails/day
   - ✅ Great deliverability
   - ✅ Simple React email templates
   - ✅ Perfect for Next.js apps
   - 📦 Install: `npm install resend`
   - 🔗 Sign up: https://resend.com

   **🥈 Option 2: Nodemailer + Gmail SMTP** (Simplest, Free)
   - ✅ Free (uses your Gmail account)
   - ✅ No third-party service needed
   - ✅ Works immediately
   - ⚠️ Requires Gmail App Password (2FA must be enabled)
   - ⚠️ Daily sending limits (~500 emails/day)
   - 📦 Install: `npm install nodemailer`
   - 🔗 Setup: https://support.google.com/accounts/answer/185833

   **🥉 Option 3: SendGrid** (Reliable, Enterprise-grade)
   - ✅ Free tier: 100 emails/day forever
   - ✅ Excellent deliverability
   - ✅ Good documentation
   - ✅ Scales to enterprise
   - 📦 Install: `npm install @sendgrid/mail`
   - 🔗 Sign up: https://sendgrid.com

   **Option 4: Postmark** (Premium deliverability)
   - ✅ Best-in-class deliverability
   - ✅ 100 emails/month free (trial)
   - ⚠️ Paid after trial ($15/month for 10,000 emails)
   - 📦 Install: `npm install postmark`
   - 🔗 Sign up: https://postmarkapp.com

   **💡 Recommendation:** Start with **Resend** (easiest, modern) or **Nodemailer + Gmail** (free, no signup). Switch to SendGrid/Postmark if you need higher volume.

2. Set up email service:
   - [ ] Create account
   - [ ] Get API key
   - [ ] Add to `.env` file
   - [ ] Install SDK/package

3. Create email template:
   - [ ] Design HTML email template
   - [ ] Include: Organization name, inviter name, role, accept button
   - [ ] Mobile-responsive design
   - [ ] Brand colors (teal theme)

4. Implement `sendInvitationEmail()` function:
   - [ ] Create email service utility (`src/lib/email/` or similar)
   - [ ] Replace console.log with actual email send
   - [ ] Handle errors gracefully
   - [ ] Add retry logic for failed sends

5. Test:
   - [ ] Send test invitation
   - [ ] Verify email arrives
   - [ ] Test invitation link works
   - [ ] Test on different email providers (Gmail, Outlook, etc.)

**Email Template Requirements**:
- Subject: "You're invited to join [Organization Name] on Intellidial"
- Body should include:
  - Intellidial logo
  - Inviter's name/email
  - Organization name
  - Assigned role
  - Clear "Accept Invitation" button/link
  - Expiration notice (7 days)
  - Unsubscribe/contact info

---

## Other Email Needs (Future)

### Password Reset
- [ ] Password reset email flow
- [ ] Reset token generation
- [ ] Email template for password reset

### Welcome Email
- [ ] Welcome email after signup
- [ ] Getting started guide
- [ ] Onboarding tips

### Notification Emails
- [ ] Project completion notifications
- [ ] Call result summaries
- [ ] Usage limit warnings
- [ ] Billing reminders

### Survey Feedback (if enabled)
- [ ] Email notification when survey feedback received
- [ ] AI-suggested agent adaptations summary

---

---

## Implementation Examples

### Option 1: Resend (Recommended)

**1. Install:**
```bash
npm install resend
```

**2. Create `src/lib/email/resend.ts`:**
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInvitationEmail(
  to: string,
  inviteUrl: string,
  inviterName: string,
  orgName: string,
  role: string
) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Intellidial <invites@intellidial.co.za>', // Use your domain
      to: [to],
      subject: `You're invited to join ${orgName} on Intellidial`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #14b8a6;">You're Invited!</h1>
          <p>${inviterName} has invited you to join <strong>${orgName}</strong> on Intellidial as a <strong>${role}</strong>.</p>
          <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background: #14b8a6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Accept Invitation
          </a>
          <p style="color: #666; font-size: 14px;">This invitation expires in 7 days.</p>
          <p style="color: #666; font-size: 12px;">If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}
```

**3. Add to `.env`:**
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

**4. Update `src/app/api/team/invite/route.ts`:**
```typescript
import { sendInvitationEmail } from "@/lib/email/resend";
// ... existing code ...

// Replace the TODO section:
const inviter = await getUserById(userId); // You'll need to implement this
await sendInvitationEmail(
  email,
  inviteUrl,
  inviter?.name || inviter?.email || "A team member",
  org.name, // Get org name
  role
);
```

---

### Option 2: Nodemailer + Gmail SMTP (Free)

**1. Install:**
```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

**2. Create `src/lib/email/nodemailer.ts`:**
```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER, // Your Gmail address
    pass: process.env.SMTP_PASSWORD, // Gmail App Password (not regular password)
  },
});

export async function sendInvitationEmail(
  to: string,
  inviteUrl: string,
  inviterName: string,
  orgName: string,
  role: string
) {
  try {
    const info = await transporter.sendMail({
      from: `"Intellidial" <${process.env.SMTP_USER}>`,
      to,
      subject: `You're invited to join ${orgName} on Intellidial`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #14b8a6;">You're Invited!</h1>
          <p>${inviterName} has invited you to join <strong>${orgName}</strong> on Intellidial as a <strong>${role}</strong>.</p>
          <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background: #14b8a6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Accept Invitation
          </a>
          <p style="color: #666; font-size: 14px;">This invitation expires in 7 days.</p>
        </div>
      `,
    });

    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}
```

**3. Add to `.env`:**
```env
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password
```

**4. Get Gmail App Password:**
- Go to Google Account → Security → 2-Step Verification (enable if not already)
- Go to App Passwords → Generate → Select "Mail" → Copy the 16-character password
- Use that password in `SMTP_PASSWORD`

---

### Option 3: SendGrid

**1. Install:**
```bash
npm install @sendgrid/mail
```

**2. Create `src/lib/email/sendgrid.ts`:**
```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendInvitationEmail(
  to: string,
  inviteUrl: string,
  inviterName: string,
  orgName: string,
  role: string
) {
  try {
    await sgMail.send({
      to,
      from: 'invites@intellidial.co.za', // Must verify domain in SendGrid
      subject: `You're invited to join ${orgName} on Intellidial`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #14b8a6;">You're Invited!</h1>
          <p>${inviterName} has invited you to join <strong>${orgName}</strong> on Intellidial as a <strong>${role}</strong>.</p>
          <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background: #14b8a6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Accept Invitation
          </a>
          <p style="color: #666; font-size: 14px;">This invitation expires in 7 days.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('SendGrid error:', error);
    throw error;
  }
}
```

**3. Add to `.env`:**
```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
```

---

## Notes

- **For production:** Add email env vars to Google Cloud Secret Manager and map them in Cloud Run
- **Domain setup:** For Resend/SendGrid, verify your domain (`intellidial.co.za`) to send from `invites@intellidial.co.za` instead of a generic address
- **SPF/DKIM:** Resend and SendGrid handle this automatically when you verify your domain
- **Error handling:** Wrap email sends in try/catch and log failures. Don't fail the invitation creation if email fails (invite URL can be shared manually)
- **Rate limiting:** Gmail SMTP has ~500/day limit. Resend free tier: 100/day. SendGrid free: 100/day
- **Testing:** Use a service like Mailtrap or your own email for testing before going live
