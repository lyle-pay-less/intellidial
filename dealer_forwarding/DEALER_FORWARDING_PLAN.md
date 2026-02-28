# Dealer email forwarding → call → track (plan & test approach)

**Core feature for dealer pilot:** Dealer forwards an AutoTrader (or similar) enquiry email to our mailbox → we parse it (car link, lead name, phone) → we call the lead within 60s → call is recorded and transcribed → results are trackable back to that dealer in the back office.

We don’t have real AutoTrader emails to test yet. This doc is for **how we’ll implement it** and **how we’ll test it with manual emails** until we do.

---

## 1. Target flow (from the “How it works” diagram)

| Step | What happens |
|------|----------------|
| **1. Connect lead source** | Dealer forwards AutoTrader enquiry to our designated mailbox. We receive the email. |
| **2. Callback in 60 seconds** | We parse the email for: **advert/car link**, **lead name**, **phone number**. We ingest car + lead context, then place a call to the phone number (AI qualifies, answers FAQs, can book test drive). |
| **3. Instant alert, email & calendar** | Call is recorded and transcribed. Results (transcript, recording link, captured data) are trackable back to the **dealer** in the back office. Dealer gets alert + detailed email (transcript, meeting details) + optional calendar invite. |

So the system must:

1. **Monitor an inbox** for forwarded enquiry emails (or accept them via another trigger for testing).
2. **Parse each email** to extract:
   - **Advert/car link** (e.g. AutoTrader listing URL) — for context.
   - **Lead name** (person who enquired).
   - **Phone number** (to call).
3. **Ingest “in context”:** car link + lead name (and any other useful snippet from the email) so the AI has context for the call.
4. **Place the call** (existing VAPI/IntelliDial pipeline), with that context.
5. **Record and transcribe** (already done by VAPI).
6. **Track results back to the dealer** in the back office: so we know which dealer this lead belonged to, and the dealer can see the call result (transcript, recording, captured data).

---

## 2. Why we can’t test “properly” yet

- No real AutoTrader enquiry emails to forward.
- So we can’t validate real parsing (AutoTrader’s exact email format, links, layout) or real end-to-end with a live dealer.

---

## 3. Test approach: manual “enquiry-like” emails

**Goal:** A test process as close as possible to the real flow, using **manual test emails** we create and send (or paste) ourselves.

**Options:**

- **A. Dedicated test mailbox**  
  - Create an inbox (e.g. `leads@intellidial.co.za` or `dealer-leads-test@…`) that the system monitors.  
  - We send **manual test emails** to that address. Each test email is structured to look like a “forwarded enquiry”:  
    - Subject/body contain a **car/advert link**, **lead name**, **phone number** in a consistent format we define.  
  - System polls (or gets webhook) → parses → calls → stores result linked to a “test dealer” (or a real dealer org we use for pilot).

- **B. API / form as stand-in for “inbox”**  
  - For dev/test only: a small **API endpoint or dashboard form** where we paste (or submit) the same fields: car link, lead name, phone, optional “dealer id” or “forwarded from” identifier.  
  - Backend does the rest: build context, create contact/call, trigger VAPI call, store result against that dealer.  
  - No inbox monitoring yet; we add inbox monitoring when we have a real mailbox and (optionally) real AutoTrader format.

- **C. Hybrid**  
  - Implement **parsing + call + “track to dealer”** first (using B so we can test without an inbox).  
  - Then add **inbox monitoring** (A) and plug in the same parser so that “email in inbox” produces the same structured payload (car link, name, phone, dealer id) that B uses.

**Recommendation for now:** Start with **B (API/form test path)** so we can:

- Define the **exact fields** we need: car link, lead name, phone, dealer (org/project or “dealer id”).
- Reuse existing **project/contact/call** and **VAPI** flow; attach “source = forwarded enquiry” and “dealer id” so results are **trackable back to the dealer** in the back office.
- Test **call + record + transcript + results in UI** without needing inbox or real AutoTrader emails.

