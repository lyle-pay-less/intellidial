# Task 1: Inbox — receive at your Resend address

**Goal:** Emails sent to your Resend receiving address are received and processed by our app so we can run the forwarding automation (parse → back office → vehicle context → call).

**Receiving address (Resend predefined):** `leads@ulkieyen.resend.app` (format: `<anything>@ulkieyen.resend.app` — we use "leads"). No custom domain needed; forward test emails and dealer enquiries to this address.

## How we read mail: Resend Inbound + Webhook

We use **Resend** for sending (contact form, invitations). Resend also supports **inbound email**:

1. You configure a **domain** in Resend (e.g. `intellidial.co.za`) and add the DNS records they give you.
2. You add an **inbound address** (e.g. `leads@intellidial.co.za`) in the Resend dashboard under **Receiving**.
3. Resend sends a **webhook** to our app whenever an email is received at that address. We do **not** poll; they POST to us.

**Webhook event:** `email.received`  
**Our endpoint:** `POST /api/webhooks/resend/inbound`

The webhook payload does **not** include the full body (by design, for large emails). We must call Resend’s **Receiving API** with the `email_id` from the webhook to get the subject, HTML, and text body.

## What you need to configure

### 1. Resend dashboard

- **Domain:** Ensure `intellidial.co.za` (or your sending domain) is verified in Resend.
- **Receiving:** Use Resend’s predefined address **leads@ulkieyen.resend.app** (Emails → Receiving; format is `<anything>@ulkieyen.resend.app`).
- **Webhook:** In Resend → **Webhooks** → Add endpoint:
  - **URL:** `https://<your-app-host>/api/webhooks/resend/inbound`  
    (e.g. `https://yourapp.vercel.app/api/webhooks/resend/inbound` or your ngrok URL for local test.)
  - **Events:** select **email.received** (and any others you need).
  - Optionally set a **signing secret** and verify it in our route (see Resend webhook docs).

### 2. Environment

- **RESEND_API_KEY** — already used for sending; the same key is used to call `emails.receiving.get(email_id)` to fetch the email body.

### 3. Local testing

Resend needs to POST to a **public URL**. For local dev:

- Use **ngrok** (or similar): `ngrok http 3000` → use the HTTPS URL for the webhook, e.g. `https://abc123.ngrok.io/api/webhooks/resend/inbound`.
- Or deploy to a staging URL and set that as the webhook in Resend.

## Flow (after Task 1)

1. Someone sends an email to **leads@intellidial.co.za**.
2. Resend receives it and POSTs to our webhook with `type: "email.received"` and `data.email_id`.
3. Our route fetches the full email via `resend.emails.receiving.get(email_id)`.
4. We then run **Task 2** (trigger: subject contains “AutoTrader”) and **Task 3** (parse name, phone, vehicle link) and the rest of the pipeline.

## Checklist (Task 1 + pipeline)

- [ ] Domain and **leads@intellidial.co.za** set up in Resend Receiving.
- [ ] Webhook URL registered in Resend with event **email.received**.
- [ ] Env: `RESEND_API_KEY`, `DEALER_FORWARDING_PROJECT_ID` (project for forwarded enquiries), `GEMINI_API_KEY`, `VAPI_PHONE_NUMBER_ID` (and VAPI API key for outbound).
- [ ] App deployed (or ngrok) so Resend can reach the webhook URL.
- [ ] **Test email:** Send to **leads@ulkieyen.resend.app**. Subject contains "AutoTrader". Body: `Name: ...`, `Phone: ...`, `Link: https://www.autotrader.co.za/...`
