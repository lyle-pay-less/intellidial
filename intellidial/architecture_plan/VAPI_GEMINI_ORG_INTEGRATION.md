# VAPI & Gemini Integration Architecture

## Overview

This document outlines how we connect **VAPI** (voice AI calls) and **Gemini** (AI content generation) to each organization in Intellidial. The design ensures:

- **Organization independence** — Each company’s data and agents are isolated
- **No data leaks** — Strict org-scoping on all APIs and storage
- **Minimal manual work** — Platform-level API keys; assistants created per project
- **Usage segregation** — Each org has its own call/minute quota and consumption; no cross-org usage

---

## Document status (review)

- **Last reviewed:** Focus on org-level calling, usage limits, and segregation.
- **Still valid:** End-to-end flow, Gemini (single key, org-validated), VAPI (assistant per project, phone per org), data isolation, webhook flow, implementation phases.
- **Updated:** New section **Org-level usage limits and segregation** (below). Organization data model extended with plan/limits/usage. Open questions expanded.

---

## End-to-End Flow

```
1. Instructions Tab (Gemini auto-fill)
   └── User selects industry → clicks "Generate tone/goal/questions"
   └── API validates org → Gemini generates → returns to UI
   └── User edits → saves project config (agentInstructions, captureFields, etc.)

2. Create Agent (VAPI assistant)
   └── When project is ready for calls: create/update VAPI assistant via API
   └── Map project config → VAPI assistant (system prompt, tools, voice)
   └── Store assistantId in project (Firestore)

3. Import Contacts
   └── Upload CSV / manual entry → contacts tied to project (projectId)
   └── Project is org-scoped → contacts implicitly org-scoped

4. Call Queue
   └── Order contacts for calling (queue per project)
   └── All queue data scoped by project → org

5. Calls (VAPI)
   └── Initiate call with project’s assistantId
   └── Before call: resolve org, check org usage < limits (calls/minutes). If over limit, reject (402/403).
   └── VAPI webhooks → update contact status/transcript; increment org callsUsed, minutesUsed
   └── Webhook handler validates call belongs to our project/org; never trust client orgId
```

---

## Phone Numbers (Per-Org Caller ID)

Each company needs its own phone number so calls show their business as the caller. This section covers how we provision and assign numbers per org.

### Requirements

- **One number per org** — Each org gets one primary outbound caller ID (phone number).
- **No cross-org use** — Org A cannot use Org B's number.
- **Minimal manual work** — Prefer automated provisioning where possible.

### VAPI Phone Number Model

- **Outbound call** requires: `assistantId`, `phoneNumberId`, `customer.number`.
- **Phone numbers** can be:
  1. **Free VAPI numbers** — US only, up to 10 per VAPI account, created via dashboard or `POST /phone-numbers`.
  2. **Imported from Twilio** — For international or higher limits; org provides Twilio credentials.

### Options for Per-Org Numbers

| Option | Approach | Manual work | Best for |
|--------|----------|-------------|----------|
| **A. Platform provisions (free US)** | We provision via `POST /phone-numbers` when org is ready for calls. Store `phoneNumberId` on org. | Low — fully automated | US-only orgs, MVP |
| **B. Bring Your Own Number (BYON)** | Org connects Twilio, imports number via VAPI `/phone-numbers/import`. We store `phoneNumberId` on org. | Medium — org needs Twilio | International, existing numbers |
| **C. Hybrid** | Default: platform provisions (A). Enterprise: org can BYON (B). | Low for default; medium for BYON | Production |

**Recommendation:** Start with **Option A** (platform provisions). Add **Option B** for international and enterprise.

### Data Model (Organization — phone + usage)

```
organizations/{orgId}
  name: string
  ownerId: string
  createdAt: string

  // Phone (per-org caller ID)
  phoneNumberId?: string      // VAPI phone number ID (caller ID for outbound)
  phoneNumberE164?: string    // Human-readable e.g. +1234567890
  phoneNumberStatus?: "none" | "pending" | "active" | "imported"

  // Plan and usage (org-level limits and segregation)
  plan?: "starter" | "growth" | "business"
  callsLimit: number          // From plan (e.g. 1000, 5000, 20000)
  minutesLimit: number        // From plan (e.g. 500, 2500, 10000)
  usagePeriodStart: string   // ISO date, first day of current billing period
  callsUsed: number           // Calls consumed this period
  minutesUsed: number         // Minutes consumed this period (from webhook durationSeconds)
```

### Provisioning Flow (Platform Provisioned)