Then add **A** (inbox monitoring + parser from real or manual-forwarded emails) so the production path is “email arrives → parse → same pipeline as B”.

---

## 4. What we need to implement (and test)

### 4.1 Data we need from “enquiry” (email or test payload)

| Field | Purpose |
|-------|--------|
| **Car / advert link** | Ingested in context for the AI (listing details, car info). |
| **Lead name** | Ingested in context; used in call. |
| **Phone number** | Number we call. |
| **Dealer id** (org id, project id, or explicit “dealer” id) | So we can attach the call result to the right dealer in the back office. |
| Optional: raw email snippet | Fallback if parsing is partial; can still be used for context. |

### 4.2 Pipeline (same for test and production)

1. **Receive** “enquiry” (from test API/form or, later, from inbox parser).
2. **Validate** phone number; normalize if needed.
3. **Resolve dealer** (org/project) so we know where to attach the result.
4. **Create or reuse** a **contact** (and optionally a **project** or “dealer enquiry” project) so the call has a place in the back office.
5. **Build call context:** car link (and/or fetched summary), lead name, any extra snippet. Pass to VAPI/agent so the call is “in context”.
6. **Place call** (existing IntelliDial/VAPI flow); ensure **recording and transcript** are stored (already the case).
7. **Attach result to dealer:**  
   - Link call (and transcript, recording, captured data) to the **dealer** (org/project) so the dealer sees it in the back office.  
   - Optional: send “instant alert” + “detailed email (transcript, meeting details)” to dealer (Step 3 of diagram).

### 4.3 Back office “trackable back to dealer”

- **Dealer** = an org (or a specific project) representing that dealer.
- Each “forwarded enquiry” call must be stored with:
  - Contact (lead name, phone),
  - Project/dealer id,
  - Call outcome (transcript, recording, captured data).
- Back office (dashboard) already has projects and call results; we need to ensure:
  - There is a **dealer-facing view** (or project view) where the dealer sees **their** enquiries and call results.
  - Filtering by “source = forwarded enquiry” or by project type could help.

So “trackable back to dealer” = **call result stored under that dealer’s org/project and visible in their dashboard**.

---

## 5. Test process (manual, no real AutoTrader emails)

1. **Define a test payload format** (e.g. JSON or form fields):  
   `car_link`, `lead_name`, `phone`, `dealer_id` (or org/project id).
2. **Implement test entrypoint:**  
   - Option B: API route (e.g. `POST /api/dealer-forwarding/test-enquiry`) or a small form in dashboard “Submit test enquiry”.
3. **Backend:**  
   - Create/find contact, attach to dealer project.  
   - Build context (car link + name); trigger VAPI call with that context.  
   - On call end, store transcript/recording/captured data and link to dealer (existing sync/call-ended flow).
4. **Manual test:**  
   - We send a few test “enquiries” (via API or form) with our own phone number.  
   - Verify: call is placed, context is used, result appears in back office under the right dealer/project.
5. **Later:**  
   - Add inbox monitoring.  
   - Define **manual test email format** (subject/body template) that we forward to the test mailbox to simulate “forwarded AutoTrader enquiry” and run the same pipeline.

---

## 6. Open decisions

- **Dealer identity:** Is “dealer” = one Org? One Project per dealer? Or a separate “dealer” entity we need to add?
- **Inbox:** Which mailbox will we use for production (e.g. `leads@intellidial.co.za`)? For test, do we use the same or a separate test address?
- **Email format:** When we have a real AutoTrader forward, we’ll need a parser (and possibly a few variants for different forwarders). For manual test emails, we define a simple format (e.g. “CAR: <url> NAME: <name> PHONE: <number>” or a short HTML template).
- **Alert + email to dealer:** Step 3 says “instant alert” and “detailed email”. Do we want in-app notification only, or also an email to the dealer with transcript + meeting details? If email, we need a template and a “dealer contact email” (or use org admin).

---

## 7. Next steps (suggested)

