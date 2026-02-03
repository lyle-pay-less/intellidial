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
   - [ ] SendGrid
   - [ ] Postmark
   - [ ] AWS SES
   - [ ] Resend
   - [ ] Other: ___________

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

## Notes

- Consider using a transactional email service (SendGrid, Postmark) rather than SMTP for better deliverability
- Set up SPF/DKIM records for domain authentication
- Monitor email delivery rates and bounce handling
- Consider email templates service (like SendGrid Dynamic Templates) for easier management