```
1. Org is created (signup/setup)
2. When org first runs calls (or explicitly "Add phone number"):
   a. API: getUserOrganization(userId) → orgId
   b. If !org.phoneNumberId:
      i.   POST https://api.vapi.ai/phone-numbers
           { provider: "vapi", ... } for free US number
      ii.  Save phoneNumberId, phoneNumberE164 to org (Firestore)
   c. If VAPI account at limit (10 free numbers): return error, prompt BYON
3. Use org.phoneNumberId for all outbound calls from that org
```

### Provisioning Flow (Bring Your Own Number)

```
1. Org owner goes to Settings → Phone Number
2. Clicks "Connect Twilio" or "Import my number"
3. Enters Twilio Account SID, Auth Token, and Twilio phone number SID
4. API: POST https://api.vapi.ai/phone-numbers/import
   { twilioAccountSid, twilioAuthToken, twilioPhoneNumberSid }
5. VAPI returns phoneNumberId; save to org
6. Mark org.phoneNumberStatus = "imported"
```

**Security:** Never store Twilio credentials long-term. Use them once for import; VAPI holds the mapping.

### Call Initiation Flow (Updated)

```
1. User triggers call for contact
2. API: getProject(id, orgId), getOrganization(orgId), getProjectQueue(id)
3. Validate contact belongs to project
4. Validate org has phoneNumberId (return error if not)
5. POST VAPI /call {
     assistantId: project.assistantId,
     phoneNumberId: org.phoneNumberId,   // org's caller ID
     customer: { number: contact.phone }
   }
6. Store call ID in contact for webhook correlation
```

### Org Isolation

| Check | Purpose |
|-------|---------|
| `org.phoneNumberId` exists | Org has a number before calls |
| `phoneNumberId` stored on org | Number belongs to org only |
| Lookup by orgId | No cross-org number usage |
| BYON: validate org ownership | Only org owner can import numbers |

### Implementation Phases (Phone Numbers)

- [ ] Add `phoneNumberId`, `phoneNumberE164`, `phoneNumberStatus` to org type and Firestore
- [ ] Create `/api/org/phone-number` — GET (status), POST (provision or import)
- [ ] Settings page: "Phone Number" section — show status, provision or BYON flow
- [ ] Update call initiation API to require and use `org.phoneNumberId`
- [ ] Handle VAPI 10-number limit (error message, BYON prompt)
- [ ] (Later) BYON flow: Twilio import UI and API

### Open Questions (Phone Numbers)

1. **Region** — Free VAPI numbers are US only. For SA (e.g. +27), we need Twilio or similar. When do we add Twilio integration?
2. **Number pool vs per-org** — One number per org vs shared pool with assignment. One per org is simpler and matches "each company has their own number".
3. **Inbound** — If org wants to receive calls on the same number, VAPI supports `assistantId` on the phone number. Out of scope for MVP but document for later.

---

## Gemini Integration

### Role

- **Instructions Tab** — Auto-fill tone, goal, questions, capture field names, and script when user clicks generate buttons.
- **Current state** — Mock data by industry (see `api/projects/[id]/generate`).
- **Target state** — Real Gemini API calls for richer, context-aware content.

### Architecture

| Concern | Approach |
|--------|----------|
| **API key** | Single platform key: `GEMINI_API_KEY` in `.env`. Server-side only. |
| **Per-org** | No per-org Gemini key. Stateless; each request validates user/org before calling Gemini. |
| **Data isolation** | Request: `x-user-id` → `getUserOrganization` → `orgId`. Validate project with `getProject(id, orgId)`. Only include org-scoped context (industry, goal) in the prompt. Never send contact PII to Gemini for generation. |
| **Prompt safety** | Include only project metadata (industry, tone, goal) in prompts. Do not include contact names, phones, or call transcripts in generation requests. |

### API Flow

```
POST /api/projects/[id]/generate
  Headers: x-user-id
  1. getOrgFromRequest(req) → orgId
  2. getProject(id, orgId) → project (404 if wrong org)
  3. Build prompt from project.industry, project.goal, body.type
  4. Call Gemini API
  5. Return generated content
```

### Security Checklist

- [ ] Gemini API key in server env only
- [ ] All generate requests require `x-user-id` and validate org
- [ ] No contact PII in Gemini prompts
- [ ] Do not log full prompts/responses with PII

---

## VAPI Integration

### Role

- **Voice AI calls** — Place outbound calls using project-specific assistant config.
- **Per-project assistant** — Each project gets its own VAPI assistant (created when project is ready for calls).
- **Webhooks** — Call status, transcripts, and captured data sent back to our API.