1. **Confirm dealer model** in back office (org vs project vs new entity).  
2. **Implement test path (B):** API or form → parse payload → create contact + context → call → store result under dealer.  
3. **Test with manual payloads** (our phone number, test car link, test name).  
4. **Document manual test email format** for when we add inbox monitoring.  
5. **Add inbox monitoring** (polling or webhook) and email parser; wire to same pipeline as step 2.  
6. **Add dealer-facing result view** (if not already covered by project/call list) and optional alert + transcript email to dealer.

---

## 8. Where this lives

- **Folder:** `dealer_forwarding/` (this file).
- **Code (to add):** Likely under `Intellidial/` (API route for test enquiry, then inbox integration, parser, and any dealer-specific views). Existing: VAPI call flow, projects, contacts, call storage, transcript/recording.
- **Diagram reference:** The “How it works” three-step flow (Connect lead source → Callback in 60s → Instant alert, email & calendar) is what we’re implementing and testing.

---

## 9. Task checklist (to accomplish this)

Use this list to implement and test the feature. Order is roughly sequential; some items can be done in parallel once dependencies are clear.

### Phase 1: Decisions & test path (no inbox yet)

| # | Task | Notes |
|---|------|--------|
| 1 | **Decide dealer identity** | Dealer = one Org, or one Project per dealer, or new “dealer” entity? Affects how we attach results. |
| 2 | **Define test payload** | JSON/form: `car_link`, `lead_name`, `phone`, `dealer_id` (org id or project id). Optional: `raw_snippet`. |
| 3 | **API: receive test enquiry** | e.g. `POST /api/dealer-forwarding/test-enquiry` (or under dealer API). Accept payload; validate phone; return 400 if invalid. |
| 4 | **Resolve dealer** | From `dealer_id` get org (and optionally project). Ensure caller is allowed to create enquiries for that dealer (auth). |
| 5 | **Create contact for enquiry** | Create contact (name, phone) under the dealer’s org/project. Mark source e.g. `source: "forwarded_enquiry"` so we can filter. |
| 6 | **Build call context** | From car link + lead name (and optional snippet) build a context string or object for the AI. Optionally fetch car page summary if we have a fetcher. |
| 7 | **Trigger VAPI call with context** | Use existing IntelliDial call flow; pass the enquiry context so the agent has car + lead info. Ensure project/contact are linked so result is stored correctly. |
| 8 | **Verify result storage** | Call end → transcript, recording, captured data stored and linked to that contact/project/dealer. No new code if current flow already does this; just confirm. |
| 9 | **Dashboard: “Submit test enquiry” (optional)** | Small form in back office (e.g. dealer project view or a “Dealer forwarding” test page) that POSTs to the test-enquiry API. Makes manual testing easier. |
| 10 | **Manual test** | Submit 2–3 test enquiries (your phone, test car link, test name). Confirm call fires, context is used, result appears under the right dealer/project in dashboard. |

### Phase 2: Inbox monitoring (production-like)

| # | Task | Notes |
|---|------|--------|
| 11 | **Decide inbox** | Production: e.g. `leads@intellidial.co.za`. Test: same or `dealer-leads-test@…`. Document in this folder. |
| 12 | **Define manual test email format** | e.g. Subject: “Enquiry: [Lead Name]”; body: “CAR: <url> NAME: <name> PHONE: <number>” or similar. So we can forward a manual email and have parser read it. |
| 13 | **Inbox access** | How we read mail: IMAP poll, Gmail API, or inbound webhook (e.g. SendGrid/Resend inbound parse). Implement one. |
| 14 | **Email parser** | Parse incoming email (subject + body) → extract car link, lead name, phone. Map “from” or a header to dealer id if needed (or use single test dealer for now). Output same payload as test API. |
| 15 | **Wire parser to pipeline** | On new email (or poll cycle): parse → if valid payload, call same pipeline as Phase 1 (create contact, build context, place call, store result). Idempotency: don’t call twice for same email (e.g. track by message id). |
| 16 | **Test with manual forward** | Send a manual “enquiry” email to the inbox. Confirm it’s parsed, call is placed, result appears under dealer. |

