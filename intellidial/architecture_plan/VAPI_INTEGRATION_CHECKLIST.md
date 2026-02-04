# VAPI Integration — Step-by-Step Checklist

**Goal:** When the user clicks **Call now** (or **Start calling**), a real outbound call is placed via VAPI to the contact's phone number. This checklist follows the spec in `VAPI_GEMINI_ORG_INTEGRATION.md` and applies best practices.

**Reference:** `VAPI_GEMINI_ORG_INTEGRATION.md` (architecture, data model, call flow, webhooks, org isolation).

**How to tick:** When you finish an item, change ☐ to ☑ on that line (e.g. `- ☑ **0.1** Create or log in...`). You can use Find & Replace for that line only.

**MVP scope (this phase):** Use **one phone number** for all outbound calls (e.g. from env or a single provisioned VAPI number). Per-org or multiple numbers can be added later.

---

## Phase 0: Prerequisites & setup

- ☑ **0.1** Create or log into a [VAPI](https://vapi.ai) account (dashboard + API access).
- ☑ **0.2** Obtain a **private** VAPI API key from the dashboard. This key must never be exposed to the client.
- ☑ **0.3** Add `VAPI_API_KEY` to `.env` (root of Next.js app, e.g. `Intellidial/.env`). Do not commit the key; add `.env` to `.gitignore` if not already.
- ☑ **0.4** Confirm VAPI base URL for API calls (e.g. `https://api.vapi.ai`). Check [VAPI API reference](https://docs.vapi.ai/api-reference) for the current base URL and endpoints.
- ☑ **0.5** (Best practice) Create a small test script or use Postman/curl to verify the key works (e.g. GET assistants or GET phone-numbers). Remove or secure the script after verification.

---

## Phase 1: VAPI client & types

- ☑ **1.1** Create `src/lib/vapi/client.ts` (or `src/lib/vapi/index.ts`) for server-side VAPI API calls only. Do not use the VAPI client in client components.
- ☑ **1.2** Implement a function to **create/update assistant** (e.g. `createOrUpdateAssistant(project)`). Map project fields to VAPI assistant payload:
  - `agentInstructions` (+ goal, tone) → system prompt / `model.messages[0].content`
  - `agentQuestions` → structured in prompt or tools as per VAPI docs
  - Choose a default voice (e.g. from VAPI docs) and model (e.g. GPT-4o or VAPI’s recommended).
- ☑ **1.3** Implement a function to **create an outbound call** (e.g. `createOutboundCall({ assistantId, phoneNumberId, customerNumber })`). Call `POST https://api.vapi.ai/call/phone` (or current equivalent from VAPI docs) with:
  - `assistantId` (or inline assistant)
  - `phoneNumberId` (caller ID — org’s number)
  - `customer: { number: contact.phone }`
- ☑ **1.4** Use `Authorization: Bearer ${process.env.VAPI_API_KEY}` for all VAPI requests. Read the key only in server code (API routes or server components).
- ☑ **1.5** (Best practice) Centralize error handling: map VAPI API errors to meaningful messages and log without exposing internal details to the client.

---

## Phase 2: Data model — project & organization

- ☑ **2.1** Add `assistantId?: string` to the **project** type and Firestore schema (see spec: Project data model). Persist when a VAPI assistant is created for that project.
- ☑ **2.2** Add to **organization** type and Firestore (see spec: Organization — phone + usage):
  - `phoneNumberId?: string`
  - `phoneNumberE164?: string`
  - `phoneNumberStatus?: "none" | "pending" | "active" | "imported"`
- ☑ **2.3** (Optional for first “call now” milestone) Add plan/usage fields to org for limits: `plan`, `callsLimit`, `minutesLimit`, `usagePeriodStart`, `callsUsed`, `minutesUsed`. Can be deferred to Phase 6.
- ☑ **2.4** Ensure **store** (and any Firestore reads/writes) use the new project and org fields. When reading org, include `phoneNumberId`; when reading project, include `assistantId`.

---

## Phase 3: Create VAPI assistant (lazy, per project)

- ☑ **3.1** Before placing a call, the call-initiation API must ensure the project has an `assistantId`. If `!project.assistantId`, call the VAPI client to create an assistant from the project config (instructions, goal, tone, questions, etc.).
- ☑ **3.2** After creating the assistant via VAPI, save the returned `assistantId` to the project document (Firestore) so future calls reuse the same assistant.
- ☑ **3.3** (Best practice) Build the assistant’s system prompt from `agentInstructions` (and optionally goal/tone) so the live call uses the same script the user configured. Do not send contact PII to VAPI beyond the customer phone number required for the call.
- ☑ **3.4** Handle VAPI errors (e.g. rate limit, invalid config) and return a clear error to the client (e.g. 502 with message “Failed to create agent. Try again.”).

---

## Phase 4: Phone number (MVP: one number; per-org later)

- ☑ **4.1** Before placing a call, the call-initiation API must have a `phoneNumberId`. **MVP:** Use a single phone number (e.g. from `VAPI_PHONE_NUMBER_ID` in env, or one provisioned number shared for now). Per-org provisioning (org.phoneNumberId) can be added later.
- ☑ **4.2** **MVP:** Either set `VAPI_PHONE_NUMBER_ID` in `.env` (number already in VAPI dashboard), or call VAPI once to provision one number (e.g. `POST https://api.vapi.ai/phone-number`). Use that one number for all outbound calls’s.
- ☐ **4.3** (Optional for MVP) If you provision via API, you can save `phoneNumberId` to a single org or config; for MVP, env var is enough.
- ☑ **4.4** If VAPI returns an error (e.g. account at limit of 10 free numbers), return a clear error to the client and optionally prompt “Add your own number” (BYON) for a later phase.
- ☐ **4.5** (Later) When adding per-org numbers: ensure only the org that will use the number gets it attached (strict org isolation).

---

## Phase 5: Call initiation API

- ☑ **5.1** Create a dedicated **call initiation** API route used when the user clicks “Call now” or “Start calling”. For example: `POST /api/projects/[id]/call` with body `{ contactId: string }` for single contact, or `POST /api/projects/[id]/call` with body `{ contactIds: string[] }` for queue. Alternatively, extend the existing run route to optionally call VAPI instead of the simulation when VAPI is configured.
- ☑ **5.2** In the call-initiation handler:
  1. Resolve user → orgId (e.g. `getOrgFromRequest(req)` / `getUserOrganization(userId)`).
  2. Load project by `id` and `orgId` (e.g. `getProject(id, org.orgId)`). Return 404 if not found or wrong org.
  3. Load organization by `orgId`. Return 404 if not found.
  4. Validate contact belongs to project (contact.projectId === project.id) and load contact.
  5. **Ensure assistant:** If `!project.assistantId`, create VAPI assistant from project config and save `assistantId` to project.
  6. **Ensure phone number:** If `!org.phoneNumberId`, provision VAPI phone number for org and save `phoneNumberId` to org.
  7. (Optional) **Check usage limits:** If org has plan/limits, check `callsUsed < callsLimit` and `minutesUsed < minutesLimit`. If over, return 402/403 with message “Usage limit reached. Upgrade your plan.” Do not call VAPI.
  8. Call VAPI client `createOutboundCall({ assistantId: project.assistantId, phoneNumberId: org.phoneNumberId, customerNumber: contact.phone })`.
  9. Return the VAPI call ID (and optionally store it on the contact for webhook correlation).
- ☑ **5.3** Wire the UI “Call now” button to this API (single contactId). Wire “Start calling” to this API for each contact in the queue (or a batch endpoint if you add one).
- ☑ **5.4** (Best practice) Never trust client-provided orgId or projectId for authorization; always resolve org from the authenticated user and validate project/contact belong to that org.
- ☑ **5.5** Handle errors: VAPI failure, missing number, missing assistant — return appropriate status codes (502, 400, 403) and user-friendly messages.

---

## Phase 6: Webhook — call ended

- ☑ **6.1** Create a **public** webhook endpoint that VAPI can POST to when a call ends, e.g. `POST /api/webhooks/vapi/call-ended`. This URL must be reachable from the internet (deploy or use a tunnel for local testing).
- ☑ **6.2** In the VAPI dashboard, set the “Call ended” (or equivalent) webhook URL to your deployed base URL + `/api/webhooks/vapi/call-ended`.
- ☑ **6.3** In the webhook handler:
  1. (Best practice) Verify the request is from VAPI using webhook signing/secret if VAPI supports it. Reject requests with invalid signatures.
  2. Parse the payload (e.g. `callId`, `assistantId`, `transcript`, `status`, `customData`, `durationSeconds`).
  3. Resolve **project** by `assistantId` (query projects where `assistantId` equals the payload’s assistant id). Reject if not found.
  4. Validate project belongs to an org we manage (project has `orgId`). Do not trust any org/project id from the payload.
  5. Resolve **contact** by `callId` (if you stored callId on contact) or by matching this project + customer number from metadata if available. Update the contact’s status (`success` / `failed`), `callResult` (transcript, durationSeconds, attemptedAt, etc.).
  6. (Optional) Update org usage: increment `callsUsed` by 1 and `minutesUsed` by `durationSeconds / 60` for the project’s org. Use a transaction or atomic increment to avoid race conditions.
  7. Persist contact (and org usage) to Firestore.
- ☑ **6.4** (Best practice) Make the webhook handler **idempotent**: if VAPI retries the same event, use `callId` (or event id) to avoid double-updating the same contact/usage.
- ☑ **6.5** Return 200 quickly so VAPI does not retry unnecessarily. Do heavy work (e.g. Firestore writes) after validating the payload; if writes fail, log and still return 200 to avoid duplicate deliveries, and fix data manually or with a repair job if needed.

---

## Phase 7: Usage limits (optional for first “call now”)

- ☑ **7.1** Add or ensure org document has: `plan`, `callsLimit`, `minutesLimit`, `usagePeriodStart`, `callsUsed`, `minutesUsed` (see spec: Org-level usage limits).
- ☑ **7.2** Before placing a call (in the call-initiation API), load org and check `callsUsed < callsLimit` and `minutesUsed < minutesLimit`. If over limit, return 402 or 403 with a clear message; do not call VAPI.
- ☑ **7.3** On webhook (call-ended), increment the org’s `callsUsed` and `minutesUsed` (and optionally reset usage when a new billing period starts).
- ☑ **7.4** Wire dashboard “Calls used” (e.g. UsageWidget) to org’s `callsUsed` / `callsLimit` instead of a hardcoded value.

---

## Phase 8: End-to-end test

- ☐ **8.1** Create a test project with instructions and at least one contact with a **real phone number** you can answer.
- ☐ **8.2** Ensure the org has a provisioned phone number (or provision one via the flow).
- ☐ **8.3** Click **Call now** for that contact. Confirm:
  - The call initiation API returns success and (if applicable) a VAPI call ID.
  - Your phone rings and the VAPI assistant speaks (using the project’s script).
  - After the call ends, the webhook is called and the contact’s status/transcript (and optionally org usage) are updated.
- ☐ **8.4** Test **Start calling** with a queue of one or more contacts and confirm each is called and updated after completion.
- ☐ **8.5** (Best practice) Test with a second org: confirm org B cannot see or use org A’s projects, contacts, or phone number, and that usage is attributed to the correct org.

---

## Best practices summary

| Practice | Where |
|----------|--------|
| VAPI API key only in server env | `.env`, never in client bundle |
| Org resolved from authenticated user | Every call-initiation and webhook resolution |
| Project/contact validated against org | Call-initiation API |
| Webhook: resolve assistantId → project → org | Never trust client-provided org/project |
| Webhook signing (if supported) | `/api/webhooks/vapi/call-ended` |
| Idempotent webhook handling | Use callId/event id to avoid double-count |
| Clear errors to client | 400/402/403/502 with user-facing messages |
| No contact PII in assistant prompt | Only phone number for the call |

---

## Quick reference — VAPI endpoints (verify against current docs)

- **Create assistant:** `POST https://api.vapi.ai/assistant` (or `/v1/assistant` — check VAPI API reference).
- **Create phone number:** `POST https://api.vapi.ai/phone-number` (or equivalent).
- **Create outbound call:** `POST https://api.vapi.ai/call/phone` with `assistantId`, `phoneNumberId`, `customer: { number }`.
- **Webhook:** Configure in VAPI dashboard → your `https://<your-domain>/api/webhooks/vapi/call-ended`.

---

## Checklist summary (minimal path to “Call now” → real call)

1. **Phase 0:** VAPI account + API key in `.env`.
2. **Phase 1:** VAPI client (create assistant, create call).
3. **Phase 2:** Add `assistantId` to project, `phoneNumberId` (and related) to org in types and store.
4. **Phase 3:** Lazy create assistant when project has none; save `assistantId` to project.
5. **Phase 4:** **MVP:** One phone number (env or single provisioned); per-org numbers later.
6. **Phase 5:** Call initiation API (resolve org → project → contact, ensure assistant + phone, POST VAPI call), wire “Call now” and “Start calling” to it.
7. **Phase 6:** Webhook endpoint: resolve assistantId → project → contact, update contact status/callResult (and optionally org usage).
8. **Phase 8:** E2E test with real phone number.

Phase 7 (usage limits) can follow after the first real call works.