### Architecture

| Concern | Approach |
|--------|----------|
| **API key** | Single platform key: `VAPI_API_KEY` (private) in `.env`. Server-side only. Public key for client widget only where needed. |
| **Assistants** | Create one VAPI assistant per project via `POST /v1/assistant`. Store `assistantId` in project document (Firestore). |
| **Per-org** | Assistants are scoped by project; projects are scoped by org. No per-org VAPI accounts. |
| **Creation trigger** | Lazy: when user runs calls (or explicitly “Create agent”), check `project.assistantId`. If missing, create assistant via VAPI API, save to project, then use. |

### Project → VAPI Assistant Mapping

| Project field | VAPI assistant field |
|---------------|----------------------|
| `agentInstructions` | `model.messages[0].content` (system prompt) |
| `goal` | Part of system prompt |
| `tone` | Part of system prompt |
| `agentQuestions` | Tools / function calling or structured in prompt |
| `captureFields` | Custom data schema for call end webhook |
| `industry` | Context for prompt |

### Create Assistant Flow

```
1. User clicks "Run" or "Create agent" for project
2. API: getProject(id, orgId) → project
3. If !project.assistantId:
   a. Build assistant config from project (prompt, tools, voice)
   b. POST https://api.vapi.ai/assistant { name, model, ... }
   c. Save assistantId to project (Firestore)
4. Use assistantId for calls
```

### Call Initiation Flow

```
1. User triggers call for contact
2. API: getProject(id, orgId), getOrganization(orgId), getProjectQueue(id)
3. Validate contact belongs to project
4. Validate org has phoneNumberId (required for outbound; see Phone Numbers section)
5. Check org usage: callsUsed < callsLimit && minutesUsed < minutesLimit (see Org-level usage limits).
   If over limit, return 402/403 and do not call VAPI.
6. POST VAPI /call with assistantId, phoneNumberId (org's caller ID), customer.number
7. Store call ID in contact for webhook correlation
```

### Webhook Flow (VAPI → Us)

```
1. VAPI sends POST to /api/webhooks/vapi/call-ended
2. Payload includes: callId, assistantId, transcript, customData
3. Look up project by assistantId (or callId → contact → project)
4. Validate project belongs to an org we manage
5. Update contact status, transcript, capturedData
6. Do not trust client-provided org/project; always resolve server-side
```

### Security Checklist

- [ ] VAPI private API key in server env only
- [ ] Create assistants only via server API (never from client)
- [ ] Store `assistantId` in project (org-scoped)
- [ ] Webhook handler validates assistantId → project → org
- [ ] Use webhook signing / secret to verify requests are from VAPI

---

## Data Model Additions

### Project (Firestore)

```
projects/{projectId}
  orgId: string
  assistantId?: string    // VAPI assistant ID (added when agent is created)
  // ... existing fields
```

### Organization (Firestore) — consolidated

See **Phone Numbers → Data Model** for full organization schema. Summary of fields relevant to calling and limits:

- **Identity:** name, ownerId, createdAt
- **Phone:** phoneNumberId, phoneNumberE164, phoneNumberStatus (per-org caller ID)
- **Plan & usage:** plan, callsLimit, minutesLimit, usagePeriodStart, callsUsed, minutesUsed (org-level segregation and limits)

### Invariants

- `assistantId` is optional; set when first creating the VAPI assistant.
- `assistantId` is unique per project; projects are unique per org.
- All lookups: `assistantId` → project → orgId.
- Usage is always keyed by orgId; limits and consumption are per-org only.

---

## Organization Isolation Summary

| Layer | Isolation mechanism |
|-------|---------------------|
| **API** | All routes require `x-user-id` → `getUserOrganization(userId)` → orgId |
| **Projects** | `listProjects(orgId)`, `getProject(id, orgId)` |
| **Contacts** | Tied to project; project access validated first |
| **Gemini** | orgId validated before request; no cross-org context in prompts |
| **VAPI** | assistantId stored in project; phoneNumberId stored on org; both org-scoped |
| **Webhooks** | assistantId → project → orgId; no client-provided org |
| **Usage** | All usage (calls, minutes) keyed by orgId; limits and consumption per org only |

---

## Org-level usage limits and segregation

This section addresses the **crunch** of the business: how calling works across different companies (orgs), how we enforce strict segregation, and how we limit each org to different calls/minutes based on their plan.

### Goals

