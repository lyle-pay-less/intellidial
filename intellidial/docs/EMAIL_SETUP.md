# Email Setup Guide - Resend (Recommended)

This guide shows you how to set up professional email sending for team invitations using Resend.

## Why Resend?

✅ **Best Practice** - Industry standard for SaaS transactional emails  
✅ **Free Tier** - 3,000 emails/month, 100 emails/day (plenty for team invites)  
✅ **Professional** - Send from your domain (noreply@intellidial.co.za)  
✅ **Great Deliverability** - Emails reach inbox, not spam  
✅ **Modern API** - Perfect for Next.js apps  
✅ **Analytics** - Track opens, clicks, bounces  

## Quick Setup (5 minutes)

### Step 1: Sign Up

1. Go to [Resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### Step 2: Get API Key

1. Go to [API Keys](https://resend.com/api-keys)
2. Click **"Create API Key"**
3. Name it: **Intellidial Production**
4. Copy the API key (starts with `re_`)

### Step 3: Add to .env

Add to your `.env` file:

```env
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=Intellidial <onboarding@resend.dev>
```

**Note:** `onboarding@resend.dev` works immediately for testing. For production, verify your domain (see Step 4).

### Step 4: Verify Domain (Optional but Recommended)

To send from `noreply@intellidial.co.za`:

1. Go to [Domains](https://resend.com/domains)
2. Click **"Add Domain"**
3. Enter: `intellidial.co.za`
4. Add DNS records to your domain:
   - **SPF record** (for authentication)
   - **DKIM records** (for signing)
   - **DMARC record** (optional, for security)
5. Wait for verification (usually 5-10 minutes)
6. Update `.env`:
   ```env
   RESEND_FROM_EMAIL=Intellidial <noreply@intellidial.co.za>
   ```

### Step 5: Test

1. Restart your dev server (`npm run dev`)
2. Go to Dashboard → Team
3. Invite a team member
4. Check the email inbox!

## Production Deployment

Add to GCP Secret Manager:

```bash
# Create secrets
"re_your_api_key_here" | gcloud secrets create resend-api-key --data-file=-
"Intellidial <noreply@intellidial.co.za>" | gcloud secrets create resend-from-email --data-file=-

# Grant Cloud Run access
SA="cloud-run-intellidial@intellidial-39ca7.iam.gserviceaccount.com"
gcloud secrets add-iam-policy-binding resend-api-key --member="serviceAccount:$SA" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding resend-from-email --member="serviceAccount:$SA" --role="roles/secretmanager.secretAccessor"
```

Then update `cloudbuild.yaml` to include:
```
RESEND_API_KEY=resend-api-key:latest,RESEND_FROM_EMAIL=resend-from-email:latest
```

## Troubleshooting

### "Invalid API key" error
- Make sure you copied the full API key (starts with `re_`)
- Check for extra spaces or newlines
- Verify the key is active in Resend dashboard

### Email not sending
- Check console logs for error messages
- Verify `RESEND_API_KEY` is set correctly
- Check Resend dashboard for delivery status

### Domain verification failed
- Make sure DNS records are added correctly
- Wait 10-15 minutes for DNS propagation
- Check Resend dashboard for specific error messages

## Free Tier Limits

- **3,000 emails/month** (free forever)
- **100 emails/day** (free forever)
- Perfect for team invitations (you'll never hit this limit)

## Alternative: Gmail SMTP (Quick MVP)

If you want something even quicker (but less professional):

1. Use Gmail App Password (see old `EMAIL_SETUP.md`)
2. Set `SMTP_USER` and `SMTP_PASSWORD` in `.env`
3. Update code to use `nodemailer` instead of `resend`

But Resend is recommended for production! 🚀