### Phase 3: Dealer experience & alerts (optional / later)

| # | Task | Notes |
|---|------|--------|
| 17 | **Dealer-facing view** | Ensure dealer (org) has a view of “their” forwarded-enquiry calls: filter by source or project. May already be “project detail + results”; if not, add filter or tab. |
| 18 | **Instant alert** | In-app notification when a new enquiry call completes? Or skip for MVP. |
| 19 | **Email to dealer** | Optional: email dealer (org admin?) with transcript + meeting details when call completes. Needs template and dealer email address. |
| 20 | **Real AutoTrader format** | When we have a real forwarded AutoTrader email: capture sample, document format, extend parser (or add variant) so production forwards work. |

---

**Summary:** Phase 1 gets you a working test path (API/form → call → result under dealer) without inbox. Phase 2 adds inbox monitoring and parsing so forwarded emails drive the same pipeline. Phase 3 improves dealer visibility and alerts.

---

## 10. Email forwarding test checklist (mimic “How it works”)

This is a **test process** to mimic the three-step flow using **leads@intellidial.co.za**: we send manual test emails (subject contains “AutoTrader”) and run the same pipeline (parse → back office → vehicle context from link → auto-call → test drive flow). **Not cold email** — this is testing the email-forwarding → callback flow.

**Test mailbox:** `leads@intellidial.co.za`  
**Trigger:** Incoming email where **subject** contains **AutoTrader** (or we define a test subject pattern).  
**Context from email:** name, contact number, vehicle link.

Work through these tasks one by one.

| # | Task | Done |
|---|------|------|
| **1** | **Inbox: receive at leads@intellidial.co.za** | |
| | Ensure `leads@intellidial.co.za` can receive mail. Decide how we read it (IMAP poll, Gmail API, or inbound webhook e.g. Resend/SendGrid inbound parse). Document where it’s configured. | |
| **2** | **Trigger: subject = AutoTrader** | |
| | When a new email arrives, check subject. If subject contains “AutoTrader” (or our test phrase), run the automation. Otherwise ignore. | |
| **3** | **Parse email → name, contact number, vehicle link** | |
| | From the email (subject + body), extract: **name**, **contact number**, **vehicle link**. Define a simple test format (e.g. body lines “Name: …”, “Phone: …”, “Link: …” or one real AutoTrader-forward sample). Parser outputs these three fields. | |
| **4** | **Capture in back office** | |
| | Create or find a **contact** (name, phone) and attach to the right **dealer/project**. Store “source = forwarded enquiry” so we can filter. Dealer can be a fixed test dealer/project for now. | |
| **5** | **Get vehicle context from link (same as test agent)** | |
| | Use the **vehicle link** from the email. Call the same flow as “Refresh vehicle context”: fetch HTML (Playwright, expand detailed specs), extract full text via Gemini, get `vehicleContextFullText`. No need to persist on a project if we only use it for this call; we just need the same text block for the agent. | |
| **6** | **Auto-call with context** | |
| | Place outbound call to the **contact number** using the same agent flow as the test agent (goal, questions, test drive booking). Pass **lead name** (e.g. for “Hi, is this {{customerName}}?”) and the **vehicle context** (the extracted listing text) so the agent has full car + lead context. | |
| **7** | **Store result under dealer** | |
| | When the call ends: transcript, recording, and any captured data are stored and **linked to that contact/dealer** so it appears in the back office (same as existing call-ended flow). | |
| **8** | **Manual test end-to-end** | |
| | Send a test email to `leads@intellidial.co.za` with subject containing “AutoTrader” and body with your name, your phone, and a real AutoTrader vehicle link. Confirm: email is received → parsed → contact created → vehicle context fetched → call placed → you get the call with correct context → result visible in back office. | |

**Order:** Do 1 → 2 → 3 first (receive email, trigger on subject, parse). Then 4 → 5 → 6 → 7 (back office, vehicle context, call, store). Finally 8 (full manual test).