1. **Segregation** — Org A must never consume Org B's quota. Usage is always attributed to the org that owns the project/contact.
2. **Plan-based limits** — Different orgs can have different plans (e.g. Starter 1,000 calls, Growth 5,000, Business 20,000). Limits are enforced before a call is placed.
3. **Enforcement point** — Before we POST to VAPI to start a call, we check that the org has not exceeded its quota for the current period. If over limit, we return an error (e.g. 402 Payment Required or 403 Forbidden) and do not place the call.
4. **Accounting** — After each call (webhook), we attribute usage (one call, N minutes) to that org only. No cross-org leakage.

### What to limit: calls vs minutes

- **VAPI billing** is typically per minute. Our product can expose both:
  - **Calls** — Simple for users ("1,000 calls/month"). One attempted call = one call.
  - **Minutes** — Important for cost and for plans that want to cap duration (e.g. "500 minutes/month").
- **Recommendation:** Store both. Plan defines e.g. `callsLimit` and `minutesLimit` per period. Usage: `callsUsed`, `minutesUsed`. We can derive minutes from webhook `durationSeconds`; we increment calls on attempt or on webhook (recommend: on webhook so we only count completed/attempted calls that reached VAPI).

### Where to store limits and usage

**Option A: On organization document**

- `organizations/{orgId}` extended with:
  - `plan?: "starter" | "growth" | "business"` (or planId if we have a plans table)
  - `callsLimit: number`, `minutesLimit: number` (copied from plan config or looked up)
  - `usagePeriodStart: string` (ISO date, e.g. first day of billing month)
  - `callsUsed: number`, `minutesUsed: number` (aggregate for current period)
- **Pros:** Single read to get org + limits + usage. Simple.
- **Cons:** Usage must be updated on every webhook (write to org doc). Risk of contention if many calls complete at once (can use transactional increment or a separate usage doc per org per period).

**Option B: Separate usage/subscription store**

- Org document: `plan`, `callsLimit`, `minutesLimit`, `usagePeriodStart` (no usage on org).
- Usage: e.g. `orgUsage/{orgId}` or `orgUsage/{orgId}_{period}` with `callsUsed`, `minutesUsed`, updated by webhook.
- **Pros:** Separates identity/plan from high-write usage; can batch or aggregate.
- **Cons:** Two reads (org + usage) before call initiation unless we cache.

**Option C: Derive usage from contact call results**

- Do not store `callsUsed`/`minutesUsed` on org. On demand, sum over all contacts under that org's projects where `callResult.attemptedAt` is in the current billing period (and optionally `durationSeconds` for minutes).
- **Pros:** Single source of truth (contact records); no double-writing.
- **Cons:** Heavier query (all projects for org, then all contacts with callResult in period). Need to define "current period" and index well. For enforcement before call we need this sum to be fast (e.g. cached or materialized).

**Recommendation for MVP:** Option A (limits and usage on org document). Keep a single source of truth; use Firestore transaction or atomic increment when updating usage in webhook to avoid races. If we hit contention, we can move usage to a separate doc (Option B) later.

### Enforcement flow

1. **Before placing a call (e.g. POST /api/projects/[id]/run or POST /api/calls/start):**
   - Resolve user → orgId (existing).
   - Load org (and thus `plan`, `callsLimit`, `minutesLimit`, `callsUsed`, `minutesUsed`, `usagePeriodStart`).
   - If current date is past `usagePeriodStart` + 1 month (or plan period), reset usage for new period (or call a separate "start new period" step).
   - If `callsUsed >= callsLimit` or `minutesUsed >= minutesLimit`: return 402/403 with message "Usage limit reached. Upgrade your plan." Do not call VAPI.
   - Validate project/contact/phoneNumberId as today (existing).
   - POST VAPI /call. Optionally increment `callsUsed` by 1 immediately (optimistic) or wait for webhook.

