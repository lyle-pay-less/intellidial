# Email forwarding test — status & what’s left

**Feature:** Email arrives at your Resend receiving address (subject contains "AutoTrader") → parse name, phone, vehicle link → create contact → fetch vehicle context → place call → result in back office.

**Resend receiving address (predefined, no extra domain):** `leads@ulkieyen.resend.app` (or `<anything>@ulkieyen.resend.app` — use "leads" or any word). Forward test emails and dealer enquiries to this address.

---

## Implemented (Tasks 1–7)

| # | What | Where |
|---|------|--------|
| 1 | Inbox: receive at leads@ via Resend inbound + webhook | `INBOX_SETUP.md`, `POST /api/webhooks/resend/inbound` |
| 2 | Trigger: run only when subject contains "AutoTrader" | Same route |
| 3 | Parse email → name, contact number, vehicle link | `Intellidial/src/lib/dealer-forwarding/parse-email.ts` |
| 4 | Create contact, attach to project | `pipeline.ts` → `createContacts(projectId, …)` |
| 5 | Get vehicle context from link (fetch HTML + Gemini extract) | `pipeline.ts` → `fetchVehicleListingHtml` + `extractFullTextFromHtml` + `updateProject(vehicleContextFullText)` |
| 6 | Place outbound call with context | `pipeline.ts` → `ensureProjectAssistantId` + `createOutboundCall` |
| 7 | Result stored under dealer | Existing call-ended webhook links call to project/contact |
| — | Webhook signing (optional) | When `RESEND_WEBHOOK_SECRET` is set, `POST /api/webhooks/resend/inbound` verifies the request with Svix; invalid or missing signature → 401 |

**Dealer setup:** Each dealer has a **Forwarding email** field (Dealer setup on the instructions page). That’s the email you link to the dealership (e.g. the address that forwards to leads@). Used for display/linking; routing by this email is optional (see below).

---

## What you need to do for it to work (single dealer / test)

1. **Resend:** Receiving address is **leads@ulkieyen.resend.app**. In Resend → Webhooks, add webhook:
   - **URL:** `https://intellidial.co.za/api/webhooks/resend/inbound` (use your actual deployed domain if different)
   - **Event:** `email.received`
   - **Signing secret:** Copy the webhook’s signing secret from the webhook details page and set **`RESEND_WEBHOOK_SECRET`** in your env. The route verifies the request with Svix when this is set; if unset, it still runs but does not verify (useful for local testing).
2. **Env:** `RESEND_API_KEY` and `RESEND_WEBHOOK_SECRET` are in Secret Manager (already in cloudbuild). **Architecture: one org owns all dealers.** The app uses that org automatically; no DEALER_FORWARDING_ORG_ID (not used in single-org setup) or other env var needed for routing. the incoming email’s “to” address to a dealer’s **Forwarding email**. Only if you have **multiple orgs** do you set **`DEALER_FORWARDING_ORG_ID (not used in single-org setup)`** in Cloud Run (so we know which org’s dealers to use).
3. **Dashboard only:** Create/open a dealer → set **Forwarding email** to **`leads@ulkieyen.resend.app`** (or that dealer’s Resend address) → link the dealer to a project → Save. Adding more dealers = same: set each one’s Forwarding email and project; no Cloud Run changes.
4. **Task 8 — Manual test:** Send an email to **leads@ulkieyen.resend.app** with subject containing "AutoTrader" and body e.g.  
   `Name: Your Name`  
   `Phone: 084 123 4567`  
   `Link: https://www.autotrader.co.za/car-for-sale/...`  
   Then confirm: webhook runs → contact created → vehicle context fetched → call placed → result in dashboard.

That’s enough for the feature to be **fully working for one dealer**: one project, one inbox, test emails and real forwards all go to that project.

---

## Optional / later (not required for “fully implemented” for single dealer)

- **Route by forwarding email (multi-dealer):** Right now every AutoTrader email uses `DEALER_FORWARDING_PROJECT_ID (optional fallback; we route by dealer Forwarding email)`. To route by dealer: when an email arrives, look up the dealer whose `forwardingEmail` matches the “to” or “from” address (or a header), then use that dealer’s `projectId` instead of the env var. Only needed when you have multiple dealers and each has their own forwarding address.
- **Idempotency:** Track processed `email_id` (e.g. in a table or cache) so the same email doesn’t trigger two calls if Resend retries the webhook.
- **Real AutoTrader format:** When you have a real forwarded AutoTrader email, capture a sample and adjust the parser if the format differs from the test body (Name/Phone/Link).

---

**Full checklist:** `DEALER_FORWARDING_PLAN.md` → Section 10.