2. **On webhook (call-ended):**
   - Resolve assistantId → project → orgId (existing). Never trust client-provided orgId.
   - Update contact (status, transcript, capturedData) as today.
   - Load org usage for orgId; increment `callsUsed` by 1, `minutesUsed` by `durationSeconds/60` (or only if we didn't increment on initiation). Use transaction or atomic increment to avoid lost updates.
   - If we already incremented on initiation, we can skip incrementing calls again but still add minutes on webhook.

### Segregation guarantees

| Concern | How we guarantee it |
|--------|----------------------|
| Usage attributed to correct org | Every call is for a project; project has orgId. Webhook resolves assistantId → project → orgId. We only update that org's usage. |
| No cross-org consumption | We never add usage to an org other than the one that owns the project for the contact just called. |
| Limits are per-org | Limits (callsLimit, minutesLimit) are stored on org (or derived from org's plan). Enforcement uses only that org's usage and limits. |
| Dashboard "Calls used" | Already org-scoped: dashboard stats use orgId from user. We will show callsUsed/callsLimit (and optionally minutes) from org document or computed usage. |

### Billing period

- **Calendar month:** `usagePeriodStart` = first day of month; reset usage at start of next month. Simple for users ("1,000 calls per month").
- **Rolling 30 days:** Period start = signup or last reset; reset every 30 days. Requires storing last reset.
- **Recommendation:** Start with calendar month; align with SA payment gateway billing period if we use it. Store `usagePeriodStart` (e.g. "2026-01-01") and derive period end from plan.

### Implementation notes (no code yet)

- **Call initiation API:** Must accept org context (from user), load org, check usage < limits, then proceed with VAPI. Return 402/403 and a clear message when over limit.
- **Webhook handler:** After updating contact, load org by orgId (from project), then update org's `callsUsed` and `minutesUsed` in a transaction or with atomic increment. Ensure idempotency (same webhook delivered twice shouldn't double-count).
- **UsageWidget / dashboard:** Replace hardcoded limit with org's `callsLimit`; show `callsUsed` from org (or from dashboard stats that read org usage). Optionally show minutes used/limit.
- **Settings / plan:** When plan is changed (e.g. upgrade), update org's `plan`, `callsLimit`, `minutesLimit`. Do not reset `callsUsed`/`minutesUsed` mid-period unless business rule says so.

---

## Manual Work Minimization

| Task | Approach |
|------|----------|
| **Gemini** | One `GEMINI_API_KEY` in `.env`. No per-org setup. |
| **VAPI** | One `VAPI_API_KEY` in `.env`. Assistants created per project via API. |
| **New org** | No extra config. Org created at signup; projects/assistants created on demand. |
| **New project** | User fills Instructions tab → saves → assistant created when first run. |
| **Phone number** | Platform provisions (free US) when org first runs calls; or org BYON via Twilio. |

---

## Implementation Phases

### Phase 1: Gemini (Instructions tab)

- [ ] Add `GEMINI_API_KEY` to `.env`
- [ ] Create `src/lib/gemini/client.ts` (server-side only)
- [ ] Replace mock logic in `/api/projects/[id]/generate` with Gemini calls
- [ ] Ensure org validation before every Gemini request
- [ ] Document prompt templates and avoid PII in prompts

### Phase 2: VAPI assistant creation

- [ ] Add `VAPI_API_KEY` to `.env`
- [ ] Create `src/lib/vapi/client.ts` (create/update assistant)
- [ ] Add `assistantId` to project type and Firestore schema
- [ ] Implement lazy assistant creation on "Run" or "Create agent"
- [ ] Map project config → VAPI assistant payload

### Phase 3: VAPI calls & webhooks

- [ ] Implement call initiation API (project + contact validation)
- [ ] Set up webhook endpoint `/api/webhooks/vapi/call-ended`
- [ ] Webhook: validate assistantId, update contact
- [ ] Add webhook secret verification

### Phase 4: End-to-end

- [ ] Connect Instructions → assistant creation → contacts → queue → calls
- [ ] Test multi-org: Org A cannot see/use Org B’s assistants or contacts
- [ ] Load and security testing

---

## Open Questions

1. **VAPI pricing** — Per-minute or per-assistant? Affects how many assistants we create.
2. **Assistant reuse** — One assistant per project vs. per campaign/run (if we add campaigns later).
3. **Gemini rate limits** — Do we need per-org quotas or caching?
4. **Webhook idempotency** — Handle duplicate webhook deliveries safely (so we don't double-count calls/minutes).
5. **Phone numbers** — See "Open Questions (Phone Numbers)" in the Phone Numbers section.
6. **Usage: increment on initiation vs. webhook** — If we increment `callsUsed` when we POST VAPI /call, we count attempts; if we only increment on webhook, we count completed/attempted calls that reached VAPI. Latter avoids charging for failed initiations; former gives immediate feedback. Decide and document.
7. **Period reset** — Who resets `callsUsed`/`minutesUsed` at start of new billing period? Cron job, or on first request in new period when we detect `usagePeriodStart` is in the past?
8. **Payment gateway alignment** — When we add billing, align usage period with SA payment gateway subscription period (e.g. PayFast/PayGate) so limits and billing match.
